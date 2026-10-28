# 发给别的 DeepSeek / DSH Agent 的安装 Prompt

把下面整段复制给对方的 DSH Agent（需要能执行命令）。

---

你运行在 DeepSeek Harness（DSH）里。请帮我安装并启用「雏儿娘」桌宠插件，包名 `chuer-niang`。

要求：

1. 先检查当前环境的 DSH 插件命令和 profile：
   - 运行 `dsh plugin --help`；
   - 确认用 `--profile web` 还是当前默认 profile。
2. 从 GitHub 安装（推荐）：
   ```bash
   git clone https://github.com/SokiSeven/chuer-niang.git
   dsh plugin --profile web add chuer-niang/plugin
   ```
   如果 HTTPS 不通，用 SSH：
   ```bash
   git clone git@github.com:SokiSeven/chuer-niang.git
   dsh plugin --profile web add chuer-niang/plugin
   ```
3. 如果 npm 包已经发布，也可以：
   ```bash
   dsh plugin --profile web add chuer-niang
   ```
4. 安装后：
   - 刷新 DSH 页面（Ctrl+R / Cmd+R）；必要时重启 DSH；
   - 确认设置 → 插件里「雏儿娘」已启用；
   - 确认页面右下角出现桌宠；
   - 用 `curl http://127.0.0.1:64480/photo-pet/image?kind=pet -o /tmp/pet.webp` 检查图片路由返回的是 WebP。
5. 隐私要求：
   - 只安装公开插件代码；
   - 不要上传、发送或提交 `%DSH_HOME%/photo-pet/master.json`、`scan-index.json`、`scan-config.json`、`affinity.json`、`state.json`、`persona.txt` 或任何真实照片；
   - 包内默认形象已授权公开；用户本机 `%DSH_HOME%/photo-pet` 里如果有私人照片，会优先覆盖显示。
6. 最后告诉我：实际执行的命令、安装的 profile、插件是否启用、页面是否出现桌宠；如果失败，贴出报错。

---

如果对方用的不是 DSH、只是普通 DeepSeek 聊天（没有命令执行能力），它无法自己安装；需要把 `chuer-niang-1.0.0.tgz` 给对方，让对方在有 DSH 的机器上执行：

```bash
dsh plugin --profile web add file:<绝对路径>/chuer-niang-1.0.1.tgz
```
