#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
股票清單抓取腳本
每日執行一次，從 FinMind 抓取全台股清單並存入 JSON 檔案
"""

import json
import os
import sys
from datetime import datetime
from FinMind.data import DataLoader

# --- 設定區 ---
# FinMind Token - 優先從環境變數讀取，本地開發時使用硬編碼
MY_TOKEN = os.environ.get('FINMIND_TOKEN', "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkYXRlIjoiMjAyNi0wMS0xNCAxNTowNjowNyIsInVzZXJfaWQiOiJrZW5zaHU1MjgiLCJlbWFpbCI6ImtlbnNodTUyOEBnbWFpbC5jb20iLCJpcCI6IjYxLjIxOC4xMTMuMTk0In0.RW-Bs2QVZzGOn_oHXPSV0pJsvo_WryHaLuHO8Z8pJ4k")

if not MY_TOKEN:
    print("找不到 FINMIND_TOKEN，請設定環境變數或檢查腳本設定")
    sys.exit(1)

def get_today_filename():
    """獲取今日的檔案名稱"""
    today = datetime.now().strftime('%Y-%m-%d')
    # 確保檔案創建在專案根目錄
    root_dir = os.path.dirname(os.path.abspath(__file__))  # backend 目錄
    parent_dir = os.path.dirname(root_dir)  # 專案根目錄
    return os.path.join(parent_dir, f'stock_list_{today}.json')

def check_today_file_exists():
    """檢查今日的股票清單檔案是否已存在"""
    filename = get_today_filename()
    exists = os.path.exists(filename)
    print(f"檢查檔案 {filename}: {'存在' if exists else '不存在'}")
    return exists

def fetch_stock_list():
    """從 FinMind 抓取股票清單"""
    try:
        print("正在從 FinMind 下載全台股清單...")
        
        # 1. 初始化 FinMind
        api = DataLoader()
        
        # 2. 設定 Token（新版本用法）
        api.login_by_token(api_token=MY_TOKEN)
        
        # 3. 取得全台灣股票資訊
        df = api.taiwan_stock_info()
        
        if df.empty:
            print("抓取失敗，資料為空")
            return False
        
        # 4. 建立股票資料結構
        stock_data = {
            'date': datetime.now().strftime('%Y-%m-%d'),
            'timestamp': datetime.now().isoformat(),
            'count': len(df),
            'stocks': {}
        }
        
        # 5. 轉換為字典格式 { "代號": {"name": "中文名稱", "industry": "產業別"} }
        for _, row in df.iterrows():
            stock_data['stocks'][row['stock_id']] = {
                'name': row['stock_name'],
                'industry': row.get('industry_category', ''),
                'market': '台股'
            }
        
        # 6. 儲存為 JSON 檔案
        filename = get_today_filename()
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(stock_data, f, ensure_ascii=False, indent=2)
        
        print(f"下載成功！總共抓取 {len(df)} 支標的。")
        print(f"檔案已存為: {filename}")
        
        # 7. 預覽前 5 筆資料
        print("\n資料預覽：")
        for i, (stock_id, stock_info) in enumerate(stock_data['stocks'].items()):
            if i >= 5:
                break
            print(f"  {stock_id}: {stock_info['name']} ({stock_info['industry']})")
        
        # 8. 清理舊檔案（保留最近 7 天）
        cleanup_old_files()
        
        return True
        
    except Exception as e:
        print(f"抓取失敗: {str(e)}")
        return False

def cleanup_old_files():
    """清理 7 天前的舊檔案"""
    try:
        import glob
        from datetime import datetime, timedelta
        
        # 獲取 7 天前的日期
        seven_days_ago = datetime.now() - timedelta(days=7)
        
        # 找到所有股票清單檔案
        pattern = 'stock_list_*.json'
        files = glob.glob(pattern)
        
        for file in files:
            try:
                # 從檔名提取日期
                date_str = file.replace('stock_list_', '').replace('.json', '')
                file_date = datetime.strptime(date_str, '%Y-%m-%d')
                
                # 如果檔案超過 7 天，刪除它
                if file_date < seven_days_ago:
                    os.remove(file)
                    print(f"清理舊檔案: {file}")
                    
            except (ValueError, OSError) as e:
                print(f"清理檔案失敗 {file}: {e}")
                
    except Exception as e:
        print(f"清理舊檔案時發生錯誤: {e}")

def main():
    """主函數"""
    import sys
    
    print("=" * 50)
    print("股票清單抓取工具")
    print("=" * 50)
    
    # 檢查是否有強制更新參數
    force_update = len(sys.argv) > 1 and sys.argv[1] == '--force'
    
    # 檢查今日檔案是否已存在
    if check_today_file_exists() and not force_update:
        filename = get_today_filename()
        print(f"今日股票清單已存在: {filename}")
        print("如需重新抓取，請刪除該檔案後重新執行")
        return True
    
    if force_update:
        print("強制更新模式：重新下載股票清單")
    
    # 抓取股票清單
    success = fetch_stock_list()
    
    if success:
        print("\n股票清單抓取完成！")
        print("建議設定每日自動執行此腳本")
    else:
        print("\n股票清單抓取失敗！")
        print("請檢查網路連線和 FinMind Token")
        sys.exit(1)

if __name__ == "__main__":
    main()