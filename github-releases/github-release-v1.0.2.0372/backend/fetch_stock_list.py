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
# FinMind Token - 從環境變數讀取
MY_TOKEN = os.environ.get('FINMIND_TOKEN', '')

# 檢查 Token 來源並記錄
if os.environ.get('FINMIND_TOKEN'):
    print("[OK] 使用環境變數中的 FINMIND_TOKEN")
    print(f"[INFO] Token 長度: {len(MY_TOKEN)} 字元")
else:
    print("[ERROR] 找不到 FINMIND_TOKEN 環境變數")
    print("[INFO] 請在環境變數中設定 FINMIND_TOKEN")

if not MY_TOKEN:
    print("[ERROR] 找不到 FINMIND_TOKEN，請設定環境變數")
    sys.exit(1)

def get_today_filename():
    """獲取統一的股票清單檔案名稱"""
    # 統一使用 public/stock_list.json，本機端和雲端共用
    root_dir = os.path.dirname(os.path.abspath(__file__))  # backend 目錄
    parent_dir = os.path.dirname(root_dir)  # 專案根目錄
    return os.path.join(parent_dir, 'public', 'stock_list.json')

def check_today_file_exists():
    """檢查股票清單檔案是否需要更新"""
    filename = get_today_filename()
    exists = os.path.exists(filename)
    
    if exists:
        # 檢查檔案日期是否為今天
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
                file_date = data.get('date', '')
                today = datetime.now().strftime('%Y-%m-%d')
                
                if file_date == today:
                    print(f"檢查檔案 {filename}: 今日版本已存在")
                    return True
                else:
                    print(f"檢查檔案 {filename}: 存在但非今日版本 ({file_date})")
                    return False
        except:
            print(f"檢查檔案 {filename}: 存在但格式錯誤")
            return False
    else:
        print(f"檢查檔案 {filename}: 不存在")
        return False

def fetch_stock_list():
    """從 FinMind 抓取股票清單"""
    try:
        print("正在從 FinMind 下載全台股清單...")
        
        # 1. 初始化 FinMind
        api = DataLoader()
        
        # 2. 設定 Token（新版本用法）
        print("[INFO] 正在驗證 FinMind Token...")
        api.login_by_token(api_token=MY_TOKEN)
        print("[OK] Token 驗證成功")
        
        # 3. 取得全台灣股票資訊
        print("[INFO] 正在下載股票資訊...")
        df = api.taiwan_stock_info()
        
        if df.empty:
            print("[ERROR] 抓取失敗，資料為空")
            return False
        
        print(f"[OK] 成功下載 {len(df)} 筆股票資料")
        
        # 4. 建立股票資料結構
        stock_data = {
            'date': datetime.now().strftime('%Y-%m-%d'),
            'timestamp': datetime.now().isoformat(),
            'count': len(df),
            'stocks': {}
        }
        
        # 5. 轉換為字典格式 { "代號": {"name": "中文名稱", "industry": "產業別"} }
        print("[INFO] 正在處理股票資料...")
        for _, row in df.iterrows():
            stock_data['stocks'][row['stock_id']] = {
                'name': row['stock_name'],
                'industry': row.get('industry_category', ''),
                'market': '台股'
            }
        
        # 6. 儲存為統一的 JSON 檔案
        filename = get_today_filename()
        print(f"[INFO] 正在儲存統一檔案: {filename}")
        
        # 確保 public 目錄存在
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(stock_data, f, ensure_ascii=False, indent=2)
        
        print(f"[OK] 下載成功！總共抓取 {len(df)} 支標的。")
        print(f"[INFO] 統一檔案已存為: {filename}")
        print(f"[INFO] 本機端和雲端共用此檔案")
        
        # 7. 預覽前 5 筆資料
        print("\n[INFO] 資料預覽：")
        for i, (stock_id, stock_info) in enumerate(stock_data['stocks'].items()):
            if i >= 5:
                break
            print(f"  {stock_id}: {stock_info['name']} ({stock_info['industry']})")
        
        # 8. 清理根目錄的舊檔案
        cleanup_old_files()
        
        return True
        
    except Exception as e:
        print(f"[ERROR] 抓取失敗: {str(e)}")
        print(f"[INFO] 錯誤類型: {type(e).__name__}")
        import traceback
        print(f"[INFO] 詳細錯誤: {traceback.format_exc()}")
        return False

def cleanup_old_files():
    """清理根目錄的舊 stock_list_*.json 檔案"""
    try:
        import glob
        
        # 獲取專案根目錄
        root_dir = os.path.dirname(os.path.abspath(__file__))  # backend 目錄
        parent_dir = os.path.dirname(root_dir)  # 專案根目錄
        
        # 找到根目錄中所有舊的股票清單檔案
        pattern = os.path.join(parent_dir, 'stock_list_*.json')
        files = glob.glob(pattern)
        
        if files:
            print(f"\n[INFO] 清理根目錄舊檔案...")
            for file in files:
                try:
                    os.remove(file)
                    filename = os.path.basename(file)
                    print(f"  清理舊檔案: {filename}")
                except OSError as e:
                    print(f"  清理檔案失敗 {file}: {e}")
            print(f"[OK] 清理完成，現在統一使用 public/stock_list.json")
        else:
            print(f"[INFO] 根目錄無舊檔案需要清理")
                
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
        print(f"今日股票清單已是最新版本: {filename}")
        print("如需重新抓取，請使用 --force 參數")
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