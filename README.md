# epubBuilder
從純文字檔建立 EPUB（也可沿用舊的 Sigil 手工流程工具）。

## Requirements
- Node.js **>= 18**

## install
```
npm install
npm link
```

路徑可用相對或絕對路徑；輔助指令的輸出檔會寫在**輸入檔同一目錄**（`splite` 的 xhtml 則固定寫到 cwd 下的 `spliteFile/`，檔名只用 basename）。

簡繁轉換使用 **opencc-js**（`s2t` / `convFile` / `epubbuild --s2t`）。

---

## 一鍵組 EPUB（建議）

```
epubbuild novel.txt -o novel.epub --title "書名" --author "作者"
```

常用選項：

| 選項 | 說明 |
|------|------|
| `-o, --output` | 輸出 `.epub`（預設：與輸入同目錄、同檔名） |
| `-t, --title` | 書名（預設：輸入檔名） |
| `-a, --author` | 作者 |
| `-l, --lang` | 語言 tag（預設 `zh-TW`） |
| `-c, --cover` | 封面圖（jpg/png/gif/webp） |
| `-r, --rules` | 章節規則 JSON（`volume` / `chapter` 正則陣列） |
| `--s2t` | 組書前簡轉繁 |
| `--no-preformat` | 略過空白行清理與標題空白整理 |
| `--dump-chapters` | 另外輸出章節 JSON（除錯用） |

範例規則：`examples/chapter-rules.sample.json`  
內建預設規則：`src/lib/default-chapter-rules.json`

產生的是 **EPUB 3**（`nav` 目錄 + OPF），可用 Calibre / Apple Books / 多數閱讀器開啟。不再依賴系統 `zip` 指令。

```
npm test
```
會跑一輪 smoke（組 EPUB 並檢查 zip 內 `mimetype` 為首個 stored entry）。

---

## 預先處理
```
preformat [filename]
```
產生 `<stem>_formated.txt`（與輸入檔同目錄）。

## 分割檔案
```
splite [filename]
```
清空並寫入 `./spliteFile/<stem>_N.xhtml`（自動建立目錄；給 Sigil 手工組書用）。

## gbk 轉 繁體 utf8
```
convFile [filename]
```
偵測為 GBK / GB2312 / GB18030 時解碼並轉繁體，輸出 `<stem>_CHT.txt`。

## 簡體 轉 繁體 utf8
```
s2t [filename]
```
輸出 `<stem>_S2T.txt`。

## 打包 spliteFile（可選、舊流程）
```
zipFile
```
需要系統有 Info-Zip 的 `zip` 命令。Windows 若沒有 `zip`，請手動壓縮 `spliteFile`，或改用上面的 `epubbuild`。

# 清除 exp
```
^（PS?.*）$
```

# 舊流程：build epub use Sigil
## Add files

開新專案 -> file -> Add -> Existing files -> [open spliteFile folder select all file]

## 建立目錄
Tools->Table of contents-> Generate table of contents
## 新增封面
Tools->Add cover-> other files -> select cover image

## 存為 epub
File -> save

# build mobi file use Calibre
* drag epub to Calibre
* 編輯 書名,作者,銓敘資料,簡介
* 語言請保持為英文,否則字型將會顯示為細明體
* 右鍵轉換書籍->個別轉換
* mobi輸出 -> kindle選項 -> mobi檔案類型-> both

# send mobi to kindle
* use sent to kindle app
