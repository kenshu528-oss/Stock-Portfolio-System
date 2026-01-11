// 版本號管理常數
export const VERSION = {
  MAJOR: 1,
  MINOR: 0,
  RELEASE: 2, // 第二次GitHub正式發布版本 - 功能完整穩定版
  PATCH: 2, // 功能增強：新增股息自動計算、債券ETF證交稅識別、疊加式安全開發
  
  get FULL() {
    return `${this.MAJOR}.${this.MINOR}.${this.RELEASE}.${this.PATCH.toString().padStart(4, '0')}`;
  },
  
  get DISPLAY() {
    return `v${this.FULL}`;
  },
  
  get SHORT() {
    return `${this.MAJOR}.${this.MINOR}.${this.RELEASE}.${this.PATCH}`;
  }
};

// 版本資訊介面
export interface VersionInfo {
  version: string;        // "1.0.0.0003"
  buildDate: string;      // "2024-01-08"
  commitHash?: string;    // "a1b2c3d"
  environment: string;    // "production" | "development"
}

// 取得完整版本資訊
export function getVersionInfo(): VersionInfo {
  return {
    version: VERSION.FULL,
    buildDate: new Date().toISOString().split('T')[0],
    environment: process.env.NODE_ENV || 'development'
  };
}

// 版本比較函數
export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

// 檢查版本相容性
export function isVersionCompatible(requiredVersion: string, currentVersion: string): boolean {
  const required = requiredVersion.split('.').map(Number);
  const current = currentVersion.split('.').map(Number);
  
  // 主版本號必須相同
  if (required[0] !== current[0]) return false;
  
  // 次版本號不能低於要求
  if (current[1] < required[1]) return false;
  
  return true;
}