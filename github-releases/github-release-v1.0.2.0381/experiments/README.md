# 實驗記錄資料夾 (Experiments)

## 📋 目的
記錄各種 API 服務的實驗結果，追蹤穩定性和可用性，為架構決策提供數據支持。

## 📂 資料夾結構
```
experiments/
├── README.md                    # 本文件
├── api-stability/               # API 穩定性測試
│   ├── yahoo-finance-proxies/   # Yahoo Finance 代理服務測試
│   ├── twse-api/               # 證交所 API 測試
│   └── finmind-api/            # FinMind API 測試
├── cors-testing/               # CORS 限制測試
├── performance/                # 性能測試記錄
└── architecture-decisions/     # 架構決策記錄
```

## 🎯 實驗原則
1. **記錄所有測試結果**：成功和失敗都要記錄
2. **包含時間戳**：追蹤問題的時間模式
3. **環境資訊**：本機端 vs 雲端環境
4. **具體錯誤**：完整的錯誤訊息和狀態碼
5. **解決方案**：記錄有效的解決方案

## 📊 當前已知問題
- Yahoo Finance 代理服務不穩定
- 證交所 API 有 CORS 限制
- 需要更可靠的雲端股價獲取方案

## 🔄 更新頻率
每次遇到 API 問題或進行架構調整時都要更新實驗記錄。