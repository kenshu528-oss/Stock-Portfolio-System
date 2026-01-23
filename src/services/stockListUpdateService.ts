// 股票清單自動更新服務
// 在應用啟動時檢查股票清單是否為當天日期，不是則觸發更新

import { logger } from '../utils/logger';

interface UpdateStatus {
  isUpdating: boolean;
  lastCheck: string;
  lastUpdate: string;
  needsUpdate: boolean;
  error?: string;
}

class StockListUpdateService {
  private updateStatus: UpdateStatus = {
    isUpdating: false,
    lastCheck: '',
    lastUpdate: '',
    needsUpdate: false
  };

  private readonly UPDATE_FLAG_KEY = 'stock-list-update-status';
  private readonly CHECK_INTERVAL = 60 * 60 * 1000; // 1小時檢查一次

  /**
   * 檢查股票清單是否需要更新
   */
  async checkStockListFreshness(): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      logger.info('stock', '檢查股票清單新鮮度', { today });

      // 1. 檢查本地是否有今日的股票清單檔案
      const hasLocalFile = await this.checkLocalStockListFile(today);
      
      // 2. 檢查後端是否載入了今日的股票清單
      const backendStatus = await this.checkBackendStockList();
      
      const needsUpdate = !hasLocalFile || !backendStatus.isToday;
      
      this.updateStatus = {
        ...this.updateStatus,
        lastCheck: new Date().toISOString(),
        needsUpdate,
      };

      // 保存檢查狀態到 localStorage
      this.saveUpdateStatus();

      logger.info('stock', '股票清單檢查完成', {
        hasLocalFile,
        backendIsToday: backendStatus.isToday,
        backendDate: backendStatus.date,
        needsUpdate
      });

