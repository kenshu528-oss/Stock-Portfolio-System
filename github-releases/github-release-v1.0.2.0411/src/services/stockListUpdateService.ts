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
      
      // 檢查股票清單新鮮度
      logger.debug('stock', '檢查股票清單新鮮度開始', { today });

      // 🔧 本機環境優化：直接檢查前端檔案，跳過後端檢查
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
      
      let backendStatus;
      if (isLocalhost) {
        // 本機環境：直接檢查前端檔案，避免 503 錯誤
        logger.debug('stock', '本機環境，跳過後端檢查，直接檢查前端檔案');
        try {
          const stockListData = await stockListService.loadStockList();
          const isToday = stockListData?.date === today;
          backendStatus = { isToday, date: stockListData?.date };
          logger.debug('stock', '前端檔案檢查結果', backendStatus);
        } catch (error) {
          logger.debug('stock', '前端檔案檢查失敗', error);
          backendStatus = { isToday: false };
        }
      } else {
        // 雲端環境：檢查後端
        try {
          logger.debug('stock', '雲端環境，檢查後端');
          backendStatus = await this.checkBackendStockList();
          logger.debug('stock', 'checkBackendStockList 完成', backendStatus);
        } catch (backendError) {
          logger.error('stock', 'checkBackendStockList 失敗', {
            error: backendError instanceof Error ? backendError.message : String(backendError),
            stack: backendError instanceof Error ? backendError.stack : undefined
          });
          backendStatus = { isToday: false };
        }
      }
      
      const needsUpdate = !backendStatus.isToday;
      
      logger.debug('stock', '股票清單檢查結果', {
        backendStatus,
        needsUpdate,
        today
      });
      
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
        today,
        needsUpdate
      });

      return needsUpdate;

    } catch (error) {
      logger.error('stock', '檢查股票清單失敗', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      this.updateStatus.error = error instanceof Error ? error.message : '未知錯誤';
      this.saveUpdateStatus();
      return false; // 🔧 修復：檢查失敗時不強制更新，避免無限循環
    }
  }


  /**
   * 檢查後端股票清單狀態
   */
  private async checkBackendStockList(): Promise<{ isToday: boolean; date?: string }> {
    try {
      const envInfo = stockListService.getEnvironmentInfo();
      
      logger.debug('stock', '檢查後端股票清單狀態', { 
        environment: envInfo.environment,
        isDevelopment: envInfo.isDevelopment 
      });

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

      // 🔧 修復：開發環境直接檢查後端 API
      logger.debug('stock', '開發環境，直接檢查後端 API');
      
      try {
        const backendUrl = 'http://localhost:3001/api/stock-list';
        
        logger.debug('stock', '準備檢查後端 API', { url: backendUrl });
        
        // 🔧 修復：使用兼容性更好的超時處理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 增加到8秒
        
        const response = await fetch(backendUrl, { 
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        logger.debug('stock', '後端 API HEAD 請求回應', { 
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          stockListDateHeader: response.headers.get('X-Stock-List-Date'),
          isTodayHeader: response.headers.get('X-Stock-List-Is-Today')
        });
        
        if (response.ok) {
          const stockListDate = response.headers.get('X-Stock-List-Date');
          const isToday = response.headers.get('X-Stock-List-Is-Today') === 'true';
          const today = new Date().toISOString().split('T')[0];
          
          logger.debug('stock', '後端 API 檢查結果', { 
            stockListDate, 
            today,
            isToday,
            headerIsToday: response.headers.get('X-Stock-List-Is-Today')
          });
          
          return {
            isToday,
            date: stockListDate || undefined
          };
        } else {
          // 503 是正常情況（後端服務未啟動），使用 debug 等級
          if (response.status === 503) {
            logger.debug('stock', '後端服務未啟動，使用前端檔案', { 
              status: response.status,
              statusText: response.statusText 
            });
          } else {
            logger.warn('stock', '後端 API 檢查失敗', { 
              status: response.status,
              statusText: response.statusText 
            });
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          logger.debug('stock', '後端 API 檢查超時（8秒）');
        } else {
          logger.error('stock', '後端 API 檢查失敗 - 詳細錯誤', {
            errorName: error.name,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            errorType: typeof error,
            possibleCauses: [
              '瀏覽器阻擋了對 localhost:3001 的請求',
              'CORS 預檢請求失敗',
              '防火牆或安全軟體阻擋',
              '後端服務實際未運行',
              '網路連接問題'
            ]
          });
        }
      }

      // 🔧 備援：檢查本地檔案（如果後端 API 不可用）
      try {
        logger.debug('stock', '後端 API 不可用，檢查本地檔案');
        
        // 使用更安全的方式調用 stockListService
        const stockListData = await Promise.race([
          stockListService.loadStockList(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('loadStockList timeout')), 10000)
          )
        ]) as any;
        
        if (stockListData && stockListData.date) {
          const today = new Date().toISOString().split('T')[0];
          const isToday = stockListData.date === today;
          
          logger.debug('stock', '本地檔案檢查結果', { 
            fileDate: stockListData.date, 
            today,
            isToday 
          });
          
          return {
            isToday,
            date: stockListData.date
          };
        } else {
          logger.debug('stock', '本地檔案無有效資料');
        }
      } catch (error) {
        logger.debug('stock', '本地檔案檢查失敗', error);
      }

      // 如果所有檢查都失敗，假設需要更新
      logger.warn('stock', '無法檢查股票清單狀態，假設需要更新');
      return { isToday: false };

    } catch (error) {
      logger.error('stock', '檢查股票清單狀態失敗', error);
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
      let backendSuccess;
      try {
        backendSuccess = await this.triggerBackendUpdate();
        logger.debug('stock', 'triggerBackendUpdate 完成', { backendSuccess });
      } catch (backendError) {
        logger.error('stock', 'triggerBackendUpdate 失敗', {
          error: backendError instanceof Error ? backendError.message : String(backendError),
          stack: backendError instanceof Error ? backendError.stack : undefined
        });
        backendSuccess = false;
      }
      
      if (backendSuccess) {
        logger.success('stock', '股票清單背景更新成功');
        this.updateStatus.lastUpdate = new Date().toISOString();
        this.updateStatus.needsUpdate = false;
        
        // 🔧 新增：更新成功後重新檢查狀態
        setTimeout(async () => {
          try {
            await this.checkStockListFreshness();
            logger.debug('stock', '更新後重新檢查股票清單狀態');
          } catch (error) {
            logger.debug('stock', '更新後檢查失敗', error);
          }
        }, 2000);
        
        return true;
      }

      // 2. 如果後端更新失敗，記錄但不打擾用戶
      logger.warn('stock', '背景更新失敗，將在下次檢查時重試');
      
      return false;

    } catch (error) {
      logger.error('stock', '背景更新股票清單失敗', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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

      // 🔧 修復：開發環境直接執行更新腳本
      logger.info('stock', '開發環境檢測到股票清單需要更新，開始自動更新...');

      try {
        // 嘗試調用後端更新 API（如果存在）
        const backendUrl = 'http://localhost:3001/api/update-stock-list';
        
        logger.debug('stock', '準備調用後端更新 API', { url: backendUrl });
        
        // 🔧 修復：使用兼容性更好的超時處理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 增加到45秒
        
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            trigger: 'frontend-auto-check',
            timestamp: new Date().toISOString()
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        logger.debug('stock', '後端 API 回應', { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok 
        });

        if (response.ok) {
          const result = await response.json();
          logger.success('stock', '後端自動更新成功', result);
          return true;
        } else {
          const errorText = await response.text();
          logger.warn('stock', '後端更新 API 回應錯誤', { 
            status: response.status, 
            statusText: response.statusText,
            error: errorText 
          });
          return false;
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          logger.warn('stock', '後端更新 API 超時（45秒），可能 Python 腳本執行時間較長');
        } else {
          logger.error('stock', '後端更新 API 調用失敗', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
        
        // 🔧 修復：API 調用失敗時提供詳細的失敗分析
        logger.error('stock', '後端 API 調用失敗，分析可能原因', {
          backendUrl: 'http://localhost:3001/api/update-stock-list',
          possibleCauses: [
            '網路連接問題',
            'CORS 設定問題', 
            '後端服務未啟動',
            '防火牆阻擋請求'
          ]
        });
        return false;
      }

    } catch (error) {
      logger.error('stock', '觸發更新失敗', error);
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
        const savedStatus = JSON.parse(saved);
        // 🔧 修復：載入時強制重置 isUpdating，防止狀態被永久卡住
        savedStatus.isUpdating = false;
        this.updateStatus = { ...this.updateStatus, ...savedStatus };
        logger.debug('stock', '載入更新狀態成功，已重置 isUpdating', this.updateStatus);
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
    try {
      logger.debug('stock', '開始 checkAndUpdate 流程');
      
      const needsUpdate = await this.checkStockListFreshness();
      logger.debug('stock', 'checkStockListFreshness 完成', { needsUpdate });
      
      if (needsUpdate) {
        logger.info('stock', '檢測到需要更新，開始背景自動更新');
        
        try {
          logger.debug('stock', '準備觸發股票清單更新');
          const success = await this.triggerStockListUpdate();
          logger.debug('stock', 'triggerStockListUpdate 完成', { success });
          
          if (success) {
            logger.success('stock', '股票清單已自動更新完成');
          } else {
            logger.warn('stock', '背景自動更新失敗，將在下次檢查時重試');
            // 添加更詳細的失敗原因日誌
            const updateStatus = this.getUpdateStatus();
            logger.debug('stock', '更新狀態詳情', updateStatus);
          }
        } catch (updateError) {
          logger.error('stock', 'triggerStockListUpdate 發生錯誤', updateError);
          // 不重新拋出錯誤，避免影響應用啟動，只記錄錯誤
        }
      } else {
        logger.info('stock', '股票清單是最新的，無需更新');
      }
      
      logger.debug('stock', 'checkAndUpdate 流程完成');
    } catch (error) {
      logger.error('stock', 'checkAndUpdate 流程發生錯誤', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // 不重新拋出錯誤，避免影響應用啟動
    }
  }
}

// 導出單例
export const stockListUpdateService = new StockListUpdateService();