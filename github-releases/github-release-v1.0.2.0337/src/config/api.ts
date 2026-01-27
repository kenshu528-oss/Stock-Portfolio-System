// API 配置 - 統一管理所有 API 端點

/**
 * 獲取 API 基礎 URL
 * 開發環境：使用 localhost:3001
 * GitHub Pages：使用 Netlify Functions 作為代理
 * Netlify：使用 Netlify Functions
 */
export const getApiBaseUrl = (): string | null => {
  // 檢查是否為開發環境
  const isDevelopment = !import.meta.env.PROD;
  
  // 開發環境使用本地後端
  if (isDevelopment) {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }
  
  // 生產環境：GitHub Pages 也使用 Netlify Functions
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  if (isGitHubPages) {
    // 🔧 修復：GitHub Pages 使用 Netlify Functions 作為代理
    return 'https://stock-portfolio-system.netlify.app/.netlify/functions';
  }
  
  // 其他生產環境（如 Netlify）使用 Netlify Functions
  return '/.netlify/functions';
};

/**
 * 檢查是否應該使用後端代理
 * 🔧 修正：根據用戶要求，全部使用 Yahoo Finance，不使用後端代理
 */
export const shouldUseBackendProxy = (): boolean => {
  // ❌ 暫時停用後端代理：根據用戶要求全部使用 Yahoo Finance
  // 本機端和雲端環境都直接使用 Yahoo Finance API
  return false;
  
  // 原邏輯保留備用：
  // const isLocalhost = window.location.hostname === 'localhost' || 
  //                    window.location.hostname === '127.0.0.1' ||
  //                    window.location.hostname === '0.0.0.0';
  // return isLocalhost;
};

/**
 * API 端點配置
 */
export const API_ENDPOINTS = {
  // 股票相關
  getStock: (symbol: string) => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return null;
    
    // Netlify Functions 使用不同的路徑結構
    if (baseUrl.includes('netlify')) {
      return `${baseUrl}/stock?symbol=${encodeURIComponent(symbol)}`;
    }
    
    // 本地後端使用原有路徑
    return `${baseUrl}/api/stock/${encodeURIComponent(symbol)}`;
  },
  searchStock: (query: string) => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return null;
    
    // Netlify Functions 使用不同的路徑結構
    if (baseUrl.includes('netlify')) {
      return `${baseUrl}/stock-search?query=${encodeURIComponent(query)}`;
    }
    
    // 本地後端使用原有路徑
    return `${baseUrl}/api/stock-search?query=${encodeURIComponent(query)}`;
  },
  
  // 股息相關
  getDividend: (symbol: string) => {
    const baseUrl = getApiBaseUrl();
    return baseUrl ? `${baseUrl}/api/dividend/${encodeURIComponent(symbol)}` : null;
  },
  
  // 健康檢查
  health: () => {
    const baseUrl = getApiBaseUrl();
    // 如果 baseUrl 為 null（GitHub Pages 環境），返回 null
    if (!baseUrl) {
      return null;
    }
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
