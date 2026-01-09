---
inclusion: always
---

# 備援與復原機制

## 備援策略概述

為了避免程式修改過程中將程式修改到崩潰後無法復原，建立多層次的備援機制，確保任何時候都能快速恢復到穩定狀態。

## 🔴 強制性備援規則

### 1. 修改前自動備份
- **每次修改前必須建立備份點**
- **備份包含完整的程式碼狀態**
- **備份必須包含版本資訊和時間戳記**
- **不允許在沒有備份的情況下進行修改**

### 2. 測試驗證機制
- **每次修改後必須執行基本測試**
- **確保應用程式能正常啟動**
- **驗證核心功能運作正常**
- **發現問題立即回滾**

### 3. 分階段修改
- **大型修改必須分解為小步驟**
- **每個步驟都有獨立的備份點**
- **逐步驗證每個修改的影響**
- **保持隨時可回滾的狀態**

## 備份機制

### 自動備份系統

#### 1. 版本控制備份
```bash
# 每次修改前建立 Git 備份點
git add .
git commit -m "Backup before modification: v{version}"
git tag "backup-v{version}-{timestamp}"
```

#### 2. 檔案系統備份
```bash
# 建立完整專案備份
cp -r . ../backups/stock-portfolio-v{version}-{timestamp}/
```

#### 3. 關鍵檔案備份
優先備份的關鍵檔案：
- `src/` 目錄（所有原始碼）
- `package.json` 和 `package-lock.json`
- 配置檔案（`vite.config.ts`, `tsconfig.json`, `tailwind.config.js`）
- `.kiro/` 目錄（規格和設定）

### 備份命名規範

```
backup-v{MAJOR}.{MINOR}.{RELEASE}.{PATCH}-{YYYYMMDD}-{HHMMSS}
```

範例：
- `backup-v1.0.0.0005-20240108-143022`
- `backup-v1.0.0.0006-20240108-145530`

## 復原機制

### 快速復原步驟

#### 1. 立即回滾（Git 復原）
```bash
# 回滾到上一個 commit
git reset --hard HEAD~1

# 回滾到特定備份標籤
git reset --hard backup-v1.0.0.0005-20240108-143022
```

#### 2. 檔案系統復原
```bash
# 從備份目錄復原
rm -rf src/
cp -r ../backups/stock-portfolio-v1.0.0.0005-20240108-143022/src/ ./
```

#### 3. 完整專案復原
```bash
# 完整復原到備份狀態
cd ..
rm -rf current-project/
cp -r backups/stock-portfolio-v1.0.0.0005-20240108-143022/ current-project/
cd current-project/
npm install
```

### 復原驗證清單

復原後必須執行的驗證：
- [ ] 檢查版本號是否正確
- [ ] 執行 `npm install` 安裝相依套件
- [ ] 執行 `npm test` 確保測試通過
- [ ] 執行 `npm run build` 確保能正常建置
- [ ] 啟動開發伺服器確保應用程式正常運作
- [ ] 驗證核心功能是否正常

## 修改安全流程

### 🟢 安全修改流程

#### 1. 修改前準備
```bash
# 1. 建立備份點
git add .
git commit -m "Backup before: [修改描述]"
git tag "backup-v{current_version}-$(date +%Y%m%d-%H%M%S)"

# 2. 建立檔案系統備份
mkdir -p ../backups
cp -r . "../backups/stock-portfolio-v{current_version}-$(date +%Y%m%d-%H%M%S)/"

# 3. 記錄當前狀態
echo "Current version: v{current_version}" > .backup-info
echo "Backup created: $(date)" >> .backup-info
```

#### 2. 執行修改
- 進行程式碼修改
- 更新版本號（PATCH +1）
- 記錄修改內容

#### 3. 修改後驗證
```bash
# 1. 基本語法檢查
npm run lint

# 2. 執行測試
npm test

# 3. 建置檢查
npm run build

# 4. 啟動檢查
npm run dev &
sleep 5
curl -f http://localhost:5173/ || echo "啟動失敗"
```

#### 4. 確認或回滾
- ✅ 如果驗證通過：提交修改
- ❌ 如果驗證失敗：立即回滾

