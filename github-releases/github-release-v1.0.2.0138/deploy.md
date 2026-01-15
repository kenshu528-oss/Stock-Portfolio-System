# GitHub 部署指南

## 🚀 **第一步：建立GitHub Repository**

### 1. 建立新的Repository
1. 前往 GitHub: https://github.com/kenshu528-oss
2. 點擊 "New repository"
3. Repository name: `stock-portfolio-system`
4. Description: `台灣股票投資組合管理系統 - 支援多帳戶管理、即時股價、股息追蹤`
5. 設為 Public（讓家人可以訪問）
6. 勾選 "Add a README file"
7. 點擊 "Create repository"

### 2. 本地Git初始化和推送
在專案根目錄執行以下命令：

```bash
# 初始化Git（如果還沒有）
git init

# 添加所有檔案
git add .

# 提交變更
git commit -m "v1.0.1.0001: 首次GitHub正式發布 - 完整功能版本"

# 添加遠端repository
git remote add origin https://github.com/kenshu528-oss/stock-portfolio-system.git

# 推送到GitHub
git push -u origin main
```

## 🌐 **第二步：啟用GitHub Pages**

### 1. 設定GitHub Pages
1. 在GitHub repository頁面，點擊 "Settings"
2. 滾動到 "Pages" 部分
3. Source 選擇 "GitHub Actions"
4. 儲存設定

### 2. 觸發自動部署
推送代碼後，GitHub Actions會自動：
1. 安裝依賴
2. 執行測試
3. 建置專案
4. 部署到GitHub Pages

### 3. 訪問網址
部署完成後，你的應用程式將可在以下網址訪問：
**https://kenshu528-oss.github.io/stock-portfolio-system/**

## 📱 **第三步：分享給家人**

### 網址分享
```
🏠 Stock Portfolio System
📊 台灣股票投資組合管理系統

🌐 網址: https://kenshu528-oss.github.io/stock-portfolio-system/

✨ 功能特色:
• 多帳戶股票管理
• 即時股價查詢
• 股息收入追蹤
• 手機桌面完美支援
• 隱私保護模式
• 資料匯入匯出
• 雲端同步備份

📱 支援所有現代瀏覽器和手機
🔒 資料儲存在本地，隱私安全
```

### 使用說明
1. **首次使用**：
   - 點擊左上角選單 → "帳戶管理" → 新增帳戶
   - 點擊 "新增股票" 開始建立投資組合

2. **手機使用**：
   - 點擊左上角 ☰ 開啟功能選單
   - 所有功能都可在側邊選單中找到

3. **雲端同步**：
   - 點擊雲端圖示設定GitHub同步
   - 需要GitHub帳戶和Personal Access Token

## 🔧 **第四步：後續更新**

### 本地開發和更新
```bash
# 修改代碼後
git add .
git commit -m "v1.0.1.0002: 功能更新描述"
git push

# GitHub Actions會自動重新部署
```

### 版本管理
- 每次更新都會自動遞增版本號
- 版本號顯示在應用程式右上角
- 遵循四碼版本控制規範

## 🛠 **故障排除**

### 如果部署失敗
1. 檢查GitHub Actions頁面的錯誤訊息
2. 確認所有檔案都已正確推送
3. 檢查package.json中的依賴是否正確

### 如果網頁無法訪問
1. 等待5-10分鐘讓部署完成
2. 檢查GitHub Pages設定是否正確
3. 清除瀏覽器快取後重新訪問

### 如果功能異常
1. 開啟瀏覽器開發者工具查看錯誤
2. 確認後端API服務是否正常運行
3. 檢查網路連線是否正常

## 📞 **技術支援**

如果遇到問題，可以：
1. 檢查GitHub Issues頁面
2. 查看部署日誌
3. 聯絡開發者進行協助

---

**🎉 恭喜！你的Stock Portfolio System現在已經可以在網路上使用了！**