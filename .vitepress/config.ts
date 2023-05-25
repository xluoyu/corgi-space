import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Corgi-Space 文档站",
  description: "开发过程笔记",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '主页', link: '/' },
      { text: '前端', link: '/client/index.md' },
      { text: '后端', link: '/service/index.md' },
    ],

    sidebar: {
      '/client/': [
        { text: "起步", link: "/client/index.md" }
      ],
      '/service/': [
        { text:"起步", link: "/service/index.md" },
        { text:"01.构建Nest", link: "/service/01.nest.md" },
      ]
    },
    // [
    //   {
    //     text: 'Examples',
    //     items: [
    //       { text: 'Markdown Examples', link: '/markdown-examples' },
    //       { text: 'Runtime API Examples', link: '/api-examples' }
    //     ]
    //   }
    // ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
