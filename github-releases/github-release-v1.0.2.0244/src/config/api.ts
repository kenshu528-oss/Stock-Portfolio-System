// API 配置 - 統一管理所有 API 端點

/**
 * 獲取 API 基礎 URL
 * 開發環境：使用 localhost:3001
 * GitHub Pages：使用 Netlify Functions 作為代理
 * Netlify：使用 Netlify Functions
 */
export const getApiBaseUrl = (): string | null => {
  // 檢查是否為 GitHub Pages 環境
  const isGitHubPages = window.location.hostname.includes('github.io') || 
                       window.location.hostname.includes('github.com');
  
  // 🔧 修復：GitHub Pages 環境下使用 Netlify Functions 作為代理
  if (isGitHubPages) {
    return 'https://kenshu528-oss.github.io/Stock-Portfolio-System/.netlify/functions';
  }
  
  // 如果是生產環境（Netlify），使用 Netlify Functions
  if (import.meta.env.PROD) {
    return '/.netlify/functions';
  }
  
  // 開發環境使用環境變數或預設值
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
};

/**
 * 檢查是否應該使用後端代理
 */
export const shouldUseBackendProxy = (): boolean => {
  const baseUrl = getApiBaseUrl();
  return baseUrl !== null && baseUrl !== undefined;
};

/**
 * API 端點配置
 */
export const API_ENDPOINTS = {
  // 股票相關
  getStock: (symbol: string) => {
    const baseUrl = getApiBaseUrl();
    return baseUrl ? `${baseUrl}/api/stock/${encodeURIComponent(symbol)}` : null;
  },
  searchStock: (query: string) => {
    const baseUrl = getApiBaseUrl();
    return baseUrl ? `${baseUrl}/api/stock-search?query=${encodeURIComponent(query)}` : null;
  },
  
  // 股息相關
  getDividend: (symbol: string) => {
    const baseUrl = getApiBaseUrl();
    // 🔧 修復：Netlify Functions 使用查詢參數而非路徑參數
    return baseUrl ? `${baseUrl}/dividend?symbol=${encodeURIComponent(symbol)}` : null;
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
