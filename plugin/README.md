# 雏儿娘 · chuer-niang

一个 DSH Web 桌宠插件：照片形象、好感度、钱包、段位、白袜、LLM 自言自语，以及基于本地文档的用户画像记忆。

## 安装

```bash
dsh plugin --profile web add chuer-niang
```

或从 GitHub 安装（把 `<user>/<repo>` 换成实际仓库）：

```bash
dsh plugin --profile web add github:<user>/<repo>#path:/plugin
```

装好后刷新 DSH，插件会出现在 `shell.overlay`。

## 私有数据

发布包里**不包含**真实用户照片、`master.json`、`affinity.json`、`scan-index.json`、`state.json` 或本地路径。运行时数据都在 `%DSH_HOME%\photo-pet\`。

- 私人形象：放 `%DSH_HOME%\photo-pet\pet.webp`（可选 `pet-socks.webp`），Host 的 `/photo-pet/image` 会优先读取；
- 没有私人形象时显示包内公开占位图；
- 文档扫描器默认只把 summary 写进本机 `master.json`，不会随包上传。

## 人设

`persona.enc` 是加密的雏儿娘人设，随包发布；`persona.example.txt` 是公开示例。想改人设可覆盖 `%DSH_HOME%\photo-pet\persona.txt`。

## 许可

MIT。
