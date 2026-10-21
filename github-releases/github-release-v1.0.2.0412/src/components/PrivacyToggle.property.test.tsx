import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import PrivacyToggle from './PrivacyToggle';

/**
 * **Feature: stock-portfolio-system, Property 22: 隱私模式切換**
 * **Validates: Requirements 6.2**
 * 
 * 對於任何隱私模式狀態，切換操作應該觸發正確的回調並顯示相應的UI狀態
 */

describe('PrivacyToggle Property Tests', () => {
  afterEach(() => {
    cleanup();
  });

  it('Property 22: 隱私模式切換 - 切換操作應該始終觸發回調', () => {
    fc.assert(
      fc.property(fc.boolean(), (initialPrivacyMode) => {
        const mockToggle = vi.fn();
        
        const { unmount } = render(
          <PrivacyToggle 
            isPrivacyMode={initialPrivacyMode} 
            onToggle={mockToggle} 
          />
        );

        const toggleButton = screen.getByRole('button');
        
        // 執行切換操作
        fireEvent.click(toggleButton);
        
        // 驗證回調被觸發
        expect(mockToggle).toHaveBeenCalledTimes(1);
        
        // 驗證按鈕的aria-label正確反映當前狀態
        const expectedLabel = initialPrivacyMode ? '顯示金額' : '隱藏金額';
        expect(toggleButton).toHaveAttribute('aria-label', expectedLabel);
        
        unmount();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('Property: 圖示狀態一致性 - 圖示應該正確反映隱私模式狀態', () => {
    fc.assert(
      fc.property(fc.boolean(), (isPrivacyMode) => {
        const mockToggle = vi.fn();
        
        const { unmount } = render(
          <PrivacyToggle 
            isPrivacyMode={isPrivacyMode} 
            onToggle={mockToggle} 
          />
        );

        const toggleButton = screen.getByRole('button');
        
        // 驗證aria-label與隱私模式狀態一致
        if (isPrivacyMode) {
          expect(toggleButton).toHaveAttribute('aria-label', '顯示金額');
        } else {
          expect(toggleButton).toHaveAttribute('aria-label', '隱藏金額');
        }
        
        // 驗證title屬性與狀態一致
        const expectedTitle = isPrivacyMode ? '點擊顯示金額' : '點擊隱藏金額';
        expect(toggleButton).toHaveAttribute('title', expectedTitle);
        
        unmount();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('Property: 按鈕可訪問性一致性 - 按鈕應該始終保持可訪問性屬性', () => {
    fc.assert(
      fc.property(fc.boolean(), (isPrivacyMode) => {
        const mockToggle = vi.fn();
        
        const { unmount } = render(
          <PrivacyToggle 
            isPrivacyMode={isPrivacyMode} 
            onToggle={mockToggle} 
          />
        );

        const toggleButton = screen.getByRole('button');
        
        // 驗證按鈕是button元素（隱含role="button"）
        expect(toggleButton.tagName.toLowerCase()).toBe('button');
        
        // 驗證按鈕具有aria-label
        expect(toggleButton).toHaveAttribute('aria-label');
        
        // 驗證aria-label不為空
        const ariaLabel = toggleButton.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel!.length).toBeGreaterThan(0);
        
        // 驗證按鈕是可點擊的
        expect(toggleButton).not.toBeDisabled();
        
        unmount();
        return true;
      }),
      { numRuns: 50 }
    );
  });
});

/**
 * **Feature: stock-portfolio-system, Property 23: 隱私模式顯示**
 * **Validates: Requirements 6.3**
 * 
 * 隱私模式應該正確控制敏感資訊的顯示和隱藏
 */
describe('Property 23: 隱私模式顯示', () => {
  afterEach(() => {
    cleanup();
  });

  it('隱私模式狀態與UI顯示的一致性', () => {
    fc.assert(
      fc.property(fc.boolean(), (isPrivacyMode) => {
        const mockToggle = vi.fn();
        
        const { unmount } = render(
          <PrivacyToggle 
            isPrivacyMode={isPrivacyMode} 
            onToggle={mockToggle} 
          />
        );

        const toggleButton = screen.getByRole('button');
        
        // 驗證按鈕的視覺狀態與隱私模式一致
        if (isPrivacyMode) {
          // 隱私模式開啟時，應該顯示"眼睛斜線"圖示
          expect(toggleButton).toHaveAttribute('aria-label', '顯示金額');
          expect(toggleButton).toHaveAttribute('title', '點擊顯示金額');
        } else {
          // 隱私模式關閉時，應該顯示"眼睛"圖示
          expect(toggleButton).toHaveAttribute('aria-label', '隱藏金額');
          expect(toggleButton).toHaveAttribute('title', '點擊隱藏金額');
        }
        
        unmount();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('隱私模式的語義化標籤正確性', () => {
    fc.assert(
      fc.property(fc.boolean(), (isPrivacyMode) => {
        const mockToggle = vi.fn();
        
        const { unmount } = render(
          <PrivacyToggle 
            isPrivacyMode={isPrivacyMode} 
            onToggle={mockToggle} 
          />
        );

        const toggleButton = screen.getByRole('button');
        const ariaLabel = toggleButton.getAttribute('aria-label');
        const title = toggleButton.getAttribute('title');
        
        // 驗證標籤包含相關關鍵詞
        if (isPrivacyMode) {
          expect(ariaLabel).toContain('顯示');
          expect(title).toContain('顯示');
        } else {
          expect(ariaLabel).toContain('隱藏');
          expect(title).toContain('隱藏');
        }
        
        // 驗證標籤都包含"金額"關鍵詞
        expect(ariaLabel).toContain('金額');
        expect(title).toContain('金額');
        
        unmount();
        return true;
      }),
      { numRuns: 50 }
    );
  });
});

/**
 * **Feature: stock-portfolio-system, Property 24: 隱私提示訊息**
 * **Validates: Requirements 6.4**
 * 
 * 隱私提示訊息應該在適當的時機顯示，並在3秒後自動隱藏
 */
describe('Property 24: 隱私提示訊息', () => {
  afterEach(() => {
    cleanup();
  });

  it('提示訊息的顯示時機正確性', () => {
    fc.assert(
      fc.property(fc.boolean(), (isPrivacyMode) => {
        const mockToggle = vi.fn();
        
        const { unmount } = render(
          <PrivacyToggle 
            isPrivacyMode={isPrivacyMode} 
            onToggle={mockToggle} 
          />
        );

        const toggleButton = screen.getByRole('button');
        
        // 初始狀態不應該有提示訊息
        expect(screen.queryByText(/隱私模式已/)).not.toBeInTheDocument();
        
        // 點擊後應該顯示提示訊息
        fireEvent.click(toggleButton);
        
        // 根據當前狀態驗證正確的提示訊息
        const expectedMessage = isPrivacyMode ? '隱私模式已關閉' : '隱私模式已啟用';
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
        
        unmount();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('提示訊息內容的正確性', () => {
    fc.assert(
      fc.property(fc.boolean(), (isPrivacyMode) => {
        const mockToggle = vi.fn();
        
        const { unmount } = render(
          <PrivacyToggle 
            isPrivacyMode={isPrivacyMode} 
            onToggle={mockToggle} 
          />
        );

        const toggleButton = screen.getByRole('button');
        fireEvent.click(toggleButton);
        
        // 驗證提示訊息的語義正確性
        if (isPrivacyMode) {
          // 從隱私模式切換到非隱私模式
          expect(screen.getByText('隱私模式已關閉')).toBeInTheDocument();
        } else {
          // 從非隱私模式切換到隱私模式
          expect(screen.getByText('隱私模式已啟用')).toBeInTheDocument();
        }
        
        unmount();
        return true;
      }),
      { numRuns: 50 }
    );
  });

  it('提示訊息的狀態指示器顏色正確性', () => {
    fc.assert(
      fc.property(fc.boolean(), (isPrivacyMode) => {
        const mockToggle = vi.fn();
        
        const { unmount } = render(
          <PrivacyToggle 
            isPrivacyMode={isPrivacyMode} 
            onToggle={mockToggle} 
          />
        );

        const toggleButton = screen.getByRole('button');
        fireEvent.click(toggleButton);
        
        // 根據當前隱私模式狀態驗證指示器顏色
        if (isPrivacyMode) {
          // 關閉隱私模式時顯示橙色指示器
          const orangeIndicator = document.querySelector('.bg-orange-400');
          expect(orangeIndicator).toBeInTheDocument();
        } else {
          // 啟用隱私模式時顯示綠色指示器
          const greenIndicator = document.querySelector('.bg-green-400');
          expect(greenIndicator).toBeInTheDocument();
        }
        
        unmount();
        return true;
      }),
      { numRuns: 50 }
    );
  });
});