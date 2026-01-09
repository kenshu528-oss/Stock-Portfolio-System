# 備援與復原腳本使用說明

## 概述

這些腳本提供了完整的備份和復原機制，確保程式修改過程中的安全性。

## 腳本說明

### 1. 備份腳本

#### Windows (PowerShell)
```powershell
.\scripts\backup.ps1
```

#### Linux/Mac (Bash)
```bash
./scripts/backup.sh
```

**功能**：
- 自動讀取當前版本號
- 建立 Git 備份點和標籤
- 建立完整的檔案系統備份
- 驗證備份完整性
- 自動清理舊備份

### 2. 復原腳本

#### Windows (PowerShell)
```powershell
# 列出可用備份
.\scripts\restore.ps1 -List

# 復原到指定備份
.\scripts\restore.ps1 backup-v1.0.0.0005-20240108-143022

# 使用 Git 復原
.\scripts\restore.ps1 -Git backup-v1.0.0.0005-20240108-143022

# 使用檔案系統復原
.\scripts\restore.ps1 -File backup-v1.0.0.0005-20240108-143022
```

#### Linux/Mac (Bash)
```bash
# 列出可用備份
./scripts/restore.sh -l

# 復原到指定備份
./scripts/restore.sh backup-v1.0.0.0005-20240108-143022

# 使用 Git 復原
./scripts/restore.sh -g backup-v1.0.0.0005-20240108-143022
```

### 3. 驗證腳本

#### Linux/Mac (Bash)
```bash
./scripts/verify.sh
```

**功能**：
- 檢查專案結構完整性
- 驗證關鍵檔案存在
- 檢查版本資訊
- 測試建置和測試
- 驗證備份系統

## 使用流程

### 修改前備份
```powershell
# Windows
.\scripts\backup.ps1

# Linux/Mac
./scripts/backup.sh
```

### 修改後驗證
```bash
# 執行測試
npm test

# 執行建置
npm run build

# 啟動應用程式
npm run dev
```

### 發現問題時復原
```powershell
# Windows - 列出備份
.\scripts\restore.ps1 -List

# Windows - 復原
.\scripts\restore.ps1 backup-v1.0.0.0005-20240108-143022

# Linux/Mac - 列出備份
./scripts/restore.sh -l

# Linux/Mac - 復原
./scripts/restore.sh backup-v1.0.0.0005-20240108-143022
```

### 復原後重建
```bash
# 重新安裝相依套件
npm install

# 執行測試
npm test

# 執行建置
npm run build

# 啟動開發伺服器
npm run dev
```

## 備份命名規範

```
backup-v{MAJOR}.{MINOR}.{RELEASE}.{PATCH}-{YYYYMMDD}-{HHMMSS}
```

範例：
- `backup-v1.0.0.0005-20240108-143022`
- `backup-v1.0.0.0006-20240108-145530`

## 備份位置

- **Git 備份**：Git 標籤形式儲存在 `.git` 目錄
- **檔案備份**：儲存在 `../backups/` 目錄
- **緊急備份**：復原時自動建立在 `../backups/emergency-backup-*`

## 注意事項

1. **執行權限**：Linux/Mac 系統需要設定執行權限
   ```bash
   chmod +x scripts/*.sh
   ```

2. **備份頻率**：每次修改前都應該建立備份

3. **備份驗證**：定期驗證備份的完整性和可復原性

4. **磁碟空間**：注意備份佔用的磁碟空間，腳本會自動清理舊備份

5. **Git 狀態**：確保重要變更已提交到 Git

## 故障排除

### 常見問題

1. **權限錯誤**
   ```bash
   # Linux/Mac
   chmod +x scripts/*.sh
   ```

2. **Git 錯誤**
   ```bash
   # 檢查 Git 狀態
   git status
   
   # 提交變更
   git add .
   git commit -m "Save changes before backup"
   ```

3. **磁碟空間不足**
   ```bash
   # 手動清理舊備份
   rm -rf ../backups/stock-portfolio-backup-v1.0.0.0001-*
   ```

4. **復原失敗**
   ```bash
   # 檢查備份是否存在
   ls -la ../backups/
   
   # 檢查 Git 標籤
   git tag | grep backup
   ```

### 緊急復原

如果所有自動化方法都失敗：

1. **手動 Git 復原**
   ```bash
   git log --oneline
   git reset --hard <commit-hash>
   ```

2. **手動檔案復原**
   ```bash
   cp -r ../backups/stock-portfolio-backup-v1.0.0.0005-20240108-143022/* .
   ```

3. **重建環境**
   ```bash
   rm -rf node_modules
   npm install
   npm run build
   ```

## 聯絡支援

如果遇到無法解決的問題，請提供以下資訊：
- 錯誤訊息
- 執行的命令
- 當前版本號
- 系統環境（Windows/Linux/Mac）