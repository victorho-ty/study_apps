# 字詞圖畫課

```powershell
uv run python -m chinese_sem2.phrases_10.server
```

開啟 <http://127.0.0.1:9002>。學習頁有 19 個字詞、插圖、例句及粵語朗讀。
「只讀字詞」只播放字詞發音。「朗讀例句」先讀字詞，稍停後再讀例句。
小測驗每個字詞一題，題目順序隨機排列。

附有錄音及逐詞時間資料，可離線播放。修改例句後，可連線重新製作錄音。

```powershell
uv run python -m chinese_sem2.phrases_10.server --prepare-audio
```
