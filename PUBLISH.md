# 发布检查清单

插件包名：`chuer-niang`，版本：`1.1.0`。

## 1. 打 tarball

```bash
cd pet/plugin
npm pack --pack-destination ../releases
```

产物：`pet/releases/chuer-niang-1.1.0.tgz`。

发布前检查 `npm pack --dry-run --json` 的文件列表，包里只应有：

- `index.js` / `client.js` / `scanner.mjs` / `memory.mjs` / `persona-crypto.mjs`
- `cordis.patch.yml` / `package.json` / `README.md`
- `persona.enc` / `persona.example.txt`
- `locale/*.json` / `icon.png`
- `assets/pet.webp` / `assets/pet-socks.webp`（已授权公开的默认形象）
- `../assets/**`（原始素材目录，随 GitHub 仓库公开，不进 npm 包）

**不要**把这些放进发布包/仓库：

- 用户画像：`%DSH_HOME%\photo-pet\master.json`、`scan-index.json`、`scan-config.json`
- 运行时状态：`%DSH_HOME%\photo-pet\affinity.json`、`state.json`
- 本地预览/调试中间图：`pet/src/**`

仓库根 `.gitignore` 已经忽略 `/assets/`、`/src/` 和明文人设；`plugin/files` 白名单进一步保证 npm 包不包含私有数据。

## 2. 发到 npm

```bash
cd pet/plugin
npm login
npm publish --access public
```

之后用户安装：

```bash
dsh plugin --profile web add chuer-niang
```

## 3. 发到 GitHub

仓库地址：`https://github.com/SokiSeven/chuer-niang`（SSH：`git@github.com:SokiSeven/chuer-niang.git`）。

把仓库推上去后，用户安装：

```bash
git clone https://github.com/SokiSeven/chuer-niang.git
dsh plugin --profile web add chuer-niang/plugin
```

HTTPS 不通时用 SSH 克隆。

## 4. 上 DSH 插件市场/索引

可以在这些地方提交收录/PR：

- `dsh-plugin.org`
- `dshbase`
- `awesome-dsh-plugin`

## 5. 本地分享 tarball

对方拿到 `chuer-niang-1.1.0.tgz` 后：

```bash
dsh plugin --profile web add file:<绝对路径>/chuer-niang-1.1.0.tgz
```

## 6. 发布后验证

```bash
curl http://127.0.0.1:64480/photo-pet/image?kind=pet -o /tmp/pet.webp
dsh plugin --profile web list
```

刷新 DSH，确认 `shell.overlay` 出现桌宠；默认会显示包内已授权公开的形象，本机有私人照片时优先显示私人照片。
