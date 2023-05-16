# token与权限

## 实现登录功能

首先，创建一个模块`system`用于记录一些系统功能的操作。
创建一个用于保存人员的实体类，大致长这个样子，它包含了人员的基本信息。

```ts
// src/system/entities/system.entity.ts
import { Column, Entity, PrimaryColumn } from "typeorm"
import { BaseEntity } from "@app/shared"

@Entity("system_member")
export class SystemMemberEntity extends BaseEntity {
	@PrimaryColumn({
		type: "varchar",
		length: 64,
		comment: "邮箱 === 账号"
	})
	email: string

	@Column({
		type: "varchar",
		length: 64,
		comment: "密码"
	})
	password: string

	@Column({
		type: "varchar",
		length: 255,
		comment: "用户名",
		default: "未知用户"
	})
	name: string

	@Column({
		type: "varchar",
		length: 255,
		comment: "头像",
		default: "https://tc.mwm.moe/i/1/2023/04/07/642f3b0900a4f.jpg"
	})
	photo: string

	@Column({
		comment: "角色, 默认：管理员",
		default: 2
	})
	roleId: number

	@Column({
		default: 1,
		comment: "软删除 1 => 正常； 2 => 已禁用"
	})
	status: number
}
```

先来定义一下功能需求，在前端输入邮箱、密码就可以登录，如果检测到数据库内没有当前的邮箱时，就自动注册并登录，所以还需要一个自动注册的开关。

综上，`login`的接口参数列出如下。

```ts
// src/system/dto/member.dto.ts
import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty } from "class-validator"

/**
 * 登录成员账号
 */
export class MemberDto {
	@ApiProperty({ description: "邮箱" })
	@IsNotEmpty({ message: "请输入邮箱" })
	email: string

	@ApiProperty({ description: "密码" })
	@IsNotEmpty({ message: "请输入密码" })
	password: string

	@ApiProperty({ description: "登录时是否直接注册" })
	withRegister: boolean
}
```

之后就可以在`controller`中创建接口，这里创建了`login`接口并引入参数类型`dto`。

```ts
// src/system/system.controller.ts
import { Controller, Post, Body } from "@nestjs/common"
import { SystemService } from "./system.service"
import { MemberDto } from "./dto/member.dto"
import { isEmail } from "class-validator"
import { CustomException } from "@app/shared"

@Controller("system")
export class SystemController {
	constructor(private readonly systemService: SystemService) {}

	@Post("/login")
	login(@Body() memberDto: MemberDto) {
		if (!isEmail(memberDto.email)) {
			throw new CustomException("邮箱格式有误")
		}

		return this.systemService.login(memberDto)
	}
}

```

这里在接口内做了邮箱的校验，当然也可以放在`dto`内通过`class-validator`的装饰器`@IsEmail`实现，不过它的错误描述是纯英文，所以只好自己做了一层校验。

下面是登录用的`service`, 这里先是通过实体类按照传入的`email`查询，根据查处的内容做不同的处理。如果没找到用户，但是传的了`withRegister`为`true`，那么就需要通过`create`去创建一个新用户并`save`到库中。

```ts
// src/system/system.service.ts
import { Injectable } from "@nestjs/common"
import { SystemMemberEntity } from "./entities/system.entity"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { MemberDto } from "./dto/member.dto"
import { CustomException, pick } from "@app/shared"
import axios from "axios"

@Injectable()
export class SystemService {
	constructor(
		@InjectRepository(SystemMemberEntity)
		private readonly systemMemberEntity: Repository<SystemMemberEntity>,

		private readonly authService: AuthService
	) {}
	async login(member: MemberDto) {
		const queryUser = await this.systemMemberEntity.findOne({
			where: {
				email: member.email
			}
		})

		let result: SystemMemberEntity

		/**
		 * 检测到匹配账号
		 *
		 * 密码可以做一层加密再存到数据库，这里就省略了....
		 */
		if (queryUser) {
			if (queryUser.password === member.password) {
				result = queryUser
			} else {
				throw new CustomException("密码错误")
			}
		} else if (member.withRegister) {
			const _newMember = await this.systemMemberEntity.create({
				...member,
				photo: await this.getRandomPhoto()
			})

			result = await this.systemMemberEntity.save(_newMember)
		} else {
			throw new CustomException("未检测到匹配账号")
		}


		return {
			memberId: result.id,
			...pick(result, ["name", "email", "photo", "roleId", "status"])
		}
	}

	/**
	 * 获取随机头像
   * 
   * 在网上找的api，无法保证可用性
	 */
	async getRandomPhoto() {
		const res = await axios.get(
			"https://api.vvhan.com/api/avatar?type=json&class=dm"
		)

		if (res.data.success) {
			return res.data.avatar
		} else {
			return null
		}
	}
}

```


## token

