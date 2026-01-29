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
 * 
 * 環境機制定義：
 * - 本機端環境 (localhost, 127.0.0.1): 使用後端代理服務 (StockPriceService)
 * - 雲端環境 (GitHub Pages, Netlify): 使用雲端股價服務 (cloudStockPriceService)
 * 
 * @returns {boolean} true: 使用後端代理, false: 使用雲端服務
 */
export const shouldUseBackendProxy = (): boolean => {
  // 本機端檢測：localhost 或 127.0.0.1 或 0.0.0.0
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '0.0.0.0';
  
  if (isLocalhost) {
    // ✅ 本機端：使用後端代理（後端服務器在 3001 端口運行）
    // 優勢：無 CORS 問題，穩定可靠，統一錯誤處理
    return true;
  }
  
  // ❌ 雲端環境：不使用後端代理，使用雲端股價服務
  // 雲端服務：多重代理備援 (AllOrigins, CodeTabs, ThingProxy)
  return false;
};

/**
 * 獲取環境資訊
 * 
 * @returns {object} 環境詳細資訊
 */
export const getEnvironmentInfo = () => {
  const hostname = window.location.hostname;
  const isDevelopment = !import.meta.env.PROD;
  const isLocalhost = hostname === 'localhost' || 
                     hostname === '127.0.0.1' || 
                     hostname === '0.0.0.0';
  const isGitHubPages = hostname.includes('github.io');
  const isNetlify = hostname.includes('netlify.app');
  
  return {
    hostname,
    isDevelopment,
    isLocalhost,
    isGitHubPages,
    isNetlify,
    environment: isLocalhost ? 'local' : 
                isGitHubPages ? 'github-pages' : 
                isNetlify ? 'netlify' : 'unknown',
    useBackendProxy: shouldUseBackendProxy(),
    stockPriceService: shouldUseBackendProxy() ? 'StockPriceService (後端代理)' : 'cloudStockPriceService (雲端多重代理)'
  };
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
