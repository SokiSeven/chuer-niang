# 桌面悬浮版（Windows / WPF）

让雏儿娘不只待在 DSH 里：一个**透明、无边框、置顶**的小窗口，飘在桌面和其他应用上方。

## 启动

双击 **`start-pet.vbs`**（无控制台窗口）。想开机自启，就把它的快捷方式放进：

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
```

调试用 `start-pet-debug.cmd`，出错时能看到报错。

**DSH 需要开着**：桌面版通过 `http://127.0.0.1:64480` 的本地接口复用 DSH 的 LLM 自言自语、人设、操作感知、钱包和好感度。DSH 没开时退回本地台词/本地好感度。

## 操作

| 操作 | 效果 |
|---|---|
| 拖动 | 移动窗口，位置记在 `%APPDATA%\photo-pet\desktop.json` |
| 点头部 | 调 DSH `/interact`，按 20/50/30 概率给台词与好感 |
| 点脚部 | 调 DSH `/interact`，按 10/50/40 概率给台词与好感 |
| 点身体 | 戳一下，台词 + 好感 -1 |
| 右键 → 钱包 | 调 DSH `/wallet`，气泡显示余额 / 家底 / 本会话 / 今日饭量 / 投喂次数 / 好感度 |
| 右键 → 归位 | 回到右下角 |
| 右键 → 退出 | 关闭悬浮窗 |

## 自言自语

- 启动后约 3 秒来一句，之后每 20 秒一次；
- 请求走 DSH `/photo-pet/generate`，用人设 + 最近操作生成，气泡显示 5 秒；
- DSH 没开或请求失败时用本地土味台词兜底。

## 说明

- 纯 Windows PowerShell + WPF，无需安装 Electron/Node；
- 透明背景，窗口始终 `Topmost`，任务栏和 Alt+Tab 里不显示；
- 窗口矩形范围（约 380×470）会挡住下面应用的点击；目前没有做逐像素点击穿透；
- DSH 开着时好感度就是 `%DSH_HOME%\photo-pet\affinity.json` 那份；好感 100 时桌面版会自动换成白袜图；DSH 没开时用 `%APPDATA%\photo-pet\desktop.json` 里的本地值；
- 形象图用的是 `desktop/assets/pet.png`（白袜版 `pet-socks.png`），换图直接替换这两个文件再重启即可；
- 换 DSH 端口：给脚本传 `-DshUrl http://127.0.0.1:你的端口`（需要自己改启动命令）。

## 文件

```
desktop/
  PetOverlay.ps1        # 主程序（UTF-8 with BOM，别用无 BOM 保存）
  start-pet.vbs         # 隐藏控制台启动
  start-pet-debug.cmd   # 带控制台启动，排错用
```
