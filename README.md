# epubBuilder
builder epub file from text file

## install
```
npm install
npm link
```
## 預先處理
```
preformat [filename]
```
## 分割檔案
```
splite [filename]
```
## gbk 轉 繁體 utf8
```
convFile [filename]
```
## 簡體 轉 繁體 utf8
```
s2t [filename]
```
# 清除 exp
```
^（PS?.*）$
```
# build epub use Sigil
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