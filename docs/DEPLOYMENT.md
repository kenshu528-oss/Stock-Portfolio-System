# 🚀 部署指南 - 將存股紀錄系統放到網路上

## 方案一：GitHub Pages (推薦 - 免費)

### 步驟 1：準備 GitHub 帳號
1. 前往 [GitHub.com](https://github.com) 註冊帳號
2. 驗證 email 地址

### 步驟 2：建立 Repository
1. 點擊右上角 "+" → "New repository"
2. Repository name: `stock-portfolio` (或任何你喜歡的名稱)
3. 設為 Public
4. 勾選 "Add a README file"
5. 點擊 "Create repository"

### 步驟 3：上傳檔案
**方法 A - 網頁上傳 (簡單):**
1. 在 repository 頁面點擊 "uploading an existing file"
2. 拖拉所有檔案到頁面上：
   - `index.html`
   - `script.js`
   - `styles.css`
   - `stock-api.js`
   - `cloud-sync.js`
3. 在下方填寫 commit message: "Add stock portfolio system"
4. 點擊 "Commit changes"

**方法 B - Git 指令 (進階):**
```bash
git clone https://github.com/你的用戶名/stock-portfolio.git
cd stock-portfolio
# 複製所有檔案到這個資料夾
git add .
git commit -m "Add stock portfolio system"
git push origin main
```

### 步驟 4：啟用 GitHub Pages
1. 在 repository 頁面點擊 "Settings"
2. 左側選單找到 "Pages"
3. Source 選擇 "Deploy from a branch"
4. Branch 選擇 "main"
5. 點擊 "Save"

### 步驟 5：取得網址
- 幾分鐘後，你的網站就會在：
- `https://你的用戶名.github.io/stock-portfolio/`

---

## 方案二：Netlify (超簡單)

### 步驟：
1. 前往 [Netlify.com](https://netlify.com)
2. 註冊帳號 (可用 GitHub 登入)
3. 將所有檔案放在一個資料夾中
4. 直接拖拉資料夾到 Netlify 網頁上
5. 立即獲得隨機網址 (可自訂)

---

## 方案三：Vercel

### 步驟：
1. 前往 [Vercel.com](https://vercel.com)
2. 用 GitHub 帳號登入
3. 選擇你的 repository
4. 點擊 "Deploy"
5. 完成！

---

## 🔄 雲端同步設定

為了在不同裝置間同步資料，請設定雲端同步：

### 步驟 1：建立 GitHub Token
1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)"
3. 勾選 "gist" 權限
4. 複製 token

### 步驟 2：在網站中設定
1. 開啟你的存股網站
2. 點擊右上角的 ☁️ 按鈕
3. 貼上 GitHub token
4. 完成設定

### 功能：
- ✅ 自動同步：每次修改都會自動上傳
- ✅ 跨裝置：在任何裝置都能存取最新資料
- ✅ 安全：資料加密儲存在你的 GitHub Gist
- ✅ 免費：完全免費使用

---

## 📱 使用方式

### 電腦：
- 直接開啟網址

### 手機：
- 開啟網址
- 可以「加入主畫面」當作 App 使用

### 平板：
- 響應式設計，自動適應螢幕大小

---

## 🔧 進階設定

### 自訂網域 (GitHub Pages)
1. 購買網域 (如 GoDaddy, Namecheap)
2. 在 DNS 設定中新增 CNAME 記錄指向 `你的用戶名.github.io`
3. 在 GitHub Pages 設定中填入你的網域

### HTTPS 憑證
- GitHub Pages 和 Netlify 都自動提供 HTTPS
- 無需額外設定

---

## ⚠️ 注意事項

1. **資料安全**：
   - 本地資料儲存在瀏覽器
   - 雲端資料儲存在你的 GitHub Gist (私人)
   - 不會洩漏給第三方

2. **API 限制**：
   - 股價 API 有使用限制
   - 建議不要過度頻繁更新

3. **瀏覽器相容性**：
   - 支援現代瀏覽器 (Chrome, Firefox, Safari, Edge)
   - 不支援 IE

4. **離線使用**：
   - 可以離線檢視資料
   - 需要網路才能更新股價和同步

---

## 🆘 常見問題

**Q: 忘記 GitHub token 怎麼辦？**
A: 重新產生一個新的 token，舊的會自動失效

**Q: 資料會不會遺失？**
A: 有雙重保護：本地儲存 + 雲端備份

**Q: 可以多人共用嗎？**
A: 目前設計為個人使用，多人使用需要分別設定

**Q: 手機版好用嗎？**
A: 完全響應式設計，手機使用體驗良好

**Q: 免費嗎？**
A: 完全免費！GitHub Pages、Netlify、Vercel 都有免費方案