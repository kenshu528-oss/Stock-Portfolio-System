import { getEnvironmentInfo } from './environment';

// Auto-fill configuration
export const AUTO_FILL_CONFIG = {
  REQUIRED_CLICKS: 5,
  CLICK_TIMEOUT: 2000, // Reset counter after 2 seconds
  DEV_TOKEN: (() => {
    // 嘗試從環境變數讀取，如果失敗則使用佔位符
    try {
      return import.meta.env?.VITE_DEV_TOKEN || 'ghp_PLACEHOLDER_TOKEN_FOR_DEVELOPMENT';
    } catch (e) {
      // 如果 import.meta.env 不可用，直接返回佔位符
      return 'ghp_PLACEHOLDER_TOKEN_FOR_DEVELOPMENT';
    }
  })(),
  PRODUCTION_DISABLED: true,
  MAX_ATTEMPTS_PER_SESSION: 3, // Maximum auto-fill attempts per session
  SESSION_TIMEOUT: 300000 // 5 minutes session timeout
};

// Click tracker interface
export interface ClickTracker {
  count: number;
  lastClickTime: number;
  isActive: boolean;
  sessionAttempts: number;
  sessionStartTime: number;
}

// Auto-fill security manager
export class AutoFillSecurityManager {
  private static instance: AutoFillSecurityManager;
  private clickTracker: ClickTracker;
  private isEnabled: boolean;

  private constructor() {
    this.clickTracker = this.initializeClickTracker();
    this.isEnabled = this.checkEnvironmentSecurity();
  }

  public static getInstance(): AutoFillSecurityManager {
    if (!AutoFillSecurityManager.instance) {
      AutoFillSecurityManager.instance = new AutoFillSecurityManager();
    }
    return AutoFillSecurityManager.instance;
  }

  // For testing purposes - reset the singleton instance
  public static resetInstance(): void {
    AutoFillSecurityManager.instance = null as any;
  }

  // Re-check environment security (for testing)
  public recheckEnvironment(): void {
    this.isEnabled = this.checkEnvironmentSecurity();
  }

  private initializeClickTracker(): ClickTracker {
    return {
      count: 0,
      lastClickTime: 0,
      isActive: false,
      sessionAttempts: 0,
      sessionStartTime: Date.now()
    };
  }

  private checkEnvironmentSecurity(): boolean {
    const env = getEnvironmentInfo();
    
    // Disable in production environments
    if (AUTO_FILL_CONFIG.PRODUCTION_DISABLED && env.isProduction) {
      console.log('🔒 Auto-fill disabled in production environment');
      return false;
    }

    // Additional security checks
    if (env.isGitHubPages) {
      console.log('🔒 Auto-fill disabled on GitHub Pages');
      return false;
    }

    // Only enable in local development
    if (!env.isLocalDevelopment) {
      console.log('🔒 Auto-fill only available in local development');
      return false;
    }

    console.log('🔧 Auto-fill enabled in development environment');
    return true;
  }

  public isAutoFillEnabled(): boolean {
    return this.isEnabled;
  }

  public handleClick(): { shouldTrigger: boolean; remainingClicks: number; error?: string } {
    if (!this.isEnabled) {
      return { 
        shouldTrigger: false, 
        remainingClicks: AUTO_FILL_CONFIG.REQUIRED_CLICKS,
        error: 'Auto-fill is disabled in this environment'
      };
    }

    const now = Date.now();
    
    // Check session timeout
    if (now - this.clickTracker.sessionStartTime > AUTO_FILL_CONFIG.SESSION_TIMEOUT) {
      this.resetSession();
    }

    // Check session attempt limit
    if (this.clickTracker.sessionAttempts >= AUTO_FILL_CONFIG.MAX_ATTEMPTS_PER_SESSION) {
      return {
        shouldTrigger: false,
        remainingClicks: AUTO_FILL_CONFIG.REQUIRED_CLICKS,
        error: 'Maximum auto-fill attempts reached for this session'
      };
    }

    // Check click timeout
    const timeSinceLastClick = now - this.clickTracker.lastClickTime;
    if (timeSinceLastClick > AUTO_FILL_CONFIG.CLICK_TIMEOUT) {
      this.clickTracker.count = 1;
      this.clickTracker.lastClickTime = now;
      this.clickTracker.isActive = true;
      return { 
        shouldTrigger: false, 
        remainingClicks: AUTO_FILL_CONFIG.REQUIRED_CLICKS - 1 
      };
    }

    // Increment counter
    this.clickTracker.count++;
    this.clickTracker.lastClickTime = now;

    const remainingClicks = AUTO_FILL_CONFIG.REQUIRED_CLICKS - this.clickTracker.count;

    if (this.clickTracker.count >= AUTO_FILL_CONFIG.REQUIRED_CLICKS) {
      // Trigger auto-fill
      this.clickTracker.sessionAttempts++;
      this.resetClickCounter();
      return { shouldTrigger: true, remainingClicks: 0 };
    }

    return { shouldTrigger: false, remainingClicks };
  }

  public validateToken(token: string): { isValid: boolean; error?: string } {
    if (!token) {
      return { isValid: false, error: 'Token is empty' };
    }

    // Basic GitHub token format validation
    if (!token.startsWith('github_pat_') && !token.startsWith('ghp_')) {
      return { isValid: false, error: 'Invalid GitHub token format' };
    }

    // Check token length (GitHub tokens are typically 40+ characters)
    if (token.length < 20) {
      return { isValid: false, error: 'Token appears to be too short' };
    }

    return { isValid: true };
  }

  public resetClickCounter(): void {
    this.clickTracker.count = 0;
    this.clickTracker.isActive = false;
  }

  public resetSession(): void {
    this.clickTracker = this.initializeClickTracker();
  }

  public getClickTracker(): ClickTracker {
    return { ...this.clickTracker };
  }

  public getSecurityStatus(): {
    isEnabled: boolean;
    environment: string;
    sessionAttempts: number;
    maxAttempts: number;
    timeRemaining: number;
  } {
    const env = getEnvironmentInfo();
    const timeRemaining = Math.max(0, 
      AUTO_FILL_CONFIG.SESSION_TIMEOUT - (Date.now() - this.clickTracker.sessionStartTime)
    );

    return {
      isEnabled: this.isEnabled,
      environment: env.isLocalDevelopment ? 'development' : 'production',
      sessionAttempts: this.clickTracker.sessionAttempts,
      maxAttempts: AUTO_FILL_CONFIG.MAX_ATTEMPTS_PER_SESSION,
      timeRemaining
    };
  }
}

// Export singleton instance
export const autoFillSecurity = AutoFillSecurityManager.getInstance();

// Utility functions for React components
export const useAutoFillSecurity = () => {
  // Always get the current instance to handle resets
  const currentInstance = AutoFillSecurityManager.getInstance();
  
  return {
    isEnabled: currentInstance.isAutoFillEnabled(),
    handleClick: currentInstance.handleClick.bind(currentInstance),
    validateToken: currentInstance.validateToken.bind(currentInstance),
    getClickTracker: currentInstance.getClickTracker.bind(currentInstance),
    getSecurityStatus: currentInstance.getSecurityStatus.bind(currentInstance),
    resetSession: currentInstance.resetSession.bind(currentInstance),
    recheckEnvironment: currentInstance.recheckEnvironment.bind(currentInstance)
  };
};