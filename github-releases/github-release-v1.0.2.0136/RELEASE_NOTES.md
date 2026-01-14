# Stock Portfolio System v1.0.2.0136 Release Notes

## 📅 發布日期
2026-01-14

## 🎯 本次發布重點

### 重大修復（Critical Fixes）
1. **修復除權息記錄重複疊加問題** (v1.0.2.0130-0132)
   - 簡化重複檢查邏輯，只檢查日期和代碼
   - 修復強制重新計算時的累積問題
   - 統一 Header 批量更新和個股更新邏輯

2. **修復損益模式切換無效** (v1.0.2.0133)
   - 移除已廢棄的 includeDividendInGainLoss
   - 統一使用 rightsAdjustmentMode
   - 確保切換按鈕能正確改變損益顯示

3. **修復總損益顯示不一致** (v1.0.2.0134-0135)
   - 統一使用 RightsAdjustmentService 計算
   - 考慮交易成本（手續費 + 證交稅）
   - 移除重複的統計欄

### UI/UX 改進
4. **修復 Sidebar 滾動問題** (v1.0.2.0136)
   - 添加 overflow-y-auto 支援垂直滾動
   - 設定 maxHeight 確保所有選項可訪問

## 📊 版本歷程

### v1.0.2.0136 (2026-01-14)
- **類型**: patch
- **修復**: Sidebar 選單內容過多無法滾動
- **變更**: 添加 overflow-y-auto 和 maxHeight

### v1.0.2.0135 (2026-01-14)
- **類型**: patch
- **修復**: 移除 StockList 底部重複的統計欄
- **變更**: 簡化 UI，避免資訊重複

### v1.0.2.0134 (2026-01-14)
- **類型**: critical
- **修復**: 上下兩處總損益不一致（差異 $178,174）
- **變更**: StockList 底部統一使用 RightsAdjustmentService

### v1.0.2.0133 (2026-01-14)
- **類型**: critical
- **修復**: 損益模式切換按鈕點擊無反應
- **變更**: 移除 includeDividendInGainLoss，統一使用 rightsAdjustmentMode

### v1.0.2.0132 (2026-01-14)
- **類型**: critical
- **修復**: Header 批量更新和個股更新邏輯不一致
- **變更**: 統一傳入 forceRecalculate 參數
- **新增**: unified-rights-calculation.md STEERING 規範

### v1.0.2.0131 (2026-01-14)
- **類型**: hotfix
- **修復**: 強制重新計算除權息時的累積問題
- **變更**: 重置持股數到原始值

### v1.0.2.0130 (2026-01-14)
- **類型**: hotfix
- **修復**: 配息記錄重複疊加
- **變更**: 簡化重複檢查邏輯，只檢查日期和代碼

## 🔧 技術改進

### 代碼質量
- ✅ 統一除權息計算邏輯（Single Source of Truth）
- ✅ 移除重複代碼和邏輯
- ✅ 改善錯誤處理和日誌記錄
- ✅ 創建 unified-rights-calculation.md 規範

### 性能優化
- ✅ 減少重複計算
- ✅ 簡化組件邏輯
- ✅ 移除不必要的狀態訂閱

### UI/UX 改進
- ✅ 修復滾動問題
- ✅ 移除重複資訊
- ✅ 改善小螢幕體驗

## 📝 重要變更

### 除權息計算邏輯統一
所有除權息更新入口現在都使用相同的邏輯：
- Header 批量更新按鈕
- 個股除權息管理按鈕
- 自動載入除權息

### 損益模式簡化
從兩個獨立的狀態變數簡化為一個：
- ~~includeDividendInGainLoss~~ (已移除)
- rightsAdjustmentMode (統一使用)

### 交易成本計算
所有損益計算現在都正確考慮：
- 買入手續費：MAX(20元, 金額 × 0.1425%)
- 賣出手續費：MAX(20元, 金額 × 0.1425%)
- 證交稅：金額 × 稅率（一般股票 0.3%，債券 ETF 0.1%）

## 🐛 已知問題
無

## 📚 文檔更新
- ✅ 創建 unified-rights-calculation.md
- ✅ 創建 gain-loss-calculation-explained.md
- ✅ 更新 CHANGELOG.ts（完整記錄）

## 🔗 相關連結
- GitHub Repository: https://github.com/kenshu528-oss/Stock-Portfolio-System
- 線上展示: https://kenshu528-oss.github.io/Stock-Portfolio-System/

## 👥 貢獻者
- Ken Xu (@kenshu528-oss)

## 📄 授權
MIT License

---

**注意事項**：
1. 本版本包含多個重大修復，建議所有用戶更新
2. 除權息計算邏輯已完全統一，確保結果一致性
3. 損益模式切換功能已修復，可正常使用
4. 所有統計數字現在都正確考慮交易成本

**升級建議**：
- 從 v1.0.2.0129 或更早版本升級：強烈建議
- 從 v1.0.2.0130-0135 升級：建議（修復 UI 問題）
