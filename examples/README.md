# 章節規則範例說明

`chapter-rules.sample.json`（與 `src/lib/default-chapter-rules.json`）格式：

```json
{
  "maxHeadingLength": 48,
  "rejectProsePunctuation": true,
  "jianjieMode": "volume",
  "titleStyle": "short",
  "volume": [ "^第…篇", "^第…卷", ... ],
  "chapter": [ "^引子", "第…章", ... ]
}
```

| 欄位 | 說明 |
|------|------|
| `maxHeadingLength` | 超過此字數的行不當標題（避免長句誤切） |
| `rejectProsePunctuation` | 含 `。！？「」` 等標點則當正文 |
| `jianjieMode` | `volume` / `chapter` / `body`（可用 CLI `--jianjie-as` 覆寫） |
| `titleStyle` | `short` / `full` / `arc`（可用 `--title-style` 覆寫） |
| `volume` / `chapter` | JavaScript 正則字串陣列 |

## 常見標題型

| 原文 | 預設行為 |
|------|----------|
| `引子 開篇` | chapter |
| `第一篇 再見篇 《再見篇》簡介` | volume → 目錄 `再見篇·簡介` |
| `第一篇 再見篇 再見篇第二十一章` | chapter → 目錄 `第二十一章` |
| `第五篇 厚積篇 厚積篇第六篇` | chapter（雙 第N篇）→ `第六篇` |

自訂規則：

```bash
epubbuild novel.txt -r examples/chapter-rules.sample.json -o out.epub
```
