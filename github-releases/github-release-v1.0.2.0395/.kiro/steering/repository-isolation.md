# 倉庫隔離規則 (Repository Isolation Rules)

## 🚨 嚴重錯誤預防

### 絕對禁止的操作
- **絕對禁止** 將不同倉庫的版本號混用
- **絕對禁止** 將其他倉庫的代碼直接複製到當前倉庫
- **絕對禁止** 混用不同倉庫的 Git 歷史
- **絕對禁止** 在錯誤的倉庫中進行開發

## 📂 倉庫版本對照

### Stock-Portfolio-System 倉庫
- **GitHub URL**: `https://github.com/kenshu528-oss/Stock-Portfolio-System`
- **版本範圍**: `v1.0.1.XXXX` 系列
- **技術棧**: React + TypeScript + Vite + Zustand
- **用途**: 現代化股票投資組合管理系統

### 其他倉庫 (禁止混用)
- **版本範圍**: `v1.2.2.XXXX` 系列 (屬於其他倉庫)
- **絕對禁止** 在 Stock-Portfolio-System 中使用

## ⚠️ 當前問題修正

### 問題描述
- 錯誤地將 `v1.2.2.0035` 版本拉取到 Stock-Portfolio-System 倉庫
- 這個版本號屬於其他倉庫，不應該出現在當前倉庫中

### 立即修正步驟
1. 檢查 GitHub 上 Stock-Portfolio-System 的正確版本
2. 回滾到正確的 `v1.0.1.0001` 或相近版本
3. 確保版本號和代碼匹配正確的倉庫

## 🔍 版本驗證規則

### 開發前必須確認
- [ ] 當前倉庫名稱正確
- [ ] 版本號範圍正確
- [ ] 技術棧匹配
- [ ] Git 遠端 URL 正確

### 版本號格式驗證
```bash
# Stock-Portfolio-System 正確格式
v1.0.1.XXXX (如: v1.0.1.0001, v1.0.1.0002)

# 錯誤格式 (屬於其他倉庫)
v1.2.2.XXXX (絕對禁止使用)
```

## 🛠️ 緊急修復流程

### 當發現版本混用時
1. **立即停止所有操作**
2. **檢查 GitHub 倉庫的正確版本**
3. **回滾到正確的版本**
4. **驗證代碼和版本號匹配**
5. **重新啟動開發流程**

### 預防措施
- 每次開發前檢查倉庫 URL
- 每次 git pull 前確認分支
- 每次版本更新前驗證版本號範圍
- 建立自動化檢查腳本

## 📋 倉庫識別檢查清單

### 必須確認的項目
- [ ] GitHub 倉庫名稱: `Stock-Portfolio-System`
- [ ] 版本號格式: `v1.0.1.XXXX`
- [ ] 技術棧: React + TypeScript + Vite
- [ ] 主要檔案: `src/main.tsx`, `vite.config.ts`
- [ ] 狀態管理: Zustand (`src/stores/appStore.ts`)

### 錯誤標識 (立即停止)
- ❌ 版本號 `v1.2.2.XXXX`
- ❌ 純 HTML/JS 結構 (無 React)
- ❌ 不存在 `vite.config.ts`
- ❌ 不存在 `src/stores/` 目錄

---

**記住：不同倉庫絕對不能混用！每次操作前都要確認倉庫身份！**