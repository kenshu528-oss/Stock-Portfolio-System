import React, { useState, useRef } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useAppStore } from '../stores/appStore';
import { identifyBondETF } from '../services/bondETFService';

// 臨時的類型定義，避免導入錯誤
interface ExportOptions {
  format: 'json' | 'csv';
  accounts: string[];
  includeHistory: boolean;
  includeDividends: boolean;
  includeStats: boolean;
}

interface ImportResult {
  success: boolean;
  accounts: any[];
  stocks: any[];
  errors: string[];
  warnings: string[];
  summary: {
    accountsCount: number;
    stocksCount: number;
    dividendsCount: number;
  };
}


interface ImportExportManagerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: any[];
  stocks: any[];
}

const ImportExportManager: React.FC<ImportExportManagerProps> = ({
  isOpen,
  onClose
}) => {
  console.log('ImportExportManager 渲染，isOpen:', isOpen);
  
  // 必須在組件頂層調用所有 hooks
  const { accounts, stocks, importData, setCurrentAccount } = useAppStore();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 匯出選項狀態
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    accounts: [],
    includeHistory: true,
    includeDividends: true,
    includeStats: true
  });
  
  if (!isOpen) {
    console.log('ImportExportManager 不渲染，因為 isOpen 為 false');
    return null;
  }
  
  console.log('ImportExportManager 準備渲染 Modal');

  // 處理匯出 - 簡化版本
  const handleExport = async () => {
    if (exportOptions.accounts.length === 0) {
      alert('請選擇要匯出的帳戶');
      return;
    }

    setIsExporting(true);
    
    try {
      // 簡化的匯出邏輯
      const filteredAccounts = accounts.filter(acc => exportOptions.accounts.includes(acc.id));
      const filteredStocks = stocks.filter(stock => 
        filteredAccounts.some(acc => acc.id === stock.accountId)
      );

      const exportData = {
        version: "1.0.2.0023",
        exportDate: new Date().toISOString(),
        accounts: filteredAccounts,
        stocks: filteredStocks,
        metadata: {
          totalAccounts: filteredAccounts.length,
          totalStocks: filteredStocks.length,
          exportOptions: exportOptions
        }
      };

      const content = JSON.stringify(exportData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      link.download = `portfolio_${timestamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert(`成功匯出 portfolio_${timestamp}.json`);
      
    } catch (error) {
      console.error('匯出失敗:', error);
      alert(`匯出失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 處理檔案選擇 - 簡化版本
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('選擇的檔案:', file.name, file.type, file.size);

    setIsImporting(true);
    setImportResult(null);

    try {
      // 簡化的檔案驗證
      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('檔案大小超過 10MB 限制');
      }

      if (!file.name.match(/\.json$/i)) {
        throw new Error('目前只支援 JSON 格式匯入');
      }

      // 解析檔案
      const text = await file.text();
      const data = JSON.parse(text);

      // 驗證資料結構
      if (!data.accounts || !data.stocks) {
        throw new Error('檔案格式錯誤：缺少必要的帳戶或股票資料');
      }

      // 處理帳戶資料
      const accounts = data.accounts.map((acc: any) => ({
        ...acc,
        createdAt: acc.createdAt ? new Date(acc.createdAt) : new Date()
      }));

      // 處理股票資料（加入債券ETF自動識別）
      const stocks = data.stocks.map((stock: any) => {
        // 自動識別債券ETF並設定正確的證交稅率
        const bondInfo = identifyBondETF(stock.symbol, stock.name);
        
        return {
          ...stock,
          purchaseDate: new Date(stock.purchaseDate),
          lastUpdated: new Date(stock.lastUpdated),
          // 如果匯入資料沒有這些欄位，則自動設定
          isBondETF: stock.isBondETF ?? bondInfo.isBondETF,
          transactionTaxRate: stock.transactionTaxRate ?? bondInfo.transactionTaxRate,
          dividendRecords: stock.dividendRecords?.map((dividend: any) => ({
            ...dividend,
            exDividendDate: new Date(dividend.exDividendDate)
          })) || []
        };
      });

      const dividendsCount = stocks.reduce((sum: number, stock: any) => 
        sum + (stock.dividendRecords?.length || 0), 0
      );

      setImportResult({
        success: true,
        accounts,
        stocks,
        errors: [],
        warnings: [],
        summary: {
          accountsCount: accounts.length,
          stocksCount: stocks.length,
          dividendsCount
        }
      });
      
    } catch (error) {
      console.error('匯入處理失敗:', error);
      setImportResult({
        success: false,
        accounts: [],
        stocks: [],
        errors: [`匯入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`],
        warnings: [],
        summary: { accountsCount: 0, stocksCount: 0, dividendsCount: 0 }
      });
    } finally {
      setIsImporting(false);
    }
  };

  // 處理帳戶選擇
  const handleAccountToggle = (accountId: string) => {
    setExportOptions((prev: ExportOptions) => ({
      ...prev,
      accounts: prev.accounts.includes(accountId)
        ? prev.accounts.filter((id: string) => id !== accountId)
        : [...prev.accounts, accountId]
    }));
  };

  // 全選/取消全選帳戶
  const handleSelectAllAccounts = () => {
    setExportOptions((prev: ExportOptions) => ({
      ...prev,
      accounts: prev.accounts.length === accounts.length 
        ? [] 
        : accounts.map(acc => acc.id)
    }));
  };

  // 確認匯入
  const handleConfirmImport = () => {
    if (!importResult || !importResult.success) return;
    
    try {
      // 執行匯入
      importData(importResult.accounts, importResult.stocks, importMode);
      
      // 自動切換到第一個帳戶（遵循 cloud-sync-development.md 規範）
      if (importResult.accounts.length > 0) {
        const firstAccountName = importResult.accounts[0].name;
        setCurrentAccount(firstAccountName);
        console.log('自動切換到帳戶:', firstAccountName);
      }
      
      // 顯示成功訊息
      alert(`✅ 匯入成功！\n帳戶: ${importResult.summary.accountsCount} 個\n股票: ${importResult.summary.stocksCount} 筆\n股息記錄: ${importResult.summary.dividendsCount} 筆`);
      
      // 清理狀態並關閉
      setImportResult(null);
      onClose();
      
    } catch (error) {
      console.error('匯入執行失敗:', error);
      alert(`匯入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  };

  console.log('ImportExportManager 開始 return Modal');
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="匯入匯出管理">
      <div className="space-y-6">
        {/* 標籤切換 */}
        <div className="flex space-x-1 bg-slate-900 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            匯出資料
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            匯入資料
          </button>
        </div>

        {/* 匯出標籤內容 */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* 匯出格式選擇 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                匯出格式
              </label>
              <div className="flex space-x-4">
                {[
                  { value: 'json', label: 'JSON', desc: '完整資料結構' },
                  { value: 'csv', label: 'CSV', desc: '表格格式' }
                ].map(format => (
                  <label key={format.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value={format.value}
                      checked={exportOptions.format === format.value}
                      onChange={(e) => setExportOptions((prev: ExportOptions) => ({ 
                        ...prev, 
                        format: e.target.value as 'json' | 'csv' 
                      }))}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="text-white">{format.label}</span>
                      <p className="text-xs text-slate-400">{format.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 帳戶選擇 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  選擇帳戶
                </label>
                <button
                  onClick={handleSelectAllAccounts}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {exportOptions.accounts.length === accounts.length ? '取消全選' : '全選'}
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {accounts.map(account => (
                  <label key={account.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.accounts.includes(account.id)}
                      onChange={() => handleAccountToggle(account.id)}
                      className="text-blue-600"
                    />
                    <span className="text-slate-300">{account.name}</span>
                    <span className="text-xs text-slate-500">
                      ({stocks.filter(s => s.accountId === account.id).length} 筆股票)
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 匯出選項 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                匯出內容
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeHistory}
                    onChange={(e) => setExportOptions((prev: ExportOptions) => ({ 
                      ...prev, 
                      includeHistory: e.target.checked 
                    }))}
                    className="text-blue-600"
                  />
                  <span className="text-slate-300">包含購買歷史</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDividends}
                    onChange={(e) => setExportOptions((prev: ExportOptions) => ({ 
                      ...prev, 
                      includeDividends: e.target.checked 
                    }))}
                    className="text-blue-600"
                  />
                  <span className="text-slate-300">包含股息記錄</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeStats}
                    onChange={(e) => setExportOptions((prev: ExportOptions) => ({ 
                      ...prev, 
                      includeStats: e.target.checked 
                    }))}
                    className="text-blue-600"
                  />
                  <span className="text-slate-300">包含統計資訊</span>
                </label>
              </div>
            </div>

            {/* 匯出按鈕 */}
            <div className="flex justify-end">
              <Button
                onClick={handleExport}
                disabled={isExporting || exportOptions.accounts.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isExporting ? '匯出中...' : '開始匯出'}
              </Button>
            </div>
          </div>
        )}

        {/* 匯入標籤內容 */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            {/* 匯入模式選擇 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                匯入模式
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                    className="text-blue-600"
                  />
                  <div>
                    <span className="text-white">合併模式</span>
                    <p className="text-xs text-slate-400">與現有資料合併，相同股票會累加持股</p>
                  </div>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                    className="text-blue-600"
                  />
                  <div>
                    <span className="text-white">替換模式</span>
                    <p className="text-xs text-slate-400">完全替換現有資料</p>
                  </div>
                </label>
              </div>
            </div>

            {/* 檔案選擇 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                選擇匯入檔案
              </label>
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <svg className="mx-auto h-12 w-12 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-slate-300 mb-2">點擊選擇檔案或拖拽到此處</p>
                <p className="text-xs text-slate-500">支援 JSON、CSV、Excel 格式</p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isImporting}
                >
                  {isImporting ? '處理中...' : '選擇檔案'}
                </Button>
              </div>
            </div>

            {/* 匯入結果 */}
            {importResult && (
              <div className={`p-4 rounded-lg ${
                importResult.success ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'
              }`}>
                <h4 className={`font-semibold mb-2 ${
                  importResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {importResult.success ? '匯入預覽' : '匯入失敗'}
                </h4>
                
                {importResult.success ? (
                  <div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{importResult.summary.accountsCount}</p>
                        <p className="text-sm text-slate-400">帳戶</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{importResult.summary.stocksCount}</p>
                        <p className="text-sm text-slate-400">股票</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{importResult.summary.dividendsCount}</p>
                        <p className="text-sm text-slate-400">股息記錄</p>
                      </div>
                    </div>
                    
                    {/* 匯入模式說明 */}
                    <div className="mb-4 p-3 bg-slate-800 rounded-lg">
                      <p className="text-sm text-slate-300">
                        <span className="font-medium">匯入模式：</span>
                        {importMode === 'merge' ? (
                          <span className="text-blue-400">合併模式 - 與現有資料合併，相同帳戶名稱和股票代碼會自動合併</span>
                        ) : (
                          <span className="text-orange-400">替換模式 - 將完全替換現有的所有資料</span>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        onClick={() => setImportResult(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleConfirmImport}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        確認匯入
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {importResult.errors.map((error: string, index: number) => (
                      <p key={index} className="text-red-300 text-sm mb-1">• {error}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportExportManager;