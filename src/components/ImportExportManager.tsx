import React, { useState, useRef } from 'react';


import { useAppStore } from '../stores/appStore';
import ImportExportService, { type ExportOptions, type ImportResult } from '../services/ImportExportService';


interface ImportExportManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportExportManager: React.FC<ImportExportManagerProps> = ({
  isOpen,
  onClose
}) => {
  const { accounts, stocks } = useAppStore();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 匯出選項狀態
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    accounts: [],
    includeHistory: true,
    includeDividends: true,
    includeStats: true
  });

  // 處理匯出
  const handleExport = async () => {
    if (exportOptions.accounts.length === 0) {
      alert('請選擇要匯出的帳戶');
      return;
    }

    setIsExporting(true);
    
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (exportOptions.format) {
        case 'json':
          content = ImportExportService.exportToJSON(accounts, stocks, exportOptions);
          filename = ImportExportService.generateFilename('json', 'portfolio');
          mimeType = 'application/json';
          break;
          
        case 'csv':
          content = ImportExportService.exportToCSV(accounts, stocks, exportOptions);
          filename = ImportExportService.generateFilename('csv', 'portfolio');
          mimeType = 'text/csv';
          break;
          
        default:
          throw new Error('不支援的匯出格式');
      }

      ImportExportService.downloadFile(content, filename, mimeType);
      
      // 顯示成功訊息
      alert(`成功匯出 ${filename}`);
      
    } catch (error) {
      console.error('匯出失敗:', error);
      alert(`匯出失敗: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 處理檔案選擇
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      // 驗證檔案
      const validation = await ImportExportService.validateImportFile(file);
      if (!validation.valid) {
        setImportResult({
          success: false,
          accounts: [],
          stocks: [],
          errors: validation.errors,
          warnings: [],
          summary: { accountsCount: 0, stocksCount: 0, dividendsCount: 0 }
        });
        return;
      }

      // 解析檔案
      let result: ImportResult;
      if (file.name.endsWith('.json')) {
        result = await ImportExportService.parseJSONFile(file);
      } else {
        throw new Error('目前只支援 JSON 格式匯入');
      }

      setImportResult(result);
      
    } catch (error) {
      console.error('匯入失敗:', error);
      setImportResult({
        success: false,
        accounts: [],
        stocks: [],
        errors: [`匯入失敗: ${error.message}`],
        warnings: [],
        summary: { accountsCount: 0, stocksCount: 0, dividendsCount: 0 }
      });
    } finally {
      setIsImporting(false);
    }
  };

  // 處理帳戶選擇
  const handleAccountToggle = (accountId: string) => {
    setExportOptions(prev => ({
      ...prev,
      accounts: prev.accounts.includes(accountId)
        ? prev.accounts.filter(id => id !== accountId)
        : [...prev.accounts, accountId]
    }));
  };

  // 全選/取消全選帳戶
  const handleSelectAllAccounts = () => {
    setExportOptions(prev => ({
      ...prev,
      accounts: prev.accounts.length === accounts.length 
        ? [] 
        : accounts.map(acc => acc.id)
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="資料匯入匯出">
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
                      onChange={(e) => setExportOptions(prev => ({ 
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
                    onChange={(e) => setExportOptions(prev => ({ 
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
                    onChange={(e) => setExportOptions(prev => ({ 
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
                    onChange={(e) => setExportOptions(prev => ({ 
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
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        onClick={() => setImportResult(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        取消
                      </Button>
                      <Button
                        onClick={() => {
                          // TODO: 實際執行匯入
                          alert('匯入功能開發中...');
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        確認匯入
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {importResult.errors.map((error, index) => (
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