# KIRO 專案間經驗分享指南

## 🎯 分享目標

將本專案中雲端同步開發的經驗和規範分享到其他 KIRO 專案，避免重複相同的錯誤。

## 📋 分享方式

### 1. 全域 STEERING 規則 ⭐ 推薦

#### 步驟 1：創建用戶級別的 STEERING 規則
```bash
# 創建用戶級別的 STEERING 目錄
mkdir -p ~/.kiro/settings/steering

# 複製通用規則
cp .kiro/steering/cloud-sync-development.md ~/.kiro/settings/steering/
cp .kiro/steering/safe-development.md ~/.kiro/settings/steering/
cp .kiro/steering/api-data-integrity.md ~/.kiro/settings/steering/
```

#### 步驟 2：修改規則為通用版本
編輯 `~/.kiro/settings/steering/cloud-sync-development.md`，移除專案特定內容，保留通用原則。

### 2. 專案模板方式

#### 創建可重用的模板文件
```bash
# 在你的開發目錄創建模板資料夾
mkdir ~/kiro-templates/
mkdir ~/kiro-templates/steering-rules/
mkdir ~/kiro-templates/docs/

# 複製規範文件
cp .kiro/steering/*.md ~/kiro-templates/steering-rules/
cp CLOUD_SYNC_TROUBLESHOOTING_GUIDE.md ~/kiro-templates/docs/
cp DEVELOPMENT_SPECIFICATION.md ~/kiro-templates/docs/
```

### 3. Git 子模組方式

#### 創建共享規範倉庫
```bash
# 創建新的 Git 倉庫存放共享規範
git init ~/kiro-shared-standards
cd ~/kiro-shared-standards

# 複製規範文件
cp /path/to/current/project/.kiro/steering/*.md ./steering/
cp /path/to/current/project/CLOUD_SYNC_TROUBLESHOOTING_GUIDE.md ./docs/

# 提交到 Git
git add .
git commit -m "Initial shared standards"
git remote add origin <your-repo-url>
git push -u origin main
```

#### 在其他專案中使用
```bash
# 在其他專案中添加為子模組
git submodule add <your-repo-url> .kiro/shared-standards

# 創建符號連結
ln -s .kiro/shared-standards/steering/* .kiro/steering/
```

## 🛠️ 實作建議

### 方案 A：全域 STEERING (最簡單)

**優點**：
- 自動應用到所有 KIRO 專案
- 無需手動複製
- 集中管理和更新

**缺點**：
- 可能對某些專案不適用
- 需要確保規則的通用性

**實作步驟**：
1. 將通用規則複製到 `~/.kiro/settings/steering/`
2. 編輯規則，移除專案特定內容
3. 測試在新專案中是否正常工作

### 方案 B：專案模板 (最靈活)

**優點**：
- 可以針對不同類型專案定制
- 完全控制要分享的內容
- 易於維護和更新

**缺點**：
- 需要手動複製到新專案
- 可能會忘記應用

**實作步驟**：
1. 創建模板目錄結構
2. 整理通用規範文件
3. 建立使用說明文檔

### 方案 C：共享倉庫 (最專業)

**優點**：
- 版本控制和歷史追蹤
- 團隊協作友好
- 可以建立 PR 流程改進規範

**缺點**：
- 設置較複雜
- 需要維護額外的倉庫

## 📝 通用化建議

### 需要通用化的規則

#### 1. 雲端同步開發規範
- 移除 GitHub Gist 特定內容
- 改為通用的「外部 API 整合規範」
- 保留統一資料流和錯誤處理原則

#### 2. 安全開發規則
- 保持疊加式開發原則
- 通用的錯誤處理標準
- 版本管理最佳實踐

#### 3. API 資料完整性
- 通用的 API 整合原則
- 資料驗證標準
- 錯誤處理規範

### 需要專案特定的規則
- UI 設計標準（可能因專案而異）
- 版本歸檔規則（可能有不同的版本號格式）
- GitHub 授權規則（可能有不同的權限需求）

## 🎯 推薦實作方案

### 混合方案：全域 + 專案特定

1. **全域規則** (`~/.kiro/settings/steering/`)：
   - `general-development-principles.md`
   - `api-integration-standards.md`
   - `error-handling-standards.md`
   - `safe-development-practices.md`

2. **專案特定規則** (`.kiro/steering/`)：
   - `ui-design-standards.md`
   - `version-archival.md`
   - `project-specific-rules.md`

## 📋 實作檢查清單

### 準備階段
- [ ] 識別通用 vs 專案特定的規則
- [ ] 編輯規則文件，移除專案特定內容
- [ ] 測試規則在其他專案中的適用性

### 實作階段
- [ ] 選擇分享方式（全域/模板/共享倉庫）
- [ ] 創建必要的目錄結構
- [ ] 複製和編輯規範文件
- [ ] 建立使用說明文檔

### 驗證階段
- [ ] 在新專案中測試規則是否生效
- [ ] 確認 KIRO 能正確讀取規則
- [ ] 驗證規則的實用性和完整性

### 維護階段
- [ ] 建立規則更新流程
- [ ] 收集其他專案的反饋
- [ ] 持續改進和優化規則

## 💡 最佳實踐

1. **從小開始**：先分享最核心的 2-3 個規則
2. **測試驗證**：在新專案中實際測試規則效果
3. **持續改進**：根據使用經驗不斷優化規則
4. **文檔化**：為每個規則提供清楚的說明和範例
5. **版本控制**：追蹤規則的變更歷史

---

**建議**：先從全域 STEERING 規則開始，將最核心的開發原則分享出去，然後根據實際使用情況再考慮其他方案。