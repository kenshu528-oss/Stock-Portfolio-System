# Stock Portfolio System 規格文檔

## 隱蔽後門功能

### 環境變數配置

```bash
# .env 檔案配置
VITE_DEV_TOKEN=your_github_token_here

# 說明：
# - 本機開發：直接從 .env 檔案讀取
# - 雲端部署：從 GitHub Actions Secrets 注入
```

### GitHub Actions 配置

1. **GitHub Repository Secrets**：
   - 路徑：Settings → Secrets and variables → Actions
   - 新增 Secret：
     - **Name**: `DEV_GITHUB_TOKEN`（注意：GitHub Secret 命名規則不允許底線開頭）
     - **Value**: `your_github_token_here`（與 .env 檔案相同）

2. **GitHub Actions 工作流程**（`.github/workflows/deploy.yml`）：
   ```yaml
   env:
     VITE_DEV_TOKEN: ${{ secrets.DEV_GITHUB_TOKEN }}
   ```

### 使用說明

隱蔽後門功能會在雲端環境中自動載入 GitHub Token，無需手動輸入。

詳細操作請參考：
- `docs/HIDDEN_BACKDOOR_MANUAL.md` - 完整操作手冊
- `docs/GITHUB_SECRET_SETUP.md` - GitHub Secret 設定指南