import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditableCell from './EditableCell';

describe('EditableCell Component', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders display mode by default', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByTitle('點擊編輯')).toBeInTheDocument();
  });

  it('enters edit mode when clicked', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
      />
    );

    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByText('Enter 儲存 • Esc 取消')).toBeInTheDocument();
  });

  it('saves value on Enter key', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
      />
    );

    // 進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSave).toHaveBeenCalledWith(150);
  });

  it('cancels edit on Escape key', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
      />
    );

    // 進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('saves value on blur', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
      />
    );

    // 進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.blur(input);

    expect(mockOnSave).toHaveBeenCalledWith(150);
  });

  it('handles integer type correctly', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
        type="integer"
      />
    );

    // 進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '150.7' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // 應該轉換為整數
    expect(mockOnSave).toHaveBeenCalledWith(150);
  });

  it('validates minimum value', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
        min={50}
      />
    );

    // 進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '30' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // 不應該儲存，因為低於最小值
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('validates maximum value', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
        max={150}
      />
    );

    // 進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // 不應該儲存，因為超過最大值
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('uses custom display format', () => {
    const customFormat = (value: number) => `NT$${value.toLocaleString()}`;
    
    render(
      <EditableCell
        value={1000}
        onSave={mockOnSave}
        displayFormat={customFormat}
      />
    );

    expect(screen.getByText('NT$1,000')).toBeInTheDocument();
  });

  it('handles invalid input gracefully', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
      />
    );

    // 進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // 不應該儲存無效值
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('only allows valid numeric input', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
      />
    );

    // 進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('100') as HTMLInputElement;
    
    // 嘗試輸入字母
    fireEvent.change(input, { target: { value: '100abc' } });
    
    // 輸入值不應該改變（因為包含非數字字符）
    expect(input.value).toBe('100');
  });

  it('shows edit icon on hover', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
      />
    );

    const button = screen.getByTitle('點擊編輯');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('does not save when value is unchanged', () => {
    render(
      <EditableCell
        value={100}
        onSave={mockOnSave}
      />
    );

    // 進入編輯模式
    fireEvent.click(screen.getByTitle('點擊編輯'));
    
    const input = screen.getByDisplayValue('100');
    // 不改變值，直接按 Enter
    fireEvent.keyDown(input, { key: 'Enter' });

    // 不應該呼叫 onSave，因為值沒有改變
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});