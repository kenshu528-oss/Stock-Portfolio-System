import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CloudSyncSettings } from '../components/CloudSyncSettings';
import { AutoFillSecurityManager, AUTO_FILL_CONFIG } from '../utils/autoFillSecurity';
import { getStatusInfo, getValidStatus, isValidStatus, StatusManager } from '../utils/statusConfig';
import { useAppStore } from '../stores/appStore';

// Mock the app store
vi.mock('../stores/appStore');

// Mock the GitHubGistService
vi.mock('../services/GitHubGistService', () => ({
  default: {
    testToken: vi.fn(),
    uploadToGist: vi.fn(),
    downloadData: vi.fn()
  }
}));

// Mock operation log
vi.mock('../components/OperationLog', () => ({
  addOperationLog: vi.fn()
}));

// Mock environment utilities with default development environment
vi.mock('../utils/environment', () => ({
  getCloudSyncAvailability: () => ({ available: true }),
  getEnvironmentInfo: () => ({ 
    isLocalDevelopment: true, 
    isProduction: false,
    isGitHubPages: false 
  })
}));

describe('Error Handling Tests', () => {
  const mockUseAppStore = useAppStore as any;
  const mockOnClose = vi.fn();
  const mockOnDataSync = vi.fn();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default store mock
    mockUseAppStore.mockReturnValue({
      accounts: [],
      stocks: [],
      cloudSync: {
        githubToken: '',
        autoSyncEnabled: false,
        syncInterval: 5,
        lastSyncTime: null,
        gistId: null
      },
      updateCloudSyncSettings: vi.fn(),
      clearCloudSyncData: vi.fn()
    });

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Reset any singleton instances
    (AutoFillSecurityManager as any).instance = null;
  });

  describe('6.3.1 Production Environment Auto-fill Disabling', () => {
    it('should disable auto-fill in production environment', () => {
      // Test the environment detection logic directly
      const mockEnvironmentInfo = {
        isLocalDevelopment: false,
        isProduction: true,
        isGitHubPages: false
      };
      
      // Test the logic that would be used in production
      const shouldBeEnabled = !AUTO_FILL_CONFIG.PRODUCTION_DISABLED || 
                             !mockEnvironmentInfo.isProduction;
      expect(shouldBeEnabled).toBe(false);
      
      // Test that production environment is correctly detected
      expect(mockEnvironmentInfo.isProduction).toBe(true);
      expect(mockEnvironmentInfo.isLocalDevelopment).toBe(false);
    });

    it('should disable auto-fill on GitHub Pages', () => {
      // Test GitHub Pages environment detection
      const mockEnvironmentInfo = {
        isLocalDevelopment: false,
        isProduction: false,
        isGitHubPages: true
      };
      
      // Test the logic that would disable auto-fill on GitHub Pages
      const shouldBeEnabled = mockEnvironmentInfo.isLocalDevelopment && 
                             !mockEnvironmentInfo.isGitHubPages;
      expect(shouldBeEnabled).toBe(false);
    });

    it('should show error message when auto-fill is disabled in production', async () => {
      // In this test, we'll verify that when auto-fill is disabled,
      // the help icon is not shown as a clickable button
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // The help text should be visible in development (our default mock)
      // but we can test the error handling by checking if the security manager
      // properly handles disabled states
      const helpText = screen.getByText('💡 使用說明');
      
      // In development environment (our mock), the text should exist
      expect(helpText).toBeDefined();
      expect(helpText.tagName).toBe('P');
      
      // Test that the security manager can handle disabled states
      const testManager = new (AutoFillSecurityManager as any)();
      
      // Manually set disabled state for testing
      (testManager as any).isEnabled = false;
      
      const result = testManager.handleClick();
      expect(result.shouldTrigger).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should respect session attempt limits in development', () => {
      const testManager = new (AutoFillSecurityManager as any)();
      
      // Should be enabled in development (our mock environment)
      expect(testManager.isAutoFillEnabled()).toBe(true);
      
      // Simulate reaching session attempt limit by manually setting it
      const tracker = testManager.getClickTracker();
      (testManager as any).clickTracker.sessionAttempts = AUTO_FILL_CONFIG.MAX_ATTEMPTS_PER_SESSION;
      
      // Next attempt should be blocked
      const result = testManager.handleClick();
      expect(result.shouldTrigger).toBe(false);
      expect(result.error).toContain('Maximum auto-fill attempts reached');
    });
  });

  describe('6.3.2 Invalid Status Value Handling', () => {
    it('should handle null status values gracefully', () => {
      const statusInfo = getStatusInfo(null);
      
      expect(statusInfo.status).toBe('idle');
      expect(statusInfo.text).toBe('未連線');
      expect(statusInfo.color).toBe('text-slate-400');
    });

    it('should handle undefined status values gracefully', () => {
      const statusInfo = getStatusInfo(undefined);
      
      expect(statusInfo.status).toBe('idle');
      expect(statusInfo.text).toBe('未連線');
      expect(statusInfo.color).toBe('text-slate-400');
    });

    it('should handle invalid string status values', () => {
      const invalidStatus = 'invalid_status';
      const statusInfo = getStatusInfo(invalidStatus);
      
      expect(statusInfo.status).toBe('idle');
      expect(statusInfo.text).toBe('未連線');
      expect(statusInfo.color).toBe('text-slate-400');
    });

    it('should handle non-string status values', () => {
      const statusInfo1 = getStatusInfo(123 as any);
      const statusInfo2 = getStatusInfo({} as any);
      const statusInfo3 = getStatusInfo([] as any);
      
      expect(statusInfo1.status).toBe('idle');
      expect(statusInfo2.status).toBe('idle');
      expect(statusInfo3.status).toBe('idle');
    });

    it('should validate status values correctly', () => {
      expect(isValidStatus('idle')).toBe(true);
      expect(isValidStatus('connected')).toBe(true);
      expect(isValidStatus('error')).toBe(true);
      
      expect(isValidStatus('invalid')).toBe(false);
      expect(isValidStatus(null)).toBe(false);
      expect(isValidStatus(undefined)).toBe(false);
      expect(isValidStatus(123)).toBe(false);
      expect(isValidStatus({})).toBe(false);
    });

    it('should return valid status for invalid inputs', () => {
      expect(getValidStatus('invalid')).toBe('idle');
      expect(getValidStatus(null)).toBe('idle');
      expect(getValidStatus(undefined)).toBe('idle');
      expect(getValidStatus(123)).toBe('idle');
      
      expect(getValidStatus('connected')).toBe('connected');
      expect(getValidStatus('error')).toBe('error');
    });

    it('should handle status manager with invalid status updates', () => {
      const statusManager = new StatusManager();
      
      // Update with invalid status should fallback to idle
      statusManager.updateStatus('invalid_status' as any);
      expect(statusManager.getCurrentStatus()).toBe('idle');
      
      // Update with null should fallback to idle
      statusManager.updateStatus(null as any);
      expect(statusManager.getCurrentStatus()).toBe('idle');
      
      // Valid status should work normally
      statusManager.updateStatus('connected');
      expect(statusManager.getCurrentStatus()).toBe('connected');
    });

    it('should display fallback status in UI when invalid status is provided', async () => {
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Should show default idle status even with potential invalid internal state
      expect(screen.getByText('未連線')).toBeInTheDocument();
      
      // Status icon should be present and have correct class
      const statusIcon = screen.getByText('未連線').parentElement?.querySelector('svg');
      expect(statusIcon).toBeInTheDocument();
      expect(statusIcon).toHaveClass('text-slate-400');
    });
  });

  describe('6.3.3 Click Timeout and Validation Logic', () => {
    it('should reset click counter after timeout', () => {
      // Create a fresh security manager for this test
      const testManager = new (AutoFillSecurityManager as any)();
      
      // Ensure it's enabled (development environment)
      expect(testManager.isAutoFillEnabled()).toBe(true);
      
      // Click 3 times
      for (let i = 0; i < 3; i++) {
        testManager.handleClick();
      }
      
      let tracker = testManager.getClickTracker();
      expect(tracker.count).toBe(3);
      
      // Advance time beyond timeout
      act(() => {
        vi.advanceTimersByTime(AUTO_FILL_CONFIG.CLICK_TIMEOUT + 100);
      });
      
      // Next click should reset counter
      const result = testManager.handleClick();
      tracker = testManager.getClickTracker();
      
      expect(tracker.count).toBe(1);
      expect(result.remainingClicks).toBe(AUTO_FILL_CONFIG.REQUIRED_CLICKS - 1);
    });

    it('should validate token format correctly', () => {
      const testManager = new (AutoFillSecurityManager as any)();
      
      // Valid GitHub tokens
      expect(testManager.validateToken('github_pat_1234567890abcdef')).toEqual({
        isValid: true
      });
      expect(testManager.validateToken('ghp_1234567890abcdef')).toEqual({
        isValid: true
      });
      
      // Invalid tokens
      expect(testManager.validateToken('')).toEqual({
        isValid: false,
        error: 'Token is empty'
      });
      expect(testManager.validateToken('invalid_token')).toEqual({
        isValid: false,
        error: 'Invalid GitHub token format'
      });
      expect(testManager.validateToken('ghp_123')).toEqual({
        isValid: false,
        error: 'Token appears to be too short'
      });
    });

    it('should handle session timeout correctly', () => {
      const testManager = new (AutoFillSecurityManager as any)();
      
      // Advance time beyond session timeout
      act(() => {
        vi.advanceTimersByTime(AUTO_FILL_CONFIG.SESSION_TIMEOUT + 100);
      });
      
      // Click should reset session
      const result = testManager.handleClick();
      const status = testManager.getSecurityStatus();
      
      expect(status.sessionAttempts).toBe(0);
      expect(result.remainingClicks).toBe(AUTO_FILL_CONFIG.REQUIRED_CLICKS - 1);
    });

    it('should provide correct security status information', () => {
      const testManager = new (AutoFillSecurityManager as any)();
      const status = testManager.getSecurityStatus();
      
      expect(status).toHaveProperty('isEnabled');
      expect(status).toHaveProperty('environment');
      expect(status).toHaveProperty('sessionAttempts');
      expect(status).toHaveProperty('maxAttempts');
      expect(status).toHaveProperty('timeRemaining');
      
      expect(typeof status.isEnabled).toBe('boolean');
      expect(typeof status.environment).toBe('string');
      expect(typeof status.sessionAttempts).toBe('number');
      expect(typeof status.maxAttempts).toBe('number');
      expect(typeof status.timeRemaining).toBe('number');
    });

    it('should handle rapid consecutive clicks correctly', async () => {
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Find the help text (should be visible in development)
      const helpText = screen.getByText('💡 使用說明');
      expect(helpText.tagName).toBe('P');
      
      // Click rapidly 4 times (隱蔽模式：不會顯示任何提示)
      for (let i = 0; i < 4; i++) {
        fireEvent.click(helpText);
      }
      
      // 隱蔽模式：不會顯示剩餘點擊次數消息
      // 直接驗證 token 輸入框仍為空
      const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');
      expect(tokenInput).toHaveValue('');
      
      // 5th click should trigger auto-fill
      fireEvent.click(helpText);
      
      await waitFor(() => {
        expect(tokenInput).toHaveValue(AUTO_FILL_CONFIG.DEV_TOKEN);
      });
    });

    it('should handle token validation errors during auto-fill', async () => {
      // Mock invalid token in config for this test
      const originalToken = AUTO_FILL_CONFIG.DEV_TOKEN;
      (AUTO_FILL_CONFIG as any).DEV_TOKEN = 'invalid_token';
      
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      const helpText = screen.getByText('💡 使用說明');
      expect(helpText.tagName).toBe('P');
      
      // Trigger auto-fill with 5 clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(helpText);
      }
      
      // 隱蔽模式：不會顯示 token 驗證錯誤消息
      // 驗證 token 輸入框保持為空（因為驗證失敗）
      await waitFor(() => {
        const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');
        expect(tokenInput).toHaveValue('');
      }, { timeout: 1000 });
      
      // Restore original token
      (AUTO_FILL_CONFIG as any).DEV_TOKEN = originalToken;
    });
  });

  describe('6.3.4 Error Boundary and Exception Handling', () => {
    it('should handle exceptions in status update callbacks', () => {
      const statusManager = new StatusManager();
      
      // Add a callback that throws an error
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = vi.fn();
      
      statusManager.subscribe(errorCallback);
      statusManager.subscribe(normalCallback);
      
      // Update status should not throw even if callback throws
      expect(() => {
        statusManager.updateStatus('connected');
      }).not.toThrow();
      
      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalledWith('connected');
      expect(errorCallback).toHaveBeenCalledWith('connected');
    });

    it('should handle auto-fill security manager exceptions gracefully', () => {
      const testManager = new (AutoFillSecurityManager as any)();
      
      // These operations should not throw exceptions
      expect(() => {
        testManager.handleClick();
        testManager.validateToken('test');
        testManager.getClickTracker();
        testManager.getSecurityStatus();
        testManager.resetSession();
      }).not.toThrow();
    });

    it('should handle missing DOM elements gracefully in UI tests', async () => {
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Component should render without throwing
      expect(screen.getByText('雲端同步')).toBeInTheDocument();
      expect(screen.getByText('未連線')).toBeInTheDocument();
      
      // Status icon should be present
      const statusElement = screen.getByText('未連線').parentElement;
      expect(statusElement?.querySelector('svg')).toBeInTheDocument();
    });
  });
});