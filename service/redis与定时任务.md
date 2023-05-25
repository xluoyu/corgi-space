# Redis与定时任务

## 安装Redis

* 使用`docker`安装 (推荐)

```shell
docker pull redis
```

* 手动安装

由于windows上没有`Redis`的官方支持版，如果想要安装，可以方案社区版本

[https://github.com/microsoftarchive/redis/releases](https://github.com/microsoftarchive/redis/releases)

## 链接Redis

由于`Nest`官方推荐的库 `asd` 不支持新版 `Redis`，这里推荐使用 [ioredis](https://github.com/luin/ioredis)

由于会有多个项目访问`Redis`的情况，所以在`libs/shared/src`下创建`cache`，用于链接`Redis`

> libs/shared/src/cache/index.ts

```ts
import Redis from "ioredis"

/**
 * 用于创建redis
 * @param db 储存库
 */
const createRedis = (db: number) =>
	new Redis({
		port: Number(process.env.REDIS_POST), // Redis port
		host: process.env.REDIS_HOST, // Redis host
		password: process.env.REDIS_PASSWORD,
		db // Defaults to 0
	})

export const redis = createRedis(0)
```

将链接`Redis`的参数都写入环境变量，方便后续管理，导出链接好的`redis`在项目中操作。


## 定时任务

定时任务也是常规项目中必不可少的的一环，官方文档也有详细的说明，这里不再赘述。

[Nestjs-定时任务](https://docs.nestjs.cn/9/techniques?id=%e5%ae%9a%e6%97%b6%e4%bb%bb%e5%8a%a1)

直接上代码。

> apps/admin/src/schedule/task.module.ts

```ts
import { Module } from "@nestjs/common"
import { TaskService } from "./task.service"
@Module({
	providers: [TaskService]
})
export class TaskModule {}
```

建立一个`TaskModule`模块用于管理定时任务。

目标需求是：在每天早上八点获取必应的每日一图，保存到`Redis`中

必应API：[https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN](https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN)

> apps/admin/src/schedule/task.service.ts

```ts
import { Injectable } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { redis } from "@app/shared"
import axios from "axios"

@Injectable()
export class TaskService {
  /**
   * 用于获取必应的每日一图
   */
	@Cron(CronExpression.EVERY_DAY_AT_8AM, { name: "必应图片" })
	async saveBingPhoto() {
		const Head = "https://cn.bing.com"
		const url = await axios
			.get(
				"https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN"
			)
			.then(res => Head + res.data.images[0].url)

		await redis.set("bing", url)
		return url
	}
}
```

至此，定时任务完成，之后只需要创建一个接口用来返回图片地址即可。

这里创建了一个`CommonModule`模块，用于处理一些普通的操作。

> apps/admin/src/common/common.controller.ts

```ts
@Controller()
export class CommonController {
	constructor(private readonly commonService: CommonService) {}

	@Get("getBingPhoto")
	getBingPhoto() {
		return this.commonService.getBingPhoto()
	}
}
```

在`service`中，先判断`redis`中是否有`bing`字段，没有的话就手动调用定时任务中的`service`

> apps/admin/src/common/common.service.ts

```ts
import { Injectable } from "@nestjs/common"
import { redis } from "@app/shared"
import { TaskService } from "../schedule/task.service"

@Injectable()
export class CommonService {
	constructor(private taskService: TaskService) {}
	async getBingPhoto() {
		let path = await redis.get("bing")
		if (!path) {
			path = await this.taskService.saveBingPhoto()
		}
		return path
	}
}
```

记得在`module`中引入！记得在`module`中引入！记得在`module`中引入！


最后就可以在前端访问 `/api/getBingPhoto` 获取图片地址了。