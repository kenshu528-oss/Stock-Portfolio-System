import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { CheckIcon, XIcon, EditIcon, DeleteIcon, ArrowUpIcon, ArrowDownIcon } from './ui/Icons';
import type { Account } from '../types';

interface AccountManagerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onCreateAccount: (name: string, brokerageFee?: number, transactionTax?: number) => void;
  onDeleteAccount: (id: string) => void;
  onRenameAccount: (id: string, newName: string) => void;
  onUpdateBrokerageFee: (id: string, brokerageFee: number) => void;
  onUpdateTransactionTax: (id: string, transactionTax: number) => void;
  onReorderAccount: (fromIndex: number, toIndex: number) => void;
}

const AccountManager: React.FC<AccountManagerProps> = ({
  isOpen,
  onClose,
  accounts,
  onCreateAccount,
  onDeleteAccount,
  onRenameAccount,
  onUpdateBrokerageFee,
  onUpdateTransactionTax,
  onReorderAccount
}) => {
  const [newAccountName, setNewAccountName] = useState('');
  const [newBrokerageFee, setNewBrokerageFee] = useState('0.1425');
  const [newTransactionTax, setNewTransactionTax] = useState('0.3');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingBrokerageFee, setEditingBrokerageFee] = useState('');
  const [editingTransactionTax, setEditingTransactionTax] = useState('');

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
    
    // 驗證手續費率
    const feeRate = parseFloat(newBrokerageFee);
    if (isNaN(feeRate) || feeRate < 0 || feeRate > 100) {
      alert('請輸入有效的手續費率（0-100%）');
      return;
    }
    
    // 驗證交易稅率
    const taxRate = parseFloat(newTransactionTax);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      alert('請輸入有效的交易稅率（0-100%）');
      return;
    }
    
    onCreateAccount(trimmedName, feeRate, taxRate);
    setNewAccountName('');
    setNewBrokerageFee('0.1425');
    setNewTransactionTax('0.3');
  };

  const handleStartEdit = (account: Account) => {
    setEditingAccountId(account.id);
    setEditingName(account.name);
    setEditingBrokerageFee((account.brokerageFee ?? 0.1425).toString());
    setEditingTransactionTax((account.transactionTax ?? 0.3).toString());
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
    
    // 驗證手續費率
    const feeRate = parseFloat(editingBrokerageFee);
    if (isNaN(feeRate) || feeRate < 0 || feeRate > 100) {
      alert('請輸入有效的手續費率（0-100%）');
      return;
    }
    
    // 驗證交易稅率
    const taxRate = parseFloat(editingTransactionTax);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      alert('請輸入有效的交易稅率（0-100%）');
      return;
    }
    
    onRenameAccount(editingAccountId, trimmedName);
    onUpdateBrokerageFee(editingAccountId, feeRate);
    onUpdateTransactionTax(editingAccountId, taxRate);
    setEditingAccountId(null);
    setEditingName('');
    setEditingBrokerageFee('');
    setEditingTransactionTax('');
  };

  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditingName('');
    setEditingBrokerageFee('');
    setEditingTransactionTax('');
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
      className="max-w-7xl w-full max-h-[90vh]"
      autoHeight={false}
    >
      <div className="space-y-4 md:space-y-8">
        {/* 新增帳戶表單 - 響應式佈局 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-slate-700 rounded-lg">
          <div className="flex-1">
            <Input
              placeholder="帳戶名稱"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateAccount();
                }
              }}
              className="text-base h-10"
            />
          </div>
          <div className="w-full sm:w-32">
            <Input
              type="number"
              step="0.0001"
              min="0"
              max="100"
              placeholder="0.1425"
              value={newBrokerageFee}
              onChange={(e) => setNewBrokerageFee(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateAccount();
                }
              }}
              className="text-base h-10 font-medium text-white"
            />
            {/* 交易稅隱藏輸入框，保持資料同步但不顯示 */}
            <input
              type="hidden"
              value={newTransactionTax}
              onChange={(e) => setNewTransactionTax(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateAccount}
              disabled={!newAccountName.trim()}
              className="h-10 px-6 text-base bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              新增帳戶
            </Button>
          </div>
        </div>

        {/* 帳戶網格 - 響應式高度 */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-h-[50vh] md:max-h-[400px] overflow-y-auto pr-2 md:pr-4">
            {accounts.map((account, index) => (
              <div
                key={account.id}
                className="bg-slate-700 border border-slate-600 rounded-xl p-4 md:p-6 relative group hover:bg-slate-600 transition-colors min-h-[140px] md:min-h-[160px]"
              >
                {editingAccountId === account.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">帳戶名稱</label>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full text-base"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        手續費率 (%)
                      </label>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        max="100"
                        value={editingBrokerageFee}
                        onChange={(e) => setEditingBrokerageFee(e.target.value)}
                        className="w-full text-base font-medium"
                        placeholder="0.1425"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      {/* 交易稅隱藏輸入框，保持資料同步但不顯示 */}
                      <input
                        type="hidden"
                        value={editingTransactionTax}
                        onChange={(e) => setEditingTransactionTax(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveEdit}
                        className="h-8 px-3 text-sm bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckIcon size="sm" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-8 px-3 text-sm bg-red-600 hover:bg-red-700 text-white"
                      >
                        <XIcon size="sm" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-between">
                    {/* 帳戶資訊和編輯按鈕 */}
                    <div className="flex items-start justify-between mb-3 md:mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-lg md:text-xl truncate leading-tight">{account.name}</h4>
                        <p className="text-slate-400 text-sm md:text-base mt-1">{account.stockCount} 筆股票</p>
                        <p className="text-slate-500 text-xs md:text-sm mt-1">
                          手續費: {account.brokerageFee ?? 0.1425}%
                        </p>
                        {/* 交易稅暫時不顯示，但資料結構已支援 */}
                      </div>
                      
                      {/* 編輯按鈕 - 始終可見 */}
                      <button
                        onClick={() => handleStartEdit(account)}
                        className="ml-2 p-1.5 md:p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors flex-shrink-0"
                        title="編輯帳戶名稱"
                      >
                        <EditIcon size="sm" />
                      </button>
                    </div>
                    
                    {/* 操作按鈕 */}
                    <div className="flex justify-end space-x-1 md:space-x-2">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1.5 md:p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="向上移動"
                      >
                        <ArrowUpIcon size="sm" />
                      </button>
                      
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === accounts.length - 1}
                        className="p-1.5 md:p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="向下移動"
                      >
                        <ArrowDownIcon size="sm" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        className="p-1.5 md:p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                        title="刪除帳戶"
                      >
                        <DeleteIcon size="sm" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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