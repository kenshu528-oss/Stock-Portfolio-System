import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PrivacyToggle from './PrivacyToggle';

describe('PrivacyToggle', () => {
  it('應該正確顯示隱私模式圖示', () => {
    const mockToggle = vi.fn();
    
    // 測試隱私模式開啟時的圖示
    const { rerender } = render(
      <PrivacyToggle isPrivacyMode={true} onToggle={mockToggle} />
    );

    // 檢查隱藏狀態的圖示（眼睛斜線）
    const hiddenIcon = screen.getByRole('button', { name: '顯示金額' });
    expect(hiddenIcon).toBeInTheDocument();

    // 測試隱私模式關閉時的圖示
    rerender(
      <PrivacyToggle isPrivacyMode={false} onToggle={mockToggle} />
    );

    // 檢查顯示狀態的圖示（眼睛）
    const visibleIcon = screen.getByRole('button', { name: '隱藏金額' });
    expect(visibleIcon).toBeInTheDocument();
  });

  it('應該在點擊時觸發切換函數', () => {
    const mockToggle = vi.fn();
    
    render(
      <PrivacyToggle isPrivacyMode={false} onToggle={mockToggle} />
    );

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('應該顯示正確的提示訊息', async () => {
    const mockToggle = vi.fn();
    
    // 測試從顯示切換到隱藏
    const { rerender } = render(
      <PrivacyToggle isPrivacyMode={false} onToggle={mockToggle} />
    );

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    // 檢查提示訊息
    await waitFor(() => {
      expect(screen.getByText('隱私模式已啟用')).toBeInTheDocument();
    });

    // 測試從隱藏切換到顯示
    rerender(
      <PrivacyToggle isPrivacyMode={true} onToggle={mockToggle} />
    );

    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('隱私模式已關閉')).toBeInTheDocument();
    });
  });

  it('應該在3秒後自動隱藏提示訊息', async () => {
    vi.useFakeTimers();
    const mockToggle = vi.fn();
    
    render(
      <PrivacyToggle isPrivacyMode={false} onToggle={mockToggle} />
    );

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    // 檢查提示訊息出現
    await waitFor(() => {
      expect(screen.getByText('隱私模式已啟用')).toBeInTheDocument();
    });

    // 快進3秒
    vi.advanceTimersByTime(3000);

    // 檢查提示訊息消失
    await waitFor(() => {
      expect(screen.queryByText('隱私模式已啟用')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('應該正確設定aria-label', () => {
    const mockToggle = vi.fn();
    
    // 測試隱私模式開啟時的aria-label
    const { rerender } = render(
      <PrivacyToggle isPrivacyMode={true} onToggle={mockToggle} />
    );

    expect(screen.getByRole('button', { name: '顯示金額' })).toBeInTheDocument();

    // 測試隱私模式關閉時的aria-label
    rerender(
      <PrivacyToggle isPrivacyMode={false} onToggle={mockToggle} />
    );

    expect(screen.getByRole('button', { name: '隱藏金額' })).toBeInTheDocument();
  });

  it('應該支援自定義className', () => {
    const mockToggle = vi.fn();
    
    render(
      <PrivacyToggle 
        isPrivacyMode={false} 
        onToggle={mockToggle} 
        className="custom-class"
      />
    );

    const container = screen.getByRole('button').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('應該支援禁用tooltip', () => {
    const mockToggle = vi.fn();
    
    render(
      <PrivacyToggle 
        isPrivacyMode={false} 
        onToggle={mockToggle} 
        showTooltip={false}
      />
    );

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('title');
  });

  it('應該顯示正確的狀態指示器顏色', async () => {
    const mockToggle = vi.fn();
    
    // 測試從隱私模式關閉時的橙色指示器（因為顯示"隱私模式已關閉"）
    render(
      <PrivacyToggle isPrivacyMode={true} onToggle={mockToggle} />
    );

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      const indicator = document.querySelector('.bg-orange-400');
      expect(indicator).toBeInTheDocument();
    });
  });

  it('應該在快速連續點擊時正確處理狀態', async () => {
    const mockToggle = vi.fn();
    
    render(
      <PrivacyToggle isPrivacyMode={false} onToggle={mockToggle} />
    );

    const toggleButton = screen.getByRole('button');
    
    // 快速連續點擊
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);

    expect(mockToggle).toHaveBeenCalledTimes(3);
  });
});