import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Input from './Input';

describe('Input Component', () => {
  it('renders with basic props', () => {
    render(<Input placeholder="測試輸入框" />);
    const input = screen.getByPlaceholderText('測試輸入框');
    expect(input).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="測試標籤" placeholder="輸入內容" />);
    expect(screen.getByText('測試標籤')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('輸入內容')).toBeInTheDocument();
  });

  it('renders with error message', () => {
    render(<Input error="這是錯誤訊息" />);
    expect(screen.getByText('這是錯誤訊息')).toBeInTheDocument();
  });

  it('applies error styles when error is present', () => {
    render(<Input error="錯誤" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
    expect(input).toHaveClass('focus-visible:ring-red-500');
  });

  it('handles value changes', () => {
    const { rerender } = render(<Input value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    
    rerender(<Input value="測試內容" onChange={() => {}} />);
    expect(input).toHaveValue('測試內容');
  });

  it('handles focus and blur events', () => {
    render(<Input data-testid="test-input" />);
    const input = screen.getByTestId('test-input');
    
    input.focus();
    expect(document.activeElement).toBe(input);
    
    input.blur();
    expect(document.activeElement).not.toBe(input);
  });

  it('can be disabled', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed');
    expect(input).toHaveClass('disabled:opacity-50');
  });

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    
    rerender(<Input type="password" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('forwards other HTML attributes', () => {
    render(<Input maxLength={10} data-testid="test-input" />);
    const input = screen.getByTestId('test-input');
    expect(input).toHaveAttribute('maxLength', '10');
  });
});