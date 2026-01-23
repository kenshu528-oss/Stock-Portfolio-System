// 股票清單自動更新服務
// 在應用啟動時檢查股票清單是否為當天日期，不是則觸發更新

import { logger } from '../utils/logger';
import { stockListService } from './stockListService';

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

      // 主要檢查後端是否載入了今日的股票清單
      const backendStatus = await this.checkBackendStockList();
      
      const needsUpdate = !backendStatus.isToday;
      
      this.updateStatus = {
        ...this.updateStatus,
        lastCheck: new Date().toISOString(),
        needsUpdate,
      };

      // 保存檢查狀態到 localStorage
      this.saveUpdateStatus();

      logger.info('stock', '股票清單檢查完成', {
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
   * 檢查後端股票清單狀態
   */
  private async checkBackendStockList(): Promise<{ isToday: boolean; date?: string }> {
    try {
      const envInfo = stockListService.getEnvironmentInfo();
      
      if (!envInfo.isDevelopment) {
        // 雲端環境：使用統一的股票清單服務檢查
        logger.debug('stock', '雲端環境，使用統一股票清單服務檢查');
        
        try {
          const stockListData = await stockListService.loadStockList();
          if (stockListData) {
            const today = new Date().toISOString().split('T')[0];
            const isToday = stockListData.date === today;
            
            logger.debug('stock', '統一服務檢查結果', { 
              fileDate: stockListData.date, 
              today,
              isToday 
            });
            
            return {
              isToday,
              date: stockListData.date
            };
          }
        } catch (error) {
          logger.debug('stock', '統一服務檢查失敗', error);
        }
        
        return { isToday: false };
      }

      // 本機環境：檢查後端 API
      const backendUrl = 'http://localhost:3001/api/stock-search?query=test';
      const response = await fetch(backendUrl, { method: 'HEAD' });
      
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
      logger.debug('stock', '檢查股票清單狀態失敗', error);
      return { isToday: false };
    }
  }

  /**
   * 觸發股票清單更新
   */
  async triggerStockListUpdate(): Promise<boolean> {
    if (this.updateStatus.isUpdating) {
      // 在開發環境下，React 嚴格模式會重複執行，降低警告等級
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        logger.debug('stock', '股票清單更新已在進行中，跳過重複觸發（開發模式）');
      } else {
        logger.warn('stock', '股票清單更新已在進行中，跳過重複觸發');
      }
      return false;
    }

    try {
      this.updateStatus.isUpdating = true;
      this.updateStatus.error = undefined;
      this.saveUpdateStatus();

      logger.info('stock', '開始背景自動更新股票清單');

      // 1. 嘗試調用後端更新 API
      const backendSuccess = await this.triggerBackendUpdate();
      
      if (backendSuccess) {
        logger.success('stock', '股票清單背景更新成功');
        this.updateStatus.lastUpdate = new Date().toISOString();
        this.updateStatus.needsUpdate = false;
        return true;
      }

      // 2. 如果後端更新失敗，記錄但不打擾用戶
      logger.warn('stock', '背景更新失敗，將在下次檢查時重試');
      
      return false;

    } catch (error) {
      logger.error('stock', '背景更新股票清單失敗', error);
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
      const envInfo = stockListService.getEnvironmentInfo();

      if (!envInfo.isDevelopment) {
        logger.debug('stock', '雲端環境，股票清單由 GitHub Actions 自動更新，跳過前端觸發');
        return true; // 雲端環境下認為更新成功，因為有 GitHub Actions 負責
      }

      // 調用後端更新 API（如果存在）
      const backendUrl = 'http://localhost:3001/api/update-stock-list';
      const response = await fetch(backendUrl, {
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
    // 🔧 移除用戶通知，改為靜默背景更新
    logger.debug('stock', '跳過用戶通知，採用靜默背景更新模式');
  }

  /**
   * 開啟更新說明
   */
  private openUpdateInstructions(): void {
    // 🔧 移除手動更新指引，改為靜默背景更新
    logger.debug('stock', '跳過手動更新指引，採用靜默背景更新模式');
  }

  /**
   * 關閉通知
   */
  private dismissNotification(): void {
    // 🔧 移除通知關閉邏輯，改為靜默背景更新
    logger.debug('stock', '跳過通知關閉，採用靜默背景更新模式');
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
      logger.info('stock', '檢測到需要更新，開始背景自動更新');
      const success = await this.triggerStockListUpdate();
      
      if (success) {
        logger.success('stock', '股票清單已自動更新完成');
      } else {
        logger.warn('stock', '背景自動更新失敗，將在下次檢查時重試');
      }
    } else {
      logger.info('stock', '股票清單是最新的，無需更新');
    }
  }
}

// 導出單例
export const stockListUpdateService = new StockListUpdateService();