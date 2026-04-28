import type { Account, StockRecord } from '../types';
import { logger } from '../utils/logger';

export interface BackupData {
  version: string;
  timestamp: string;
  type: 'auto' | 'pre_import' | 'pre_reset' | 'pre_sync' | 'manual';
  accounts: Account[];
  stocks: StockRecord[];
  metadata: {
    totalAccounts: number;
    totalStocks: number;
    source: string;
  };
}

class BackupService {
  private readonly BACKUP_KEY_PREFIX = 'backup_';
  private readonly MAX_BACKUPS = 10;

  /**
   * 創建備份
   */
  async createBackup(
    accounts: Account[], 
    stocks: StockRecord[], 
    type: BackupData['type'] = 'manual'
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `${type}_${timestamp}`;
    
    const backupData: BackupData = {
      version: '1.0.1.0059',
      timestamp: new Date().toISOString(),
      type,
      accounts,
      stocks,
      metadata: {
        totalAccounts: accounts.length,
        totalStocks: stocks.length,
        source: 'Stock Portfolio System'
      }
    };

    try {
      // 存儲到 localStorage
      localStorage.setItem(
        `${this.BACKUP_KEY_PREFIX}${backupId}`, 
        JSON.stringify(backupData)
      );

      // 清理舊備份
      this.cleanupOldBackups();

      console.log(`備份已創建: ${backupId}`);
      return backupId;
    } catch (error) {
      logger.error('global', '創建備份失敗', error);
      throw new Error('備份創建失敗');
    }
  }

  /**
   * 獲取所有備份
   */
  getAllBackups(): BackupData[] {
    const backups: BackupData[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.BACKUP_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const backup = JSON.parse(data) as BackupData;
            backups.push(backup);
          }
        } catch (error) {
          logger.warn('global', `解析備份失敗: ${key}`, error);
        }
      }
    }

    // 按時間排序（最新的在前）
    return backups.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * 恢復備份
   */
  restoreBackup(backupId: string): BackupData | null {
    try {
      const data = localStorage.getItem(`${this.BACKUP_KEY_PREFIX}${backupId}`);
      if (!data) {
        throw new Error('備份不存在');
      }

      const backup = JSON.parse(data) as BackupData;
      
      // 驗證備份完整性
      if (!backup.accounts || !backup.stocks) {
        throw new Error('備份資料不完整');
      }

      return backup;
    } catch (error) {
      logger.error('global', '恢復備份失敗', error);
      return null;
    }
  }

  /**
   * 刪除備份
   */
  deleteBackup(backupId: string): boolean {
    try {
      localStorage.removeItem(`${this.BACKUP_KEY_PREFIX}${backupId}`);
      return true;
    } catch (error) {
      logger.warn('global', '刪除備份失敗', error);
      return false;
    }
  }

  /**
   * 清理舊備份
   */
  private cleanupOldBackups(): void {
    const backups = this.getAllBackups();
    
    if (backups.length > this.MAX_BACKUPS) {
      const toDelete = backups.slice(this.MAX_BACKUPS);
      toDelete.forEach(backup => {
        const backupId = `${backup.type}_${backup.timestamp.replace(/[:.]/g, '-')}`;
        this.deleteBackup(backupId);
      });
    }
  }

  /**
   * 檢查是否有最近的備份
   */
  hasRecentBackup(minutes: number = 30): boolean {
    const backups = this.getAllBackups();
    if (backups.length === 0) return false;

    const latestBackup = backups[0];
    const backupTime = new Date(latestBackup.timestamp).getTime();
    const now = Date.now();
    const diffMinutes = (now - backupTime) / (1000 * 60);

    return diffMinutes <= minutes;
  }

  /**
   * 獲取備份統計
   */
  getBackupStats() {
    const backups = this.getAllBackups();
    const stats = {
      total: backups.length,
      auto: backups.filter(b => b.type === 'auto').length,
      manual: backups.filter(b => b.type === 'manual').length,
      preOperation: backups.filter(b => b.type.startsWith('pre_')).length,
      latest: backups[0]?.timestamp || null,
      oldestDays: backups.length > 0 ? 
        Math.floor((Date.now() - new Date(backups[backups.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24)) : 0
    };
    
    return stats;
  }
}

export default new BackupService();