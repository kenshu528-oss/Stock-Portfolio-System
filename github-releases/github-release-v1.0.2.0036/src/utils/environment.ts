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
  
  // GitHub API 支援 CORS，所有環境都可以直接調用
  return {
    available: true,
    reason: env.isLocalDevelopment 
      ? '本機開發環境支援完整雲端同步功能'
      : 'GitHub API 支援 CORS，可直接調用雲端同步功能'
  };
};