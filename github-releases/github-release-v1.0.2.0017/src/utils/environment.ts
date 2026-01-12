// 環境檢測工具
export const isGitHubPages = (): boolean => {
  return window.location.hostname.includes('github.io');
};

export const isLocalDevelopment = (): boolean => {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

export const isProductionBuild = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const getEnvironmentInfo = () => {
  return {
    isGitHubPages: isGitHubPages(),
    isLocalDevelopment: isLocalDevelopment(),
    isProductionBuild: isProductionBuild(),
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    port: window.location.port
  };
};

export const getCloudSyncAvailability = () => {
  const env = getEnvironmentInfo();
  
  if (env.isLocalDevelopment) {
    return {
      available: true,
      reason: '本機開發環境支援完整雲端同步功能'
    };
  }
  
  if (env.isGitHubPages) {
    return {
      available: false,
      reason: 'GitHub Pages 是靜態託管，無法運行後端服務器處理 GitHub API 請求'
    };
  }
  
  return {
    available: false,
    reason: '當前環境不支援雲端同步功能'
  };
};