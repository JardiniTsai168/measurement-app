# MEMORY.md - measurement_app

## 專案
- 專案名稱：measurement_app
- 主題：釣魚照片 / AR 即時量測魚長度 app

## Discord 回覆規則
- OpenClaw Agent 不回覆 Thread 訊息
- OpenClaw Agent 不回覆有標注 lihi-designer, lihi-coder, 東東的訊息

## Hermes Agents
當貝克標注 lihi-designer 或 lihi-coder 或 東東時：
- 菜菜不回應（NO_REPLY）
- 讓 Hermes agents 處理

## 產品架构 (2026-05-14)
### 核心概念
拍攝魚照片，自動測量長度並顯示尺標

### 三個可行方案
1. **參考物校正版**（最實用）
   - 用測量墊/硬幣/手機殼 AR marker 作為尺度參考
   - AI 偵測魚輪廓 + 參考物 → pixel-to-cm 換算
   - 最容易商業化，準確度最高

2. **AR 即時量測版**（Pro 功能）
   - iPhone LiDAR / ARKit / Android ARCore
   - 深度資訊估距，即時顯示長度
   - 體驗好但不同手機差異大，成本較高

3. **專用測量墊 + AI 辨識**（最看好）
   - branded 測量墊含刻度/AR 標記
   - AI 自動抓魚長 + 辨識魚種
   - 產出戰績卡可分享社群
   - 商業模式：測量墊 + 會員 + 比賽活動 + 漁獲資料庫

### MVP 建議
- 上傳照片 + 專用測量卡/墊
- AI 自動框魚、算長度
- 產出可分享圖片（魚種/長度/日期/地點/釣法）
- 不追 AR，先做照片版驗證市場

### 技術難點
- 魚沒平放、透視變形、廣角誤差
- 尾巴張開/收合、魚身彎曲
- **沒有參考物就無法準確換算**

### GitHub 範例 (AR 即時測量)
iOS:
- ScaleIt: https://github.com/yashmittall/ScaleIt
- ARKitMeasuring: https://github.com/BlackMirrorz/ARKitMeasuring
- ARRuler: https://github.com/vhanagwal/ARRuler

Android:
- StreetMeasure: https://github.com/streetcomplete/StreetMeasure
- ARCoreMeasure: https://github.com/hl3hl3/ARCoreMeasure
- ArCoreMeasurement: https://github.com/Kashif-E/ArCoreMeasurement

### 商業延伸
不只是量魚 app，可發展成：
- 釣魚紀錄系統
- 魚種圖鑑 + AI 辨識
- 戰績社群
- 比賽裁定工具
- 品牌合作平台