### 🔴 緊急回滾程序

當發現程式崩潰或無法運作時：

#### 立即執行步驟：
1. **停止所有運行中的程序**
2. **不要進行任何額外修改**
3. **立即執行回滾命令**
4. **驗證回滾後的狀態**
5. **記錄問題和回滾原因**

#### 回滾命令：
```bash
# 快速回滾到上一個穩定版本
git reset --hard HEAD~1
npm install
npm run dev
```

## 備份管理

### 備份保留政策

#### 短期備份（本地）
- **保留最近 10 個版本的完整備份**
- **每日清理超過 10 天的備份**
- **保留所有 Git 標籤備份點**

#### 長期備份（外部）
- **每個 MINOR 版本建立長期備份**
- **每個 RELEASE 版本建立永久備份**
- **重要里程碑版本建立多重備份**

### 備份驗證

#### 定期備份檢查
- **每週驗證最新備份的完整性**
- **測試備份的可復原性**
- **確認備份檔案沒有損壞**

#### 備份測試流程
```bash
# 1. 建立測試環境
mkdir backup-test
cd backup-test

# 2. 復原備份
cp -r ../backups/latest-backup/* .

# 3. 驗證復原
npm install
npm test
npm run build

# 4. 清理測試環境
cd ..
rm -rf backup-test
```

## 災難復原計劃

### 完全系統失敗復原

#### 情境：開發環境完全損壞
1. **從最新備份復原完整專案**
2. **重新安裝開發環境**
3. **驗證所有功能正常**
4. **重建開發工具鏈**

#### 情境：關鍵檔案損壞
1. **識別損壞的檔案**
2. **從備份中復原特定檔案**
3. **驗證檔案完整性**
4. **測試相關功能**

#### 情境：版本混亂
1. **確認最後穩定版本**
2. **回滾到該版本**
3. **重新建立版本追蹤**
4. **更新版本號系統**

## 監控與警報

### 自動監控項目
- **應用程式啟動狀態**
- **基本功能可用性**
- **建置成功率**
- **測試通過率**

### 警報觸發條件
- 應用程式無法啟動
- 建置失敗
- 測試失敗率超過閾值
- 關鍵功能異常

## 開發者責任

### 🔴 必須執行的責任
1. **每次修改前建立備份**
2. **修改後立即驗證**
3. **發現問題立即回滾**
4. **記錄所有修改和問題**
5. **保持備份系統正常運作**

### 📋 修改檢查清單

**修改前**：
- [ ] 建立 Git 備份點
- [ ] 建立檔案系統備份
- [ ] 記錄當前版本狀態
- [ ] 確認修改計劃

**修改中**：
- [ ] 分步驟進行修改
- [ ] 每步驟後進行小測試
- [ ] 更新版本號
- [ ] 記錄修改內容

**修改後**：
- [ ] 執行完整測試
- [ ] 驗證應用程式啟動
- [ ] 檢查核心功能
- [ ] 確認或回滾決定

## 快速備份與復原工具

### Windows 快速工具

#### 快速備份
```powershell
.\scripts\quick-backup.ps1
```

#### 快速復原
```powershell
# 列出可用備份
.\scripts\quick-restore.ps1

# 復原到指定備份
.\scripts\quick-restore.ps1 backup-v1.0.0.0005-20240108-143022
```

### 完整備份工具

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

### 快速復原腳本

```bash
#!/bin/bash
# restore.sh - 快速復原腳本

if [ -z "$1" ]; then
    echo "使用方式: ./restore.sh <backup-tag>"
    echo "可用備份: $(git tag | grep backup | tail -5)"
    exit 1
fi

BACKUP_TAG=$1

# 確認備份存在
if ! git tag | grep -q "$BACKUP_TAG"; then
    echo "錯誤: 備份標籤 $BACKUP_TAG 不存在"
    exit 1
fi

# 執行復原
echo "復原到: $BACKUP_TAG"
git reset --hard "$BACKUP_TAG"
npm install
echo "復原完成，請執行 npm run dev 測試"
```

這個備援機制確保了程式開發過程中的安全性和可復原性，讓您可以放心進行各種修改和實驗！