# GitHub Actions Stock List 更新失敗記錄

## 📅 問題發生日期
2026-01-28

## 🚨 問題描述
GitHub Actions 的 "Update Stock List" 工作流程持續失敗，錯誤訊息顯示缺少 `FINMIND_TOKEN`。

## 🔍 錯誤分析

### 錯誤訊息
```
❌ 找不到 FINMIND_TOKEN 環境變數
使用腳本內建的 Token
```

### 根本原因
1. **GitHub Actions 配置問題**: 工作流程期望 `FINMIND_TOKEN` secret，但倉庫中未設定
2. **Python 腳本邏輯問題**: 雖有硬編碼 token 作為預設值，但仍有不必要的檢查導致失敗
3. **錯誤處理不當**: 腳本在有預設值的情況下仍然 `sys.exit(1)`

## 🔧 修復方案

### 1. 修復 Python 腳本邏輯
```python
# 修復前：會導致失敗
MY_TOKEN = os.environ.get('FINMIND_TOKEN', "硬編碼token")
if not MY_TOKEN:  # 這個檢查是多餘的，因為有預設值
    sys.exit(1)

# 修復後：正確處理
MY_TOKEN = os.environ.get('FINMIND_TOKEN', "硬編碼token")
if os.environ.get('FINMIND_TOKEN'):
    print("✅ 使用環境變數中的 FINMIND_TOKEN")
else:
    print("⚠️ 使用腳本內建的 FINMIND_TOKEN")
```

### 2. 改善 GitHub Actions 錯誤訊息
```yaml
# 修復前：誤導性錯誤訊息
echo "❌ 找不到 FINMIND_TOKEN 環境變數"

# 修復後：清楚的說明
echo "⚠️ 找不到 FINMIND_TOKEN secret，使用腳本內建的 Token"
echo "💡 如需使用自定義 Token，請在 GitHub 倉庫設定中添加 FINMIND_TOKEN secret"
```

## 📊 測試結果

### 修復前
- ❌ GitHub Actions 失敗
- ❌ 錯誤訊息誤導
- ❌ 股票清單無法自動更新

### 修復後 (預期)
- ✅ GitHub Actions 成功執行
- ✅ 使用內建 token 正常運行
- ✅ 股票清單自動更新

## 💡 學習要點

### 1. 環境變數處理最佳實踐
```python
# ✅ 正確：提供預設值並記錄來源
TOKEN = os.environ.get('API_TOKEN', 'default_token')
if os.environ.get('API_TOKEN'):
    print("使用環境變數")
else:
    print("使用預設值")

# ❌ 錯誤：有預設值但仍檢查空值
TOKEN = os.environ.get('API_TOKEN', 'default_token')
if not TOKEN:  # 永遠不會為空，因為有預設值
    sys.exit(1)
```

### 2. GitHub Actions Secret 管理
- Secret 是可選的，不應該強制要求
- 提供清楚的說明如何設定 Secret
- 有預設值時應該能正常運行

### 3. 錯誤訊息設計
- 避免誤導性的錯誤訊息
- 提供解決方案的建議
- 區分錯誤和警告

## 🔄 後續監控
1. 觀察修復後的 GitHub Actions 執行結果
2. 確認股票清單能正常自動更新
3. 監控 FinMind API token 的有效性

## 📝 備註
這個問題突顯了自動化系統中錯誤處理的重要性。即使有備援方案（硬編碼 token），不當的錯誤檢查仍會導致系統失敗。