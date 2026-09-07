# DeepSeek Harness Base UI

为 DeepSeek Harness Web 提供 **Cordis 看护** 设置页。它持续观察当前 Loader 插件树，突出启动失败、长时间等待和已启用但没有运行实例的条目，并提供用户触发的重试、禁用、启用和批量修复操作。

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

看护插件自身以及承载它的父级条目受到保护，不能通过该页面禁用。操作通过 DSH 已认证的 Connection RPC 执行，不向模型注册修改 Cordis 树的工具。

这个插件负责 DSH 已经进入运行状态后的看护。若某个条目在看护插件启动前导致冷启动退出，需要先通过 profile patch 禁用故障条目；同一进程中的设置页无法在宿主退出后继续提供修复入口。

## 开发

```bash
pnpm install
pnpm test
pnpm build
```