      return needsUpdate;

    } catch (error) {
      logger.error('stock', '檢查股票清單失敗', error);
      this.updateStatus.error = error instanceof Error ? error.message : '未知錯誤';
      this.saveUpdateStatus();
      return false;
    }
  }

  /**
   * 檢查本地是否有今日的股票清單檔案
   */
  private async checkLocalStockListFile(today: string): Promise<boolean> {
    try {
      // 檢查根目錄是否有今日的股票清單檔案
      const response = await fetch(`/stock_list_${today}.json`, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      logger.debug('stock', '本地股票清單檔案不存在', { today });
      return false;
    }
  }

  /**
   * 檢查後端股票清單狀態
   */
  private async checkBackendStockList(): Promise<{ isToday: boolean; date?: string }> {
    try {
      // 檢查後端是否有可用的股票清單
      const response = await fetch('/api/stock-search?query=test', { method: 'HEAD' });
      
      if (!response.ok) {
        return { isToday: false };
      }

      // 從響應頭獲取股票清單日期（如果後端提供）
      const stockListDate = response.headers.get('X-Stock-List-Date');
      const today = new Date().toISOString().split('T')[0];
      
      return {
        isToday: stockListDate === today,
        date: stockListDate || undefined
      };

    } catch (error) {
      logger.debug('stock', '檢查後端股票清單失敗', error);
      return { isToday: false };
    }
  }

  /**
   * 觸發股票清單更新
   */
  async triggerStockListUpdate(): Promise<boolean> {
    if (this.updateStatus.isUpdating) {
      logger.warn('stock', '股票清單更新已在進行中，跳過重複觸發');
      return false;
    }

    try {
      this.updateStatus.isUpdating = true;
      this.updateStatus.error = undefined;
      this.saveUpdateStatus();

      logger.info('stock', '開始觸發股票清單更新');

      // 1. 嘗試調用後端更新 API
      const backendSuccess = await this.triggerBackendUpdate();
      
      if (backendSuccess) {
        logger.success('stock', '後端股票清單更新成功');
        this.updateStatus.lastUpdate = new Date().toISOString();
        this.updateStatus.needsUpdate = false;
        return true;
      }

      // 2. 如果後端更新失敗，嘗試前端通知用戶手動更新
      logger.warn('stock', '後端更新失敗，提示用戶手動更新');
      this.showUpdateNotification();
      
      return false;

    } catch (error) {
      logger.error('stock', '觸發股票清單更新失敗', error);
      this.updateStatus.error = error instanceof Error ? error.message : '更新失敗';
      return false;
    } finally {
      this.updateStatus.isUpdating = false;
      this.saveUpdateStatus();
    }
  }

  /**
   * 調用後端更新 API
   */
  private async triggerBackendUpdate(): Promise<boolean> {
    try {
      // 檢查是否為本機環境
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';

      if (!isDevelopment) {
        logger.debug('stock', '非本機環境，跳過後端更新');
        return false;
      }

      // 調用後端更新 API（如果存在）
      const response = await fetch('/api/update-stock-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger: 'frontend-auto-check',
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;

    } catch (error) {
      logger.debug('stock', '後端更新 API 不可用', error);
      return false;
    }
  }

  /**
   * 顯示更新通知給用戶
   */
  private showUpdateNotification(): void {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.id = 'stock-list-update-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1e293b;
      color: white;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      max-width: 400px;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 18px;">⚠️</span>
        <strong>股票清單需要更新</strong>
      </div>
      <div style="font-size: 14px; color: #cbd5e1; margin-bottom: 12px;">
        檢測到股票清單不是今日版本，建議更新以獲得最新資料。
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="update-stock-list-btn" style="
          background: #f59e0b;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">立即更新</button>
        <button id="dismiss-notification-btn" style="
          background: transparent;
          color: #94a3b8;
          border: 1px solid #475569;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">稍後提醒</button>
      </div>
    `;

    // 添加到頁面
    document.body.appendChild(notification);

    // 綁定事件
    const updateBtn = document.getElementById('update-stock-list-btn');
    const dismissBtn = document.getElementById('dismiss-notification-btn');

    updateBtn?.addEventListener('click', () => {
      this.openUpdateInstructions();
      this.dismissNotification();
    });

    dismissBtn?.addEventListener('click', () => {
      this.dismissNotification();
    });

    // 10秒後自動消失
    setTimeout(() => {
      this.dismissNotification();
    }, 10000);
  }

  /**
   * 開啟更新說明
   */
  private openUpdateInstructions(): void {
    const instructions = `
股票清單更新方法：

方法1：執行批次檔（推薦）
1. 開啟命令提示字元
2. 執行：cd backend
3. 執行：fetch_stock_list.bat

方法2：直接執行Python
1. 執行：python backend/fetch_stock_list.py

更新完成後請重新載入頁面。
    `;

    alert(instructions);
  }

  /**
   * 關閉通知
   */
  private dismissNotification(): void {
    const notification = document.getElementById('stock-list-update-notification');
    if (notification) {
      notification.remove();
    }
  }

  /**
   * 保存更新狀態到 localStorage
   */
  private saveUpdateStatus(): void {
    try {
      localStorage.setItem(this.UPDATE_FLAG_KEY, JSON.stringify(this.updateStatus));
    } catch (error) {
      logger.debug('stock', '保存更新狀態失敗', error);
    }
  }

  /**
   * 從 localStorage 載入更新狀態
   */
  private loadUpdateStatus(): void {
    try {
      const saved = localStorage.getItem(this.UPDATE_FLAG_KEY);
      if (saved) {
        this.updateStatus = { ...this.updateStatus, ...JSON.parse(saved) };
      }
    } catch (error) {
      logger.debug('stock', '載入更新狀態失敗', error);
    }
  }

  /**
   * 獲取更新狀態
   */
  getUpdateStatus(): UpdateStatus {
    return { ...this.updateStatus };
  }

  /**
   * 初始化服務
   */
  init(): void {
    this.loadUpdateStatus();
    
    // 設定定期檢查
    setInterval(() => {
      this.checkStockListFreshness();
    }, this.CHECK_INTERVAL);

    logger.info('stock', '股票清單更新服務已初始化');
  }

  /**
   * 立即檢查並更新（如果需要）
   */
  async checkAndUpdate(): Promise<void> {
    const needsUpdate = await this.checkStockListFreshness();
    
    if (needsUpdate) {
      logger.info('stock', '檢測到需要更新，開始自動更新流程');
      await this.triggerStockListUpdate();
    } else {
      logger.info('stock', '股票清單是最新的，無需更新');
    }
  }
}

// 導出單例
export const stockListUpdateService = new StockListUpdateService();