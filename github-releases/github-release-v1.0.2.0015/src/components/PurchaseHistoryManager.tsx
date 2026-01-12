import React, { useState } from 'react';
import type { StockRecord } from '../types';

interface PurchaseRecord {
  id: string;
  date: Date;
  shares: number;
  price: number;
  fees?: number;
  notes?: string;
}

interface PurchaseHistoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockRecord;
  onUpdateStock?: (id: string, updates: Partial<StockRecord>) => void;
}

const PurchaseHistoryManager: React.FC<PurchaseHistoryManagerProps> = ({
  isOpen,
  onClose,
  stock,
  onUpdateStock
}) => {
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [newRecord, setNewRecord] = useState<Partial<PurchaseRecord>>({
    date: new Date(),
    shares: 0,
    price: 0,
    fees: 0,
    notes: ''
  });

  // 從股票記錄中獲取購買記錄（如果有合併記錄則使用原始記錄）
  const purchaseRecords: PurchaseRecord[] = React.useMemo(() => {
    const records = (stock as any).originalRecords || [stock];
    return records.map((record: StockRecord, index: number) => ({
      id: record.id,
      date: new Date(record.purchaseDate),
      shares: record.shares,
      price: record.costPrice,
      fees: 0, // 暫時設為0，未來可以添加手續費欄位
      notes: `購買記錄 #${index + 1}`
    }));
  }, [stock]);

  // 計算統計資訊
  const statistics = React.useMemo(() => {
    const totalShares = purchaseRecords.reduce((sum, record) => sum + record.shares, 0);
    const totalCost = purchaseRecords.reduce((sum, record) => sum + (record.shares * record.price), 0);
    const totalFees = purchaseRecords.reduce((sum, record) => sum + (record.fees || 0), 0);
    const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
    const currentValue = totalShares * stock.currentPrice;
    const totalInvestment = totalCost + totalFees;
    const unrealizedGainLoss = currentValue - totalInvestment;
    const unrealizedGainLossPercent = totalInvestment > 0 ? (unrealizedGainLoss / totalInvestment) * 100 : 0;

    return {
      totalShares,
      totalCost,
      totalFees,
      avgPrice,
      currentValue,
      totalInvestment,
      unrealizedGainLoss,
      unrealizedGainLossPercent,
      recordCount: purchaseRecords.length
    };
  }, [purchaseRecords, stock.currentPrice]);

  // 處理編輯記錄
  const handleEditRecord = (recordId: string) => {
    const record = purchaseRecords.find(r => r.id === recordId);
    if (record) {
      setNewRecord({
        date: record.date,
        shares: record.shares,
        price: record.price,
        fees: record.fees,
        notes: record.notes
      });
      setEditingRecordId(recordId);
      setIsAddingRecord(true);
    }
  };

  // 處理更新記錄
  const handleUpdateRecord = () => {
    if (!newRecord.shares || !newRecord.price || !newRecord.date) {
      alert('請填寫完整的購買資訊');
      return;
    }

    if (editingRecordId && onUpdateStock) {
      // 更新現有記錄
      onUpdateStock(editingRecordId, {
        shares: newRecord.shares,
        costPrice: newRecord.price,
        purchaseDate: newRecord.date
      });
      
      alert('購買記錄已更新');
    } else {
      // 新增記錄的邏輯保持不變
      alert(`新增購買記錄：${newRecord.shares}股 @ ${newRecord.price}元`);
    }
    
    // 重置表單
    setNewRecord({
      date: new Date(),
      shares: 0,
      price: 0,
      fees: 0,
      notes: ''
    });
    setIsAddingRecord(false);
    setEditingRecordId(null);
  };

  // 處理刪除記錄
  const handleDeleteRecord = (recordId: string) => {
    if (confirm('確定要刪除這筆購買記錄嗎？')) {
      // 這裡應該調用父組件的刪除函數
      alert(`刪除記錄：${recordId}`);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* 主要對話框 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* 標題列 */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div>
              <h2 className="text-xl font-semibold text-white">
                購買記錄管理
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {stock.symbol} - {stock.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 內容區域 */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* 統計資訊 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-slate-400 mb-1">總持股</h3>
                <p className="text-lg font-semibold text-white">
                  {statistics.totalShares.toLocaleString()} 股
                </p>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-slate-400 mb-1">平均成本</h3>
                <p className="text-lg font-semibold text-white">
                  ${statistics.avgPrice.toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-slate-400 mb-1">總投入</h3>
                <p className="text-lg font-semibold text-white">
                  ${statistics.totalInvestment.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-slate-400 mb-1">未實現損益</h3>
                <p className={`text-lg font-semibold ${
                  statistics.unrealizedGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {statistics.unrealizedGainLoss >= 0 ? '+' : ''}
                  ${statistics.unrealizedGainLoss.toFixed(0)} 
                  ({statistics.unrealizedGainLoss >= 0 ? '+' : ''}
                  {statistics.unrealizedGainLossPercent.toFixed(2)}%)
                </p>
              </div>
            </div>

            {/* 新增記錄按鈕 */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">
                購買記錄 ({statistics.recordCount} 筆)
              </h3>
              <button
                onClick={() => setIsAddingRecord(!isAddingRecord)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增記錄
              </button>
            </div>

            {/* 新增記錄表單 */}
            {isAddingRecord && (
              <div className="bg-slate-900 p-4 rounded-lg mb-4">
                <h4 className="text-md font-medium text-white mb-3">
                  {editingRecordId ? '編輯購買記錄' : '新增購買記錄'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      購買日期
                    </label>
                    <input
                      type="date"
                      value={newRecord.date?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setNewRecord(prev => ({
                        ...prev,
                        date: new Date(e.target.value)
                      }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      股數
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newRecord.shares || ''}
                      onChange={(e) => setNewRecord(prev => ({
                        ...prev,
                        shares: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      成本價
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={newRecord.price || ''}
                      onChange={(e) => setNewRecord(prev => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="580.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      手續費
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newRecord.fees || ''}
                      onChange={(e) => setNewRecord(prev => ({
                        ...prev,
                        fees: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    備註
                  </label>
                  <input
                    type="text"
                    value={newRecord.notes || ''}
                    onChange={(e) => setNewRecord(prev => ({
                      ...prev,
                      notes: e.target.value
                    }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="購買備註..."
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setIsAddingRecord(false);
                      setEditingRecordId(null);
                      setNewRecord({
                        date: new Date(),
                        shares: 0,
                        price: 0,
                        fees: 0,
                        notes: ''
                      });
                    }}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleUpdateRecord}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    {editingRecordId ? '更新記錄' : '新增記錄'}
                  </button>
                </div>
              </div>
            )}

            {/* 購買記錄列表 */}
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      購買日期
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      股數
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      成本價
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      投入金額
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      現值
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      損益
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {purchaseRecords.map((record, index) => {
                    const investment = record.shares * record.price + (record.fees || 0);
                    const currentValue = record.shares * stock.currentPrice;
                    const gainLoss = currentValue - investment;
                    const gainLossPercent = investment > 0 ? (gainLoss / investment) * 100 : 0;

                    return (
                      <tr key={record.id} className="hover:bg-slate-800">
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {record.date.toLocaleDateString('zh-TW')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {record.shares.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          ${record.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          ${investment.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          ${currentValue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`${
                            gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(0)} 
                            ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditRecord(record.id)}
                              className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded hover:bg-slate-700"
                              title="編輯記錄"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-slate-700"
                              title="刪除記錄"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 底部按鈕 */}
          <div className="flex justify-end space-x-3 p-6 border-t border-slate-700">
            <button
              onClick={onClose}
              className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PurchaseHistoryManager;