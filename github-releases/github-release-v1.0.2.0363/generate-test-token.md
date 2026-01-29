# GitHub Token 生成指南

## 快速生成新 Token：

1. **直接連結**：https://github.com/settings/tokens/new

2. **設定參數**：
   - **Note**: `Stock Portfolio Development`
   - **Expiration**: `No expiration` 或選擇適當期限
   - **Select scopes**:
     - ✅ `gist` - Create gists
     - ✅ `user:email` - Access user email addresses

3. **點擊 "Generate token"**

4. **立即複製 Token**（只會顯示一次！）

## 測試 Token：

```bash
# 在瀏覽器 Console 中測試：
fetch('https://api.github.com/user', {
  headers: {
    'Authorization': 'token YOUR_TOKEN_HERE',
    'Accept': 'application/vnd.github.v3+json'
  }
}).then(r => r.json()).then(console.log)
```

## 常見問題：

- **401 Unauthorized**: Token 無效或權限不足
- **403 Forbidden**: API 限制或權限問題
- **404 Not Found**: 端點不存在（不太可能）

## 替代方案：

如果 Personal Access Token 有問題，可以嘗試：
1. 刪除舊 Token，重新生成
2. 使用 GitHub App 方式（較複雜）
3. 使用其他雲端存儲方案