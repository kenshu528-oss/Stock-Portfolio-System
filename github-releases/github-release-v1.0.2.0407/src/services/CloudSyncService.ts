// 雲端同步服務 - GitHub Gist整合
export interface CloudSyncConfig {
  githubToken: string;
  gistId?: string;
  autoSync: boolean;
  syncInterval: number; // 分鐘
}

export interface SyncStatus {
  lastSync: Date | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
}

export interface CloudData {
  version: string;
  timestamp: string;
  accounts: any[];
  settings: any;
}

class CloudSyncService {
  private config: CloudSyncConfig | null = null;
  private status: SyncStatus = {
    lastSync: null,
    status: 'idle',
    message: '尚未設定雲端同步'
  };
  private syncTimer: NodeJS.Timeout | null = null;

  // 初始化雲端同步
  initialize(config: CloudSyncConfig): void {
    this.config = config;
    this.saveConfig();
    
    if (config.autoSync) {
      this.startAutoSync();
    }
  }

  // 設定GitHub Token
  setGitHubToken(token: string): void {
    if (this.config) {
      this.config.githubToken = token;
      this.saveConfig();
    }
  }

  // 啟用/停用自動同步
  setAutoSync(enabled: boolean): void {
    if (this.config) {
      this.config.autoSync = enabled;
      this.saveConfig();
      
      if (enabled) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }
  }

  // 手動上傳到雲端
  async uploadToCloud(data: any): Promise<boolean> {
    if (!this.config?.githubToken) {
      this.updateStatus('error', '請先設定GitHub Token');
      return false;
    }

    this.updateStatus('syncing', '正在上傳到雲端...');

    try {
      const cloudData: CloudData = {
        version: '1.0.1.0059',
        timestamp: new Date().toISOString(),
        accounts: data.accounts || [],
        settings: data.settings || {}
      };

      const gistData = {
        description: 'Stock Portfolio System - 投資組合資料備份',
        public: false,
        files: {
          'portfolio-data.json': {
            content: JSON.stringify(cloudData, null, 2)
          }
        }
      };

      let response;
      if (this.config.gistId) {
        // 更新現有Gist
        response = await fetch(`https://api.github.com/gists/${this.config.gistId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${this.config.githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gistData)
        });
      } else {
        // 建立新Gist
        response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.config.githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gistData)
        });
      }

      if (response.ok) {
        const result = await response.json();
        if (!this.config.gistId) {
          this.config.gistId = result.id;
          this.saveConfig();
        }
        
        this.updateStatus('success', '資料已成功上傳到雲端');
        return true;
      } else {
        const error = await response.json();
        this.updateStatus('error', `上傳失敗: ${error.message}`);
        return false;
      }
    } catch (error) {
      this.updateStatus('error', `網路錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
      return false;
    }
  }

  // 從雲端下載資料
  async downloadFromCloud(): Promise<CloudData | null> {
    if (!this.config?.githubToken || !this.config?.gistId) {
      this.updateStatus('error', '請先設定GitHub Token和Gist ID');
      return null;
    }

    this.updateStatus('syncing', '正在從雲端下載...');

    try {
      const response = await fetch(`https://api.github.com/gists/${this.config.gistId}`, {
        headers: {
          'Authorization': `token ${this.config.githubToken}`,
        }
      });

      if (response.ok) {
        const gist = await response.json();
        const fileContent = gist.files['portfolio-data.json']?.content;
        
        if (fileContent) {
          const cloudData: CloudData = JSON.parse(fileContent);
          this.updateStatus('success', '資料已從雲端下載');
          return cloudData;
        } else {
          this.updateStatus('error', '雲端資料格式錯誤');
          return null;
        }
      } else {
        const error = await response.json();
        this.updateStatus('error', `下載失敗: ${error.message}`);
        return null;
      }
    } catch (error) {
      this.updateStatus('error', `網路錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
      return null;
    }
  }

  // 檢查雲端資料是否存在
  async checkCloudData(): Promise<boolean> {
    if (!this.config?.githubToken || !this.config?.gistId) {
      return false;
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${this.config.gistId}`, {
        headers: {
          'Authorization': `token ${this.config.githubToken}`,
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // 比較本地和雲端資料版本
  async compareVersions(localData: any): Promise<'local_newer' | 'cloud_newer' | 'same' | 'error'> {
    const cloudData = await this.downloadFromCloud();
    if (!cloudData) return 'error';

    const localTimestamp = new Date(localData.timestamp || 0);
    const cloudTimestamp = new Date(cloudData.timestamp);

    if (localTimestamp > cloudTimestamp) return 'local_newer';
    if (cloudTimestamp > localTimestamp) return 'cloud_newer';
    return 'same';
  }

  // 取得同步狀態
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  // 取得配置
  getConfig(): CloudSyncConfig | null {
    return this.config ? { ...this.config } : null;
  }

  // 載入配置
  loadConfig(): void {
    const saved = localStorage.getItem('cloudSyncConfig');
    if (saved) {
      try {
        this.config = JSON.parse(saved);
        if (this.config?.autoSync) {
          this.startAutoSync();
        }
      } catch {
        // 配置損壞，重置
        this.config = null;
      }
    }
  }

  // 儲存配置
  private saveConfig(): void {
    if (this.config) {
      localStorage.setItem('cloudSyncConfig', JSON.stringify(this.config));
    }
  }

  // 更新狀態
  private updateStatus(status: SyncStatus['status'], message: string): void {
    this.status = {
      lastSync: status === 'success' ? new Date() : this.status.lastSync,
      status,
      message
    };
  }

  // 開始自動同步
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    if (this.config?.autoSync && this.config.syncInterval > 0) {
      this.syncTimer = setInterval(() => {
        this.autoSyncData();
      }, this.config.syncInterval * 60 * 1000);
    }
  }

  // 停止自動同步
  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // 自動同步資料
  private async autoSyncData(): Promise<void> {
    try {
      const localData = JSON.parse(localStorage.getItem('portfolioData') || '{}');
      await this.uploadToCloud(localData);
    } catch (error) {
      console.error('自動同步失敗:', error);
    }
  }

  // 清理資源
  destroy(): void {
    this.stopAutoSync();
  }
}

// 單例模式
export const cloudSyncService = new CloudSyncService();

// 初始化時載入配置
cloudSyncService.loadConfig();