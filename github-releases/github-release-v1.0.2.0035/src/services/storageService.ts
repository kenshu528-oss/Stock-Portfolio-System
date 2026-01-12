// 本地儲存服務

import { AppData, UserSettings } from '../types';

// 儲存服務類別
export class StorageService {
  private readonly STORAGE_KEY = 'stock-portfolio-data';
  private readonly SETTINGS_KEY = 'stock-portfolio-settings';

  // 儲存資料到 LocalStorage
  saveToLocal(data: Partial<AppData>): void {
    try {
      const existingData = this.loadFromLocal();
      const mergedData: AppData = {
        accounts: data.accounts || existingData?.accounts || [],
        stocks: data.stocks || existingData?.stocks || [],
        dividends: data.dividends || existingData?.dividends || [],
        settings: data.settings || existingData?.settings || this.getDefaultSettings(),
        lastModified: new Date()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mergedData));
      console.log('資料已儲存到本地儲存');
    } catch (error) {
      console.error('儲存到本地儲存失敗:', error);
      this.handleStorageError(error);
    }
  }

  // 從 LocalStorage 讀取資料
  loadFromLocal(): AppData | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;

      const parsedData = JSON.parse(data);
      
      // 轉換日期字串為 Date 物件
      return this.deserializeData(parsedData);
    } catch (error) {
      console.error('從本地儲存讀取失敗:', error);
      return null;
    }
  }

  // 儲存設定
  saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
      console.log('設定已儲存');
    } catch (error) {
      console.error('儲存設定失敗:', error);
      this.handleStorageError(error);
    }
  }

  // 讀取設定
  loadSettings(): UserSettings {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      if (!data) return this.getDefaultSettings();

      return { ...this.getDefaultSettings(), ...JSON.parse(data) };
    } catch (error) {
      console.error('讀取設定失敗:', error);
      return this.getDefaultSettings();
    }
  }

  // 清除所有資料
  clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.SETTINGS_KEY);
      console.log('所有資料已清除');
    } catch (error) {
      console.error('清除資料失敗:', error);
    }
  }

  // 檢查儲存空間
  checkStorageQuota(): { used: number; available: number; percentage: number } {
    try {
      // 估算已使用的空間
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // LocalStorage 通常限制為 5-10MB，這裡假設 5MB
      const available = 5 * 1024 * 1024; // 5MB in bytes
      const percentage = (used / available) * 100;

      return { used, available, percentage };
    } catch (error) {
      console.error('檢查儲存空間失敗:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  // 匯出資料為 JSON
  exportToJSON(): string {
    const data = this.loadFromLocal();
    return JSON.stringify(data, null, 2);
  }

  // 從 JSON 匯入資料
  importFromJSON(jsonString: string): { success: boolean; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      
      // 驗證資料格式
      if (!this.validateImportData(data)) {
        return { success: false, error: '資料格式不正確' };
      }

      // 儲存匯入的資料
      this.saveToLocal(data);
      return { success: true };
    } catch (error) {
      console.error('匯入資料失敗:', error);
      return { success: false, error: '資料格式錯誤或損壞' };
    }
  }

  // 備份資料
  createBackup(): string {
    const data = this.loadFromLocal();
    const settings = this.loadSettings();
    
    const backup = {
      data,
      settings,
      timestamp: new Date().toISOString(),
      version: '1.0.1.0059'
    };

    return JSON.stringify(backup, null, 2);
  }

  // 還原備份
  restoreBackup(backupString: string): { success: boolean; error?: string } {
    try {
      const backup = JSON.parse(backupString);
      
      if (!backup.data || !backup.settings) {
        return { success: false, error: '備份檔案格式不正確' };
      }

      this.saveToLocal(backup.data);
      this.saveSettings(backup.settings);
      
      return { success: true };
    } catch (error) {
      console.error('還原備份失敗:', error);
      return { success: false, error: '備份檔案損壞或格式錯誤' };
    }
  }

  // 預設設定
  private getDefaultSettings(): UserSettings {
    return {
      privacyMode: true,
      autoRefresh: false,
      refreshInterval: 300, // 5分鐘
      defaultAccount: '帳戶1',
      theme: 'dark'
    };
  }

  // 反序列化資料（轉換日期字串）
  private deserializeData(data: any): AppData {
    return {
      accounts: data.accounts || [],
      stocks: (data.stocks || []).map((stock: any) => ({
        ...stock,
        purchaseDate: new Date(stock.purchaseDate),
        lastUpdated: new Date(stock.lastUpdated)
      })),
      dividends: (data.dividends || []).map((dividend: any) => ({
        ...dividend,
        exDividendDate: new Date(dividend.exDividendDate)
      })),
      settings: data.settings || this.getDefaultSettings(),
      lastModified: new Date(data.lastModified || Date.now())
    };
  }

  // 驗證匯入資料格式
  private validateImportData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    // 檢查必要欄位
    if (!Array.isArray(data.accounts)) return false;
    if (!Array.isArray(data.stocks)) return false;
    if (!Array.isArray(data.dividends)) return false;

    // 驗證帳戶格式
    for (const account of data.accounts) {
      if (!account.id || !account.name) return false;
    }

    // 驗證股票記錄格式
    for (const stock of data.stocks) {
      if (!stock.id || !stock.symbol || !stock.accountId) return false;
    }

    return true;
  }

  // 處理儲存錯誤
  private handleStorageError(error: any): void {
    if (error.name === 'QuotaExceededError') {
      console.warn('儲存空間不足，請清理舊資料或啟用雲端同步');
      // 可以觸發 UI 警告
    } else {
      console.error('儲存操作失敗:', error);
    }
  }
}

// 創建單例實例
export const storageService = new StorageService();