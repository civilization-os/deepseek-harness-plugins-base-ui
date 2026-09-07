# DeepSeek Harness Base UI

为 DeepSeek Harness Web 提供 **Cordis 看护** 设置页。它持续观察当前 Loader 插件树和 profile 依赖图，突出启动失败、长时间等待、`missing peer`、peer 版本冲突、共享运行时多实例、失效本地链接和 bundle 配置问题。

## 安装

```bash
dsh plugin --profile web add @civilization/deepseek-harness-base-ui
```

安装或更新后重启 Web profile。设置页侧栏会出现 **Cordis 看护**。

## 修复规则

- **重试**：重新激活失败或未运行的插件，不修改插件配置。
- **禁用**：通过 Loader 持久化禁用异常条目。
- **启用**：重新启用已经禁用的条目；启动失败时保留原状态并显示失败结果。
- **修复全部**：只重试当前异常条目，不会自动禁用插件。
- **依赖健康**：检查 profile dependencies、bundle 层、peer 解析结果和 `autoInstallPeers` 设置。
- **依赖修复**：可以安装普通缺失 peer、激活已安装 bundle、移除失效 bundle，并将 `autoInstallPeers` 恢复为 `false`。

Cordis 与 `@deepseek-ai/dsh-*` 属于共享宿主 peer。看护页会检查其版本和多实例问题，但不会通过网络强行安装或覆盖；这类问题需要兼容的 DSH 版本或 module fallback 修复。保持 `autoInstallPeers: false` 可以防止 pnpm 为插件隐式安装第二份共享运行时。

看护插件自身以及承载它的父级条目受到保护，不能通过该页面禁用。操作通过 DSH 已认证的 Connection RPC 执行，不向模型注册修改 Cordis 树的工具。

这个插件负责 DSH 已经进入运行状态后的看护。若某个条目在看护插件启动前导致冷启动退出，需要先通过 profile patch 禁用故障条目；同一进程中的设置页无法在宿主退出后继续提供修复入口。

## 开发

```bash
pnpm install
pnpm test
pnpm build
```
