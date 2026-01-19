// API 配置 - 統一管理所有 API 端點

/**
 * 獲取 API 基礎 URL
 * 開發環境：使用 localhost:3001
 * GitHub Pages：直接使用外部 API
 * Netlify：使用 Netlify Functions
 */
export const getApiBaseUrl = (): string => {
  // 檢查是否為 GitHub Pages 環境
  const isGitHubPages = window.location.hostname.includes('github.io') || 
                       window.location.hostname.includes('github.com');
  
  // 如果是 GitHub Pages，返回空字串（將直接調用外部 API）
  if (isGitHubPages) {
    return '';
  }
  
  // 如果是生產環境（Netlify），使用 Netlify Functions
  if (import.meta.env.PROD) {
    return '/.netlify/functions';
  }
  
  // 開發環境使用環境變數或預設值
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
};

/**
 * API 端點配置
 */
export const API_ENDPOINTS = {
  // 股票相關
  getStock: (symbol: string) => `${getApiBaseUrl()}/api/stock/${encodeURIComponent(symbol)}`,
  searchStock: (query: string) => `${getApiBaseUrl()}/api/stock-search?query=${encodeURIComponent(query)}`,
  
  // 股息相關
  getDividend: (symbol: string) => `${getApiBaseUrl()}/api/dividend/${encodeURIComponent(symbol)}`,
  
  // 健康檢查
  health: () => {
    const baseUrl = getApiBaseUrl();
    // 如果是 Netlify Functions，返回 health 端點
    if (baseUrl.includes('netlify')) {
      return `${baseUrl}/health`;
    }
    // 如果是本地後端，返回 /health 路徑
    return `${baseUrl}/health`;
  },
};

/**
 * 前端服務器 URL（僅用於開發環境的狀態檢查）
 */
export const getFrontendUrl = (): string => {
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  return import.meta.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
};
