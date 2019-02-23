# jsmm

从 [jspm](https://dev.jspm.io/) 下载模块到 `./js_modules/`，
以便在项目中直接使用 es6 模块，而不需要在进行编译。
下载到本地的好处：

- 不依赖第三方服务
- 使用 h2 的 Server Push

## 使用：

```bash
$ # jsmm install <pkg>
$ jsmm install lit-html
$ jsmm install lit-html@1.0.0
```

支持 npm 和 github 上的包，详情请查看 [jspm 文档](https://jspm.io/#urls)
