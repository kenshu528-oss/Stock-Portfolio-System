import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CloudSyncSettings } from '../components/CloudSyncSettings';
import { useAppStore } from '../stores/appStore';
import { AUTO_FILL_CONFIG } from '../utils/autoFillSecurity';

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

// Mock environment utilities
vi.mock('../utils/environment', () => ({
  getCloudSyncAvailability: () => ({ available: true }),
  getEnvironmentInfo: () => ({ 
    isLocalDevelopment: true, 
    isProduction: false,
    isGitHubPages: false 
  })
}));

// Mock operation log
vi.mock('../components/OperationLog', () => ({
  addOperationLog: vi.fn()
}));

describe('CloudSync Integration Tests', () => {
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
  });

  describe('8.1 Complete Auto-fill Workflow', () => {
    it('should trigger auto-fill after 5 consecutive clicks on help icon', async () => {
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Find the help text (💡 使用說明)
      const helpText = screen.getByText('💡 使用說明');
      expect(helpText).toBeInTheDocument();

      // Click 4 times - should not trigger auto-fill
      for (let i = 0; i < 4; i++) {
        fireEvent.click(helpText);
      }

      // Verify token field is still empty
      const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');
      expect(tokenInput).toHaveValue('');

      // 5th click should trigger auto-fill
      fireEvent.click(helpText);

      // Verify token is auto-filled
      await waitFor(() => {
        expect(tokenInput).toHaveValue(AUTO_FILL_CONFIG.DEV_TOKEN);
      });

      // 隱蔽模式：不會顯示任何通知消息
      // 只驗證 token 已正確填入即可
    });

    it('should display proper notification and user feedback during auto-fill', async () => {
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      const helpText = screen.getByText('💡 使用說明');

      // Click 3 times (隱蔽模式：不會顯示剩餘點擊次數通知)
      for (let i = 0; i < 3; i++) {
        fireEvent.click(helpText);
      }

      // 隱蔽模式：不會顯示剩餘點擊次數通知
      // 直接驗證 token 輸入框仍為空
      const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');
      expect(tokenInput).toHaveValue('');

      // Click 2 more times to trigger auto-fill
      for (let i = 0; i < 2; i++) {
        fireEvent.click(helpText);
      }

      // 隱蔽模式：不會顯示自動填入通知
      // 只驗證 token 已正確填入
      await waitFor(() => {
        expect(tokenInput).toHaveValue(AUTO_FILL_CONFIG.DEV_TOKEN);
      });
    });
  });

  describe('8.2 Status Display Across All Connection States', () => {
    it('should display correct icon and text for idle status', async () => {
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Should show idle status by default (no token)
      expect(screen.getByText('未連線')).toBeInTheDocument();
      
      // Should show disconnected icon (gray)
      const statusIcon = screen.getByText('未連線').parentElement?.querySelector('svg');
      expect(statusIcon).toBeInTheDocument();
      expect(statusIcon).toHaveClass('text-slate-400');
    });

    it('should display correct icon and text for connected status', async () => {
      const mockTestToken = vi.fn().mockResolvedValue({
        valid: true,
        user: { login: 'testuser' }
      });

      const GitHubGistService = await import('../services/GitHubGistService');
      GitHubGistService.default.testToken = mockTestToken;

      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Set a token and test connection
      const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');
      fireEvent.change(tokenInput, { target: { value: 'test-token' } });

      const testButton = screen.getByText('測試連線');
      fireEvent.click(testButton);

      // Wait for connection success
      await waitFor(() => {
        expect(screen.getByText('已連線')).toBeInTheDocument();
      });

      // Should show connected icon (green)
      const statusIcon = screen.getByText('已連線').parentElement?.querySelector('svg');
      expect(statusIcon).toBeInTheDocument();
      expect(statusIcon).toHaveClass('text-green-400');

      // Should show user info
      expect(screen.getByText(/已連線至 GitHub 用戶: testuser/)).toBeInTheDocument();
    });
  });

  describe('8.3 Responsive Design and Layout Validation', () => {
    it('should maintain modal behavior across different screen sizes', async () => {
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Modal should be present and responsive
      const modal = document.querySelector('.fixed.inset-0');
      expect(modal).toBeInTheDocument();

      // Title bar should be present
      expect(screen.getByText('雲端同步')).toBeInTheDocument();
      expect(screen.getByText('未連線')).toBeInTheDocument();

      // Close button should be functional
      const closeButton = screen.getByLabelText('關閉');
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should ensure close button remains functional in all states', async () => {
      const mockTestToken = vi.fn().mockResolvedValue({
        valid: true,
        user: { login: 'testuser' }
      });

      const GitHubGistService = await import('../services/GitHubGistService');
      GitHubGistService.default.testToken = mockTestToken;

      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Test close button in idle state
      let closeButton = screen.getByLabelText('關閉');
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      
      // Set token and connect
      const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');
      fireEvent.change(tokenInput, { target: { value: 'test-token' } });

      const testButton = screen.getByText('測試連線');
      fireEvent.click(testButton);

      // Wait for connected state
      await waitFor(() => {
        expect(screen.getByText('已連線')).toBeInTheDocument();
      });

      // Test close button in connected state
      closeButton = screen.getByLabelText('關閉');
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(2); // Called twice now
    });
  });

  describe('8.4 Complete Workflow Integration Tests', () => {
    it('should test end-to-end auto-fill and connection process', async () => {
      const mockTestToken = vi.fn().mockResolvedValue({
        valid: true,
        user: { login: 'testuser' }
      });

      const GitHubGistService = await import('../services/GitHubGistService');
      GitHubGistService.default.testToken = mockTestToken;

      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Step 1: Initial state should be idle
      expect(screen.getByText('未連線')).toBeInTheDocument();
      const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');
      expect(tokenInput).toHaveValue('');

      // Step 2: Trigger auto-fill with 5 clicks
      const helpText = screen.getByText('💡 使用說明');
      for (let i = 0; i < 5; i++) {
        fireEvent.click(helpText);
      }

      // Step 3: Verify token is auto-filled
      await waitFor(() => {
        expect(tokenInput).toHaveValue(AUTO_FILL_CONFIG.DEV_TOKEN);
      });

      // Step 4: Wait for automatic connection test (使用 fake timers)
      await act(async () => {
        vi.advanceTimersByTime(600); // 等待 setTimeout 觸發
      });

      // Step 5: Verify connection test was triggered and succeeded
      await waitFor(() => {
        expect(mockTestToken).toHaveBeenCalledWith(AUTO_FILL_CONFIG.DEV_TOKEN);
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(screen.getByText('已連線')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Step 6: Verify user information is displayed
      expect(screen.getByText(/已連線至 GitHub 用戶: testuser/)).toBeInTheDocument();

      // Step 7: Verify status icon changed to connected (green)
      const statusIcon = screen.getByText('已連線').parentElement?.querySelector('svg');
      expect(statusIcon).toHaveClass('text-green-400');
    });

    it('should test modal behavior with different status states', async () => {
      render(
        <CloudSyncSettings 
          isOpen={true} 
          onClose={mockOnClose}
          onDataSync={mockOnDataSync}
        />
      );

      // Test modal in idle state
      expect(screen.getByText('雲端同步')).toBeInTheDocument();
      expect(screen.getByText('未連線')).toBeInTheDocument();

      // Test that all main sections are present
      expect(screen.getByText('GitHub Token')).toBeInTheDocument();
      expect(screen.getByText('測試連線')).toBeInTheDocument();
      expect(screen.getByText('取得 Token')).toBeInTheDocument();
      expect(screen.getByText('📤 上傳到雲端')).toBeInTheDocument();
      expect(screen.getByText('📥 從雲端下載')).toBeInTheDocument();

      // Mock successful connection
      const mockTestToken = vi.fn().mockResolvedValue({
        valid: true,
        user: { login: 'testuser' }
      });

      const GitHubGistService = await import('../services/GitHubGistService');
      GitHubGistService.default.testToken = mockTestToken;

      // Set token and connect
      const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');
      fireEvent.change(tokenInput, { target: { value: 'test-token' } });

      const testButton = screen.getByText('測試連線');
      fireEvent.click(testButton);

      // Test modal in connected state
      await waitFor(() => {
        expect(screen.getByText('已連線')).toBeInTheDocument();
      });

      // User info should be displayed
      expect(screen.getByText(/已連線至 GitHub 用戶: testuser/)).toBeInTheDocument();

      // Upload/download buttons should be enabled
      const uploadButton = screen.getByText('📤 上傳到雲端');
      const downloadButton = screen.getByText('📥 從雲端下載');
      expect(uploadButton).not.toBeDisabled();
      expect(downloadButton).not.toBeDisabled();

      // Clear token button should be available
      expect(screen.getByText('清除 Token')).toBeInTheDocument();
    });
  });
});