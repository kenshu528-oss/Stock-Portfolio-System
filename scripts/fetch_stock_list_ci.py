#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GitHub Actions 用股票清單抓取腳本
直接呼叫 FinMind REST API，不依賴 FinMind Python 套件
"""

import requests
import json
import os
import sys
from datetime import datetime


def main():
    token = os.environ.get('FINMIND_TOKEN', '')
    today = datetime.now().strftime('%Y-%m-%d')

    print(f"[INFO] 開始透過 FinMind REST API 抓取股票清單...")
    print(f"[INFO] 日期: {today}")
    print(f"[INFO] Token 長度: {len(token)} 字元")

    if not token:
        print("[ERROR] 找不到 FINMIND_TOKEN 環境變數")
        sys.exit(1)

    url = "https://api.finmindtrade.com/api/v4/data"
    params = {
        "dataset": "TaiwanStockInfo",
        "token": token
    }

    try:
        print("[INFO] 正在呼叫 FinMind API...")
        response = requests.get(url, params=params, timeout=60)
        response.raise_for_status()
        data = response.json()

        if data.get('msg') != 'success' or not data.get('data'):
            print(f"[ERROR] API 返回錯誤: {data.get('msg', '未知錯誤')}")
            print(f"[ERROR] 狀態碼: {data.get('status', 'N/A')}")
            sys.exit(1)

        records = data['data']
        print(f"[OK] 成功取得 {len(records)} 筆股票資料")

        stocks = {}
        for item in records:
            stock_id = item.get('stock_id', '')
            if stock_id:
                stocks[stock_id] = {
                    'name': item.get('stock_name', ''),
                    'industry': item.get('industry_category', ''),
                    'market': '台股'
                }

        stock_list_data = {
            'date': today,
            'timestamp': datetime.now().isoformat(),
            'count': len(stocks),
            'stocks': stocks
        }

        os.makedirs('public', exist_ok=True)

        # 寫入主要檔案
        with open('public/stock_list.json', 'w', encoding='utf-8') as f:
            json.dump(stock_list_data, f, ensure_ascii=False, indent=2)

        # 寫入帶日期的備份檔案
        dated_file = f'public/stock_list_{today}.json'
        with open(dated_file, 'w', encoding='utf-8') as f:
            json.dump(stock_list_data, f, ensure_ascii=False, indent=2)

        print(f"[OK] 已儲存 public/stock_list.json（{len(stocks)} 支股票）")
        print(f"[OK] 已儲存 {dated_file}")

    except requests.exceptions.RequestException as e:
        print(f"[ERROR] HTTP 請求失敗: {e}")
        sys.exit(1)
    except Exception as e:
        import traceback
        print(f"[ERROR] 發生錯誤: {e}")
        print(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    main()
