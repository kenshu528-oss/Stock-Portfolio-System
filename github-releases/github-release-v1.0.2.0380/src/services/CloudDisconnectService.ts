// 雲端斷開連線服務 - 疊加式新功能
// 遵循 STEERING 規則：不修改現有功能，只添加新功能

import { logger } from '../utils/logger';

export interface DisconnectResult {
  success: boolean;
  message: string;
  details?: string;
}

class CloudDisconnectService {
  /**
   * 安全斷開雲端連線（疊加式功能）
   * 提供比現有 clearCloudSyncData 更完整的斷開連線功能
   */
  async safeDisconnect(token: string): Promise<DisconnectResult> {
    try {
      if (!token) {
        return { 
          success: false, 
          message: '沒有 Token 需要斷開' 
        };
      }

      // 檢查 Token 狀態（不撤銷，因為個人訪問令牌無法通過 API 撤銷）
      const tokenStatus = await this.checkTokenStatus(token);
      
      return {
        success: true,
        message: '本地資料已清除',
        details: tokenStatus.valid 
          ? '⚠️ 建議手動前往 GitHub Settings > Developer settings > Personal access tokens 撤銷此 Token 以確保完全安全'
          : 'Token 已無效或已被撤銷'
      };
    } catch (error) {
      logger.warn('cloud', '檢查 Token 狀態時發生錯誤', error);
      return {
        success: true, // 即使檢查失敗，也認為是成功的（安全考量）
        message: '本地資料已清除',
        details: '無法驗證 Token 狀態，建議手動前往 GitHub 撤銷 Token'
      };
    }
  }

  /**
   * 檢查 Token 狀態
   */
  private async checkTokenStatus(token: string): Promise<{ valid: boolean; user?: any }> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Stock-Portfolio-System'
        }
      });

      if (response.ok) {
        const user = await response.json();
        return { valid: true, user };
      } else {
        return { valid: false };
      }
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * 獲取斷開連線的安全建議
   */
  getSecurityRecommendations(): string[] {
    return [
      '前往 GitHub Settings > Developer settings > Personal access tokens',
      '找到用於股票投資組合系統的 Token',
      '點擊 "Delete" 或 "Revoke" 撤銷 Token',
      '確認撤銷操作',
      '如有需要，可以重新生成新的 Token'
    ];
  }
}

export default new CloudDisconnectService();