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
    const trimmedName = newAccountName.trim();
    if (!trimmedName) return;
    
    // 檢查帳戶名稱是否重複
    const isDuplicate = accounts.some(account => 
      account.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (isDuplicate) {
      alert('帳戶名稱已存在，請使用不同的名稱');
      return;
    }
    
    onCreateAccount(trimmedName);
    setNewAccountName('');
  };

  const handleStartEdit = (account: Account) => {
    setEditingAccountId(account.id);
    setEditingName(account.name);
  };

  const handleSaveEdit = () => {
    const trimmedName = editingName.trim();
    if (!editingAccountId || !trimmedName) return;
    
    // 檢查帳戶名稱是否重複（排除當前編輯的帳戶）
    const isDuplicate = accounts.some(account => 
      account.id !== editingAccountId && 
      account.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (isDuplicate) {
      alert('帳戶名稱已存在，請使用不同的名稱');
      return;
    }
    
    onRenameAccount(editingAccountId, trimmedName);
    setEditingAccountId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditingName('');
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{account: Account} | null>(null);

  const handleDeleteAccount = (account: Account) => {
    if (account.stockCount > 0) {
      setDeleteConfirm({ account });
    } else {
      onDeleteAccount(account.id);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDeleteAccount(deleteConfirm.account.id);
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
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
      className="max-w-4xl w-full"
      autoHeight={true}
    >
      <div className="space-y-6">
        {/* 帳戶網格 */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">帳戶列表</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-2">
            {accounts.map((account, index) => (
              <div
                key={account.id}
                className="bg-slate-700 border border-slate-600 rounded-lg p-3 relative group hover:bg-slate-600 transition-colors min-h-[80px]"
              >
                {editingAccountId === account.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit();
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveEdit}
                        className="h-6 px-2 text-xs"
                      >
                        ✓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-6 px-2 text-xs"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-between">
                    {/* 帳戶資訊和編輯按鈕 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-base truncate leading-tight">{account.name}</h4>
                        <p className="text-slate-400 text-xs mt-1">{account.stockCount} 筆股票</p>
                      </div>
                      
                      {/* 編輯按鈕 - 始終可見 */}
                      <button
                        onClick={() => handleStartEdit(account)}
                        className="ml-2 p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
                        title="編輯帳戶名稱"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* 操作按鈕 */}
                    <div className="flex justify-end space-x-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="向上移動"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === accounts.length - 1}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="向下移動"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                        title="刪除帳戶"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* 新增帳戶卡片 */}
            <div className="bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg p-3 flex flex-col justify-center min-h-[80px] hover:border-slate-500 transition-colors">
              <div className="space-y-2">
                <Input
                  placeholder="帳戶名稱"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateAccount();
                    }
                  }}
                  className="text-xs h-7"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateAccount}
                  disabled={!newAccountName.trim()}
                  className="w-full h-6 text-xs"
                >
                  新增
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={cancelDelete} />
          <div className="relative bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-2">確認刪除帳戶</h3>
                <div className="text-slate-300 mb-4">
                  <p className="mb-2">
                    您即將刪除帳戶「<span className="font-medium text-white">{deleteConfirm.account.name}</span>」
                  </p>
                  <div className="bg-red-900/20 border border-red-500/30 rounded p-3 mb-3">
                    <p className="text-red-300 text-sm">
                      ⚠️ 此帳戶包含 <span className="font-medium">{deleteConfirm.account.stockCount}</span> 筆股票記錄
                    </p>
                    <p className="text-red-300 text-sm mt-1">
                      刪除後所有股票資料將無法復原
                    </p>
                  </div>
                  <p className="text-sm text-slate-400">
                    請確認您真的要刪除此帳戶及其所有股票記錄。
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="ghost"
                    onClick={cancelDelete}
                    className="text-slate-300 hover:text-white"
                  >
                    取消
                  </Button>
                  <Button
                    variant="danger"
                    onClick={confirmDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    確定刪除
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AccountManager;