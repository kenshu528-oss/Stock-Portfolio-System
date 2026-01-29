# KIRO 專案規範快速設置指南

## 🎯 三種分享方式

### 方式 1：全域設置 (推薦) ⭐

**適用情況**：你有多個 KIRO 專案，希望統一應用規範

**操作步驟**：
```bash
# 在當前專案目錄執行
setup-global-standards.bat

# 或手動複製
mkdir %USERPROFILE%\.kiro\settings\steering
copy UNIVERSAL_CLOUD_SYNC_STANDARDS.md %USERPROFILE%\.kiro\settings\steering\cloud-sync-development.md
copy .kiro\steering\safe-development.md %USERPROFILE%\.kiro\settings\steering\
copy .kiro\steering\api-data-integrity.md %USERPROFILE%\.kiro\settings\steering\
```

**優點**：
- ✅ 自動應用到所有新專案
- ✅ 集中管理和更新
- ✅ 無需每個專案單獨設置

### 方式 2：專案特定設置

**適用情況**：只想在特定專案中應用規範

**操作步驟**：
```bash
# 設置到指定專案
setup-shared-standards.bat C:\Path\To\Your\Project

# 或手動複製
mkdir C:\Path\To\Your\Project\.kiro\steering
copy UNIVERSAL_CLOUD_SYNC_STANDARDS.md C:\Path\To\Your\Project\.kiro\steering\cloud-sync-development.md
```

**優點**：
- ✅ 完全控制哪些專案使用規範
- ✅ 可以針對專案定制規則
- ✅ 不影響其他專案

### 方式 3：模板方式

**適用情況**：希望建立可重用的專案模板

**操作步驟**：
```bash
# 創建模板目錄
mkdir C:\KIRO-Templates\steering-rules
copy .kiro\steering\*.md C:\KIRO-Templates\steering-rules\
copy UNIVERSAL_CLOUD_SYNC_STANDARDS.md C:\KIRO-Templates\steering-rules\

# 使用時複製到新專案
copy C:\KIRO-Templates\steering-rules\*.md NewProject\.kiro\steering\
```

## 🛠️ 使用步驟

### 步驟 1：選擇設置方式
根據你的需求選擇上述三種方式之一。

### 步驟 2：執行設置
```bash
# 全域設置
setup-global-standards.bat

# 或專案特定設置
setup-shared-standards.bat C:\Path\To\Target\Project
```

### 步驟 3：驗證設置
1. 開啟 KIRO 並載入目標專案
2. 檢查是否能看到 STEERING 規則生效
3. 嘗試開發雲端同步功能，確認規範有幫助

### 步驟 4：自定義調整
根據專案需求調整規則內容：
- 修改 API 服務類型
- 調整資料結構定義
- 自定義錯誤處理邏輯

## 📋 檢查清單

### 設置前檢查
- [ ] 確認 KIRO 版本支援 STEERING 功能
- [ ] 備份現有的專案規則（如果有）
- [ ] 了解目標專案的技術架構

### 設置後驗證
- [ ] KIRO 能正確讀取規則文件
- [ ] 規則內容適用於目標專案
- [ ] 沒有與現有規則衝突
- [ ] 團隊成員了解新規範

### 持續維護
- [ ] 定期檢查規則的實用性
- [ ] 根據使用經驗更新規範
- [ ] 收集團隊反饋並改進
- [ ] 與其他專案同步最新規範

## 🔧 故障排除

### 常見問題

**Q: KIRO 沒有讀取到規則？**
A: 檢查檔案路徑和權限，確認 `.kiro/steering/` 目錄存在且檔案格式正確。

**Q: 規則與現有專案不相容？**
A: 編輯規則文件，移除或修改不適用的部分，保留核心原則。

**Q: 全域規則影響了不需要的專案？**
A: 在特定專案中創建空的規則文件覆蓋全域規則，或移除全域設置。

**Q: 如何更新已設置的規範？**
A: 重新執行設置腳本，或手動替換規則文件。

### 移除設置

**移除全域設置**：
```bash
rmdir /s %USERPROFILE%\.kiro\settings
```

**移除專案特定設置**：
```bash
rmdir /s ProjectPath\.kiro\steering
```

## 📚 相關文檔

- [UNIVERSAL_CLOUD_SYNC_STANDARDS.md](./UNIVERSAL_CLOUD_SYNC_STANDARDS.md) - 通用雲端同步標準
- [CLOUD_SYNC_TROUBLESHOOTING_GUIDE.md](./CLOUD_SYNC_TROUBLESHOOTING_GUIDE.md) - 故障排除指南
- [SHARING_GUIDE.md](./SHARING_GUIDE.md) - 詳細分享指南
- [DEVELOPMENT_SPECIFICATION.md](./DEVELOPMENT_SPECIFICATION.md) - 開發規格文件

## 💡 最佳實踐

1. **從小開始**：先在一個測試專案中驗證規範
2. **逐步推廣**：確認有效後再應用到其他專案
3. **持續改進**：根據實際使用經驗不斷優化
4. **團隊協作**：確保團隊成員都了解新規範
5. **文檔維護**：保持規範文檔的更新和準確性

---

**建議**：如果你是第一次使用，建議先選擇「專案特定設置」在一個測試專案中驗證效果，確認無問題後再考慮「全域設置」。