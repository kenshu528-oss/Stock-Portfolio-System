import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

interface Account {
  id: string;
  name: string;
  stockCount: number;
}

interface AccountManagerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onCreateAccount: (name: string) => void;
  onDeleteAccount: (id: string) => void;
  onRenameAccount: (id: string, newName: string) => void;
  onReorderAccount: (fromIndex: number, toIndex: number) => void;
}

const AccountManager: React.FC<AccountManagerProps> = ({
  isOpen,
  onClose,
  accounts,
  onCreateAccount,
  onDeleteAccount,
  onRenameAccount,
  onReorderAccount
}) => {
  const [newAccountName, setNewAccountName] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateAccount = () => {
    if (newAccountName.trim()) {
      onCreateAccount(newAccountName.trim());
      setNewAccountName('');
    }
  };

  const handleStartEdit = (account: Account) => {
    setEditingAccountId(account.id);
    setEditingName(account.name);
  };

  const handleSaveEdit = () => {
    if (editingAccountId && editingName.trim()) {
      onRenameAccount(editingAccountId, editingName.trim());
      setEditingAccountId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditingName('');
  };

  const handleDeleteAccount = (account: Account) => {
    if (account.stockCount > 0) {
      const confirmed = window.confirm(
        `帳戶「${account.name}」包含 ${account.stockCount} 筆股票記錄，刪除後資料將無法復原。確定要刪除嗎？`
      );
      if (!confirmed) return;
    }
    onDeleteAccount(account.id);
  };

  // 處理帳戶順序調整
  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onReorderAccount(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < accounts.length - 1) {
      onReorderAccount(index, index + 1);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="帳戶管理"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* 帳戶列表 */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">帳戶列表</h3>
          <div className="space-y-3">
            {accounts.map((account, index) => (
              <div
                key={account.id}
                className="bg-slate-700 border border-slate-600 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  {editingAccountId === account.id ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveEdit}
                      >
                        ✓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-white font-medium">{account.name}</h4>
                      <p className="text-slate-400 text-sm">{account.stockCount} 筆股票</p>
                    </div>
                  )}
                </div>
                
                {editingAccountId !== account.id && (
                  <div className="flex items-center space-x-2">
                    {/* 順序調整按鈕 */}
                    <div className="flex flex-col space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                        aria-label="向上移動"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === accounts.length - 1}
                        className="text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                        aria-label="向下移動"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                    </div>

                    {/* 編輯按鈕 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(account)}
                      className="text-slate-300 hover:text-white"
                      aria-label="編輯帳戶名稱"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    
                    {/* 刪除按鈕 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAccount(account)}
                      className="text-red-400 hover:text-red-300"
                      aria-label="刪除帳戶"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 新增帳戶 */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">新增帳戶</h3>
          <div className="space-y-4">
            <Input
              label="帳戶名稱 *"
              placeholder="例如：元大證券"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateAccount();
                }
              }}
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={onClose}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateAccount}
                disabled={!newAccountName.trim()}
              >
                新增帳戶
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AccountManager;