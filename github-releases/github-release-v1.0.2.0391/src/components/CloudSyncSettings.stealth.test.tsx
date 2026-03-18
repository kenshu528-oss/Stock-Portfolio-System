import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudSyncSettings } from './CloudSyncSettings';

// Mock dependencies
vi.mock('../stores/appStore', () => ({
  useAppStore: vi.fn(() => ({
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
  }))
}));

vi.mock('./OperationLog', () => ({
  addOperationLog: vi.fn()
}));

vi.mock('../utils/environment', () => ({
  getCloudSyncAvailability: vi.fn(() => ({ available: true })),
  getEnvironmentInfo: vi.fn(() => ({ 
    isProduction: false, 
    isLocalDevelopment: true,
    isGitHubPages: false,
    isProductionBuild: false
  }))
}));

vi.mock('../services/GitHubGistService', () => ({
  default: {
    testToken: vi.fn(),
    uploadToGist: vi.fn(),
    downloadData: vi.fn()
  }
}));

describe('CloudSyncSettings Stealth Auto-fill Tests', () => {
  const mockOnClose = vi.fn();
  const mockOnDataSync = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    
    // Reset the singleton to ensure fresh state
    import('../utils/autoFillSecurity').then(({ AutoFillSecurityManager }) => {
      AutoFillSecurityManager.resetInstance();
    });
  });

  it('should have usage instructions text that can be clicked', () => {
    render(
      <CloudSyncSettings
        isOpen={true}
        onClose={mockOnClose}
        onDataSync={mockOnDataSync}
      />
    );

    // The usage instructions should be present
    const helpText = screen.getByText('💡 使用說明');
    expect(helpText).toBeInTheDocument();
    
    // Should be clickable (no visual indication)
    expect(helpText).toHaveStyle('cursor: default');
  });

  it('should trigger auto-fill after 5 clicks on usage instructions (stealth mode)', async () => {
    // Ensure fresh singleton state
    const { AutoFillSecurityManager } = await import('../utils/autoFillSecurity');
    AutoFillSecurityManager.resetInstance();
    
    render(
      <CloudSyncSettings
        isOpen={true}
        onClose={mockOnClose}
        onDataSync={mockOnDataSync}
      />
    );

    const helpText = screen.getByText('💡 使用說明');
    const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');

    // Verify initial state
    expect(tokenInput).toHaveValue('');

    // Click 5 times to trigger auto-fill (stealth mode - no visual feedback)
    act(() => {
      for (let i = 0; i < 5; i++) {
        fireEvent.click(helpText);
      }
    });

    // Wait for token to be populated
    await waitFor(() => {
      expect(tokenInput).toHaveValue('github_pat_[REDACTED_FOR_SECURITY]');
    }, { timeout: 1000 });
  });

  it('should not show any progress indicators or hints (stealth mode)', () => {
    render(
      <CloudSyncSettings
        isOpen={true}
        onClose={mockOnClose}
        onDataSync={mockOnDataSync}
      />
    );

    const helpText = screen.getByText('💡 使用說明');

    // Click a few times
    act(() => {
      for (let i = 0; i < 3; i++) {
        fireEvent.click(helpText);
      }
    });

    // Should not show any progress indicators
    expect(screen.queryByText(/再點擊.*次啟用自動填入/)).not.toBeInTheDocument();
    expect(screen.queryByText(/開發模式/)).not.toBeInTheDocument();
    expect(screen.queryByText(/連續點擊/)).not.toBeInTheDocument();
  });

  it('should not show any visual changes on hover or click', () => {
    render(
      <CloudSyncSettings
        isOpen={true}
        onClose={mockOnClose}
        onDataSync={mockOnDataSync}
      />
    );

    const helpText = screen.getByText('💡 使用說明');
    
    // Should maintain default cursor
    expect(helpText).toHaveStyle('cursor: default');
    
    // Should not have any hover effects or special styling
    expect(helpText).not.toHaveClass('cursor-pointer');
    expect(helpText).not.toHaveClass('hover:text-blue-300');
  });

  it('should work in production mode (completely hidden)', async () => {
    // Mock production environment
    const environmentModule = await import('../utils/environment');
    const { AutoFillSecurityManager } = await import('../utils/autoFillSecurity');
    
    vi.mocked(environmentModule.getEnvironmentInfo).mockReturnValue({
      isProduction: true,
      isLocalDevelopment: false,
      isGitHubPages: false,
      isProductionBuild: true
    });
    
    AutoFillSecurityManager.resetInstance();

    render(
      <CloudSyncSettings
        isOpen={true}
        onClose={mockOnClose}
        onDataSync={mockOnDataSync}
      />
    );

    const helpText = screen.getByText('💡 使用說明');
    const tokenInput = screen.getByPlaceholderText('請輸入 GitHub Token');

    // Click 5 times - should not work in production
    act(() => {
      for (let i = 0; i < 5; i++) {
        fireEvent.click(helpText);
      }
    });

    // Should not auto-fill in production
    expect(tokenInput).toHaveValue('');
    
    // Should not show any error messages or hints
    expect(screen.queryByText(/生產環境/)).not.toBeInTheDocument();
    expect(screen.queryByText(/已停用/)).not.toBeInTheDocument();
  });
});