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

### 單檔
```
epubbuild novel.txt -o novel.epub --title "書名" --author "作者"
epubbuild examples/demo-novel.txt -o demo.epub --front-toc
```

### 批次／目錄
```
epubbuild novels/ --out-dir out-epubs/
epubbuild a.txt b.txt --out-dir out-epubs/
```
- 目錄會遞迴收集 `.txt` / `.md`
- 每本書輸出 `<stem>.epub`；批次請用 `--out-dir`（不要用 `-o`）

### 大檔串流
```
epubbuild big.txt --stream -o big.epub
```
- 預設：**≥ 2MB** 自動走 line-stream（不整檔再複製一份字串）
- `--stream` 強制串流；`--no-stream` 強制整檔讀取
- `--stream-threshold <bytes>` 調整自動門檻

常用選項：

| 選項 | 說明 |
|------|------|
| `-o, --output` | 輸出 `.epub`（預設：與輸入同目錄、同檔名） |
| `-t, --title` | 書名（預設：輸入檔名） |
| `-a, --author` | 作者 |
| `-l, --lang` | 語言 tag（寫入 OPF **與** xhtml，預設 `zh-TW`） |
| `-c, --cover` | 封面圖（jpg/png/gif/webp；置中／接近 full-bleed CSS） |
| `-r, --rules` | 章節規則 JSON（`volume` / `chapter` 正則陣列） |
| `--s2t` | 組書前簡轉繁 |
| `--no-preformat` | 略過空白行清理與標題空白整理 |
| `--dump-chapters` | 另外輸出章節 JSON（除錯用） |
| `-v, --verbose` | 更密的進度輸出 |
| `-q, --quiet` | 只輸出最終 epub 路徑（與錯誤） |
| `--max-heading-length <n>` | 超過此長度的行不當標題（預設 48） |
| `--jianjie-as <mode>` | `簡介` 行：`volume`（預設）/ `chapter` / `body` |
| `--title-style <style>` | 目錄標題：`short`（預設）/ `full` / `arc`（如 `再見·第二十一章`） |
| `--css <file>` | 自訂 CSS（取代預設樣式） |
| `--front-toc` | 封面後插入可翻頁的目錄頁 |
| `--spine-toc` | spine 納入 machine nav（`linear="no"`） |
| `--no-validate` | 跳過組完後的 EPUB 結構自檢 |
| `--stream` / `--no-stream` | 強制／關閉 line-stream 切章 |
| `--stream-threshold <bytes>` | 自動串流門檻（預設 2097152） |
| `--out-dir <dir>` | 批次輸出目錄 |

組完預設會做 **結構自檢**（mimetype 首位 stored、OPF/nav 引用、spine idref）。

大檔會在 **stderr** 顯示階段進度；串流模式以行為單位讀取，降低尖峰記憶體。打包時逐章寫 zip 並釋放章節正文。

範例：
- 小說：`examples/demo-novel.txt`
- 規則：`examples/chapter-rules.sample.json` + 說明 `examples/README.md`
- 內建預設：`src/lib/default-chapter-rules.json`

**目錄標題會自動縮短**（`rawTitle` 仍保留原文）：  
- `第一篇 再見篇 再見篇第二十一章 紈褲` → `第二十一章 紈褲`  
- `第一篇 再見篇 《再見篇》簡介` → `再見篇·簡介`  
- 兩個 `第N篇`（誤用篇當章號）→ 當章節，標題取最後一個 `第N篇`

產生的是 **EPUB 3**（`nav` 目錄 + OPF），可用 Calibre / Apple Books / 多數閱讀器開啟。不再依賴系統 `zip` 指令。

```
npm test
```
會跑：章節 fixture → C/D/E 功能 → **F/G/H（串流／批次／demo）** → epub smoke → legacy CLI pipeline。

```
npm run test:fixtures   # 只跑章節/標題 golden
npm run lint
npm run audit:check
```

CI：`.github/workflows/ci.yml`（Node 18/20/22：lint + test + audit）。

---

## 預先處理
```
preformat [filename]
preformat [filename] -r my-rules.json
```
產生 `<stem>_formated.txt`（與輸入檔同目錄）。  
**與 `epubbuild` 共用** `src/lib/text-pipeline` + 預設章節規則。

## 分割檔案
```
splite [filename]
splite [filename] -r my-rules.json
```
清空並寫入 `./spliteFile/<stem>_N.xhtml`（自動建立目錄；給 Sigil 手工組書用）。  
章節切分與標題清洗邏輯同 `epubbuild`。

## Markdown 大綱
```
mdconver [filename]
```
輸出 `<stem>_MD.txt`（`#` / `##` 標題），規則同上。

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
