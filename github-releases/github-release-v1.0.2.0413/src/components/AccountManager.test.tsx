import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AccountManager from './AccountManager';

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

describe('AccountManager Component', () => {
  const mockAccounts = [
    { id: '1', name: '帳戶1', stockCount: 5 },
    { id: '2', name: '帳戶2', stockCount: 0 },
    { id: '3', name: '元大證券', stockCount: 3 }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    accounts: mockAccounts,
    onCreateAccount: vi.fn(),
    onDeleteAccount: vi.fn(),
    onRenameAccount: vi.fn(),
    onReorderAccount: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window.confirm as any).mockReturnValue(true);
  });

  it('renders when open', () => {
    render(<AccountManager {...defaultProps} />);
    expect(screen.getByText('帳戶管理')).toBeInTheDocument();
    expect(screen.getByText('帳戶列表')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增帳戶' })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AccountManager {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('帳戶管理')).not.toBeInTheDocument();
  });

  it('displays all accounts', () => {
    render(<AccountManager {...defaultProps} />);
    
    expect(screen.getByText('帳戶1')).toBeInTheDocument();
    expect(screen.getByText('5 筆股票')).toBeInTheDocument();
    expect(screen.getByText('帳戶2')).toBeInTheDocument();
    expect(screen.getByText('0 筆股票')).toBeInTheDocument();
    expect(screen.getByText('元大證券')).toBeInTheDocument();
    expect(screen.getByText('3 筆股票')).toBeInTheDocument();
  });

  it('creates new account when form is submitted', () => {
    render(<AccountManager {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('例如：元大證券');
    const createButton = screen.getByRole('button', { name: '新增帳戶' });
    
    fireEvent.change(input, { target: { value: '新帳戶' } });
    fireEvent.click(createButton);
    
    expect(defaultProps.onCreateAccount).toHaveBeenCalledWith('新帳戶');
  });

  it('creates new account when Enter key is pressed', () => {
    render(<AccountManager {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('例如：元大證券');
    
    fireEvent.change(input, { target: { value: '新帳戶' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(defaultProps.onCreateAccount).toHaveBeenCalledWith('新帳戶');
  });

  it('disables create button when input is empty', () => {
    render(<AccountManager {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: '新增帳戶' });
    expect(createButton).toBeDisabled();
  });

  it('enables create button when input has value', () => {
    render(<AccountManager {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('例如：元大證券');
    const createButton = screen.getByRole('button', { name: '新增帳戶' });
    
    fireEvent.change(input, { target: { value: '新帳戶' } });
    expect(createButton).not.toBeDisabled();
  });

  it('enters edit mode when edit button is clicked', () => {
    render(<AccountManager {...defaultProps} />);
    
    const editButtons = screen.getAllByLabelText('編輯帳戶名稱');
    fireEvent.click(editButtons[0]);
    
    expect(screen.getByDisplayValue('帳戶1')).toBeInTheDocument();
  });

  it('saves account name when save button is clicked in edit mode', () => {
    render(<AccountManager {...defaultProps} />);
    
    const editButtons = screen.getAllByLabelText('編輯帳戶名稱');
    fireEvent.click(editButtons[0]);
    
    const input = screen.getByDisplayValue('帳戶1');
    fireEvent.change(input, { target: { value: '修改後的帳戶' } });
    
    const saveButton = screen.getByText('✓');
    fireEvent.click(saveButton);
    
    expect(defaultProps.onRenameAccount).toHaveBeenCalledWith('1', '修改後的帳戶');
  });

  it('cancels edit when cancel button is clicked', () => {
    render(<AccountManager {...defaultProps} />);
    
    const editButtons = screen.getAllByLabelText('編輯帳戶名稱');
    fireEvent.click(editButtons[0]);
    
    const cancelButton = screen.getByText('✕');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByDisplayValue('帳戶1')).not.toBeInTheDocument();
    expect(screen.getByText('帳戶1')).toBeInTheDocument();
  });

  it('deletes account without confirmation when stockCount is 0', () => {
    render(<AccountManager {...defaultProps} />);
    
    const deleteButtons = screen.getAllByLabelText('刪除帳戶');
    fireEvent.click(deleteButtons[1]); // 帳戶2 has 0 stocks
    
    expect(defaultProps.onDeleteAccount).toHaveBeenCalledWith('2');
  });

  it('shows confirmation dialog when deleting account with stocks', () => {
    render(<AccountManager {...defaultProps} />);
    
    const deleteButtons = screen.getAllByLabelText('刪除帳戶');
    fireEvent.click(deleteButtons[0]); // 帳戶1 has 5 stocks
    
    expect(window.confirm).toHaveBeenCalledWith(
      '帳戶「帳戶1」包含 5 筆股票記錄，刪除後資料將無法復原。確定要刪除嗎？'
    );
    expect(defaultProps.onDeleteAccount).toHaveBeenCalledWith('1');
  });

  it('does not delete account when confirmation is cancelled', () => {
    (window.confirm as any).mockReturnValue(false);
    render(<AccountManager {...defaultProps} />);
    
    const deleteButtons = screen.getAllByLabelText('刪除帳戶');
    fireEvent.click(deleteButtons[0]);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.onDeleteAccount).not.toHaveBeenCalled();
  });

  it('moves account up when up arrow is clicked', () => {
    render(<AccountManager {...defaultProps} />);
    
    const upButtons = screen.getAllByLabelText('向上移動');
    fireEvent.click(upButtons[1]); // Move second account up
    
    expect(defaultProps.onReorderAccount).toHaveBeenCalledWith(1, 0);
  });

  it('moves account down when down arrow is clicked', () => {
    render(<AccountManager {...defaultProps} />);
    
    const downButtons = screen.getAllByLabelText('向下移動');
    fireEvent.click(downButtons[0]); // Move first account down
    
    expect(defaultProps.onReorderAccount).toHaveBeenCalledWith(0, 1);
  });

  it('disables up button for first account', () => {
    render(<AccountManager {...defaultProps} />);
    
    const upButtons = screen.getAllByLabelText('向上移動');
    expect(upButtons[0]).toBeDisabled();
  });

  it('disables down button for last account', () => {
    render(<AccountManager {...defaultProps} />);
    
    const downButtons = screen.getAllByLabelText('向下移動');
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<AccountManager {...defaultProps} />);
    
    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});