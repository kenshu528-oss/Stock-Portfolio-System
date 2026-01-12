import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { stockService } from '../services/stockPriceService';

interface StockSearchResult {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  market?: string;
}

interface StockFormData {
  symbol: string;
  name: string;
  price: number;
  shares: string;
  costPrice: string;
  purchaseDate: string;
  account: string;
}

interface AddStockFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stockData: StockFormData) => void;
  currentAccount: string;
}

const AddStockForm: React.FC<AddStockFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentAccount
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [formData, setFormData] = useState<StockFormData>({
    symbol: '',
    name: '',
    price: 0,
    shares: '',
    costPrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    account: currentAccount
  });

  // 重置表單
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedStock(null);
      setIsSearching(false);
      setSearchError(null);
      setFormData({
        symbol: '',
        name: '',
        price: 0,
        shares: '',
        costPrice: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        account: currentAccount
      });
    }
  }, [isOpen, currentAccount]);

  // 搜尋股票（使用真實API）
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSearchError(null);
    
    if (!query.trim()) {
      setSelectedStock(null);
      return;
    }

    // 支援多種股票代碼格式：4位數字、5位數字、6位數字+字母、ETF格式
    const isValidFormat = /^(\d{4}[A-Z]?|0\d{4}|00\d{3}[A-Z]?)$/i.test(query.trim());
    
    if (!isValidFormat) {
      setSelectedStock(null);
      if (query.trim().length >= 3) {
        setSearchError('請輸入有效的股票代碼格式（如：2330、0050、00646、00679B）');
      }
      return;
    }

    setIsSearching(true);
    
    try {
      console.log(`搜尋股票: ${query}`);
      const result = await stockService.searchStock(query.trim());
      
      if (result) {
        setSelectedStock(result);
        setFormData(prev => ({
          ...prev,
          symbol: result.symbol,
          name: result.name,
          price: result.price || 0,
          costPrice: result.price ? result.price.toString() : ''
        }));
        console.log(`找到股票:`, result);
      } else {
        setSelectedStock(null);
        setSearchError(`找不到股票代碼 ${query} 的資訊，請確認代碼是否正確`);
      }
    } catch (error) {
      console.error('搜尋股票失敗:', error);
      setSelectedStock(null);
      setSearchError('搜尋股票時發生錯誤，請稍後再試');
    } finally {
      setIsSearching(false);
    }
  };

  // 處理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStock && formData.shares && formData.costPrice) {
      onSubmit(formData);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新增股票"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 股票搜尋 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            請輸入股號或名稱:
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="例如: 2330、0050、00646、00679B"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              </div>
            )}
          </div>
          {searchError && (
            <p className="text-sm text-red-400 mt-2">{searchError}</p>
          )}
        </div>

        {/* 股票資訊顯示 */}
        {selectedStock && (
          <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <span className="text-green-400 font-medium">
                  {selectedStock.symbol} - {selectedStock.name}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  ({selectedStock.market})
                </span>
                {selectedStock.price && (
                  <div className="text-sm text-slate-300 mt-1">
                    股價: ${selectedStock.price.toFixed(2)}
                    {selectedStock.change !== undefined && selectedStock.changePercent !== undefined && (
                      <span className={`ml-2 ${selectedStock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)} 
                        ({selectedStock.change >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 帳戶選擇 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            帳戶:
          </label>
          <select
            value={formData.account}
            onChange={(e) => setFormData(prev => ({ ...prev, account: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="帳戶1">帳戶1</option>
            <option value="帳戶2">帳戶2</option>
          </select>
        </div>

        {/* 持股數 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            持股數:
          </label>
          <input
            type="number"
            value={formData.shares}
            onChange={(e) => setFormData(prev => ({ ...prev, shares: e.target.value }))}
            placeholder="例如: 1000"
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            min="1"
            step="1"
          />
        </div>

        {/* 成本價 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            成本價:
          </label>
          <input
            type="number"
            value={formData.costPrice}
            onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
            placeholder="例如: 580.50"
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            min="0.01"
            step="0.01"
          />
        </div>

        {/* 購買日期 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            購買日期:
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* 按鈕 */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-6 py-2 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            取消
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedStock || !formData.shares || !formData.costPrice}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            新增
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddStockForm;