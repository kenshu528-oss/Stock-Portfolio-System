// GitHub Gist 服務 - 獨立的雲端同步實作
export interface GistConfig {
  token: string;
  gistId?: string;
  description?: string;
}

export interface GistFile {
  filename: string;
  content: string;
}

export interface GistResponse {
  id: string;
  html_url: string;
  files: Record<string, any>;
  created_at: string;
  updated_at: string;
  description: string;
}

class GitHubGistService {
  private baseUrl = 'https://api.github.com';
  
  /**
   * 創建或更新 Gist
   */
  async uploadToGist(config: GistConfig, data: any): Promise<GistResponse> {
    const { token, gistId, description = 'Stock Portfolio System Data' } = config;
    
    if (!token) {
      throw new Error('GitHub Token 未設定');
    }

    const gistData = {
      description,
      public: false, // 私人 Gist
      files: {
        'portfolio-data.json': {
          content: JSON.stringify(data, null, 2)
        },
        'metadata.json': {
          content: JSON.stringify({
            version: data.version || '1.0.2.0109',
            lastUpdated: new Date().toISOString(),
            source: 'Stock Portfolio System',
            accounts: data.accounts?.length || 0,
            stocks: data.stocks?.length || 0
          }, null, 2)
        }
      }
    };

    const url = gistId 
      ? `${this.baseUrl}/gists/${gistId}` 
      : `${this.baseUrl}/gists`;
    
    const method = gistId ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API 錯誤 (${response.status}): ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Gist 上傳成功:', result.html_url);
      
      return result;
    } catch (error) {
      console.error('Gist 上傳失敗:', error);
      throw error;
    }
  }

  /**
   * 從 Gist 下載資料
   */
  async downloadFromGist(config: GistConfig): Promise<any> {
    const { token, gistId } = config;
    
    if (!token) {
      throw new Error('GitHub Token 未設定');
    }
    
    if (!gistId) {
      throw new Error('Gist ID 未設定');
    }

    try {
      const response = await fetch(`${this.baseUrl}/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API 錯誤 (${response.status}): ${errorData.message || response.statusText}`);
      }

      const gist = await response.json();
      
      // 獲取主要資料檔案
      const dataFile = gist.files['portfolio-data.json'];
      if (!dataFile) {
        throw new Error('Gist 中找不到投資組合資料檔案');
      }

      const data = JSON.parse(dataFile.content);
      console.log('Gist 下載成功:', gist.html_url);
      
      return {
        ...data,
        gistInfo: {
          id: gist.id,
          url: gist.html_url,
          updated_at: gist.updated_at
        }
      };
    } catch (error) {
      console.error('Gist 下載失敗:', error);
      throw error;
    }
  }

  /**
   * 列出用戶的所有 Gists
   */
  async listGists(token: string): Promise<GistResponse[]> {
    if (!token) {
      throw new Error('GitHub Token 未設定');
    }

    try {
      const response = await fetch(`${this.baseUrl}/gists`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API 錯誤 (${response.status}): ${errorData.message || response.statusText}`);
      }

      const gists = await response.json();
      
      // 過濾出投資組合相關的 Gists
      return gists.filter((gist: any) => 
        gist.description?.includes('Stock Portfolio') ||
        gist.files['portfolio-data.json']
      );
    } catch (error) {
      console.error('獲取 Gists 列表失敗:', error);
      throw error;
    }
  }

  /**
   * 自動下載投資組合資料
   */
  async downloadData(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // 先獲取用戶的 Gists 列表
      const gists = await this.listGists(token);
      
      if (gists.length === 0) {
        return { success: false, error: '沒有找到投資組合資料' };
      }
      
      // 使用第一個找到的投資組合 Gist
      const gist = gists[0];
      
      // 下載資料
      const data = await this.downloadFromGist({
        token,
        gistId: gist.id
      });
      
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '下載失敗' 
      };
    }
  }

  /**
   * 測試 GitHub Token 有效性
   */
  async testToken(token: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    if (!token) {
      return { valid: false, error: 'Token 未提供' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          valid: false, 
          error: `Token 無效 (${response.status}): ${errorData.message || response.statusText}` 
        };
      }

      const user = await response.json();
      return { valid: true, user };
    } catch (error) {
      return { 
        valid: false, 
        error: `網路錯誤: ${error instanceof Error ? error.message : '未知錯誤'}` 
      };
    }
  }
}

export default new GitHubGistService();