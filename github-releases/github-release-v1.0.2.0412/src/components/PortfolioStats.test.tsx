import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PortfolioStats from './PortfolioStats';
import type { StockRecord } from '../types';

// 測試用的股票資料
const mockStocks: StockRecord[] = [
  {
    id: '1',
    accountId: 'account1',
    symbol: '2330',
    name: '台積電',
    shares: 1000,
    costPrice: 500,
    adjustedCostPrice: 480, // 有股息調整
    purchaseDate: new Date('2023-01-01'),
    currentPrice: 550,
    lastUpdated: new Date(),
    priceSource: 'TWSE'
  },
  {
    id: '2',
    accountId: 'account1',
    symbol: '2317',
    name: '鴻海',
    shares: 2000,
    costPrice: 100,
    adjustedCostPrice: 100, // 無股息調整
    purchaseDate: new Date('2023-02-01'),
    currentPrice: 110,
    lastUpdated: new Date(),
    priceSource: 'TWSE'
  },
  {
    id: '3',
    accountId: 'account2', // 不同帳戶
    symbol: '2454',
    name: '聯發科',
    shares: 500,
    costPrice: 800,
    adjustedCostPrice: 800,
    purchaseDate: new Date('2023-03-01'),
    currentPrice: 750,
    lastUpdated: new Date(),
    priceSource: 'TWSE'
  }
];

describe('PortfolioStats', () => {
  it('應該正確顯示投資組合統計', () => {
    render(
      <PortfolioStats
        stocks={mockStocks}
        currentAccountId="account1"
        isPrivacyMode={false}
      />
    );

    // 檢查標題
    expect(screen.getByText('投資組合統計')).toBeInTheDocument();

    // 檢查統計項目
    expect(screen.getByText('總市值')).toBeInTheDocument();
    expect(screen.getByText('總成本')).toBeInTheDocument();
    expect(screen.getByText('總損益')).toBeInTheDocument();
    expect(screen.getByText('股息收入')).toBeInTheDocument();

    // 檢查計算結果
    // 總市值: (1000 * 550) + (2000 * 110) = 550,000 + 220,000 = 770,000
    expect(screen.getByText('$770,000')).toBeInTheDocument();

    // 總成本: (1000 * 480) + (2000 * 100) = 480,000 + 200,000 = 680,000
    expect(screen.getByText('$680,000')).toBeInTheDocument();

    // 總損益: 770,000 - 680,000 = +90,000
    expect(screen.getByText('+90000')).toBeInTheDocument();

    // 股息收入: 1000 * (500 - 480) = 20,000
    expect(screen.getByText('$20,000')).toBeInTheDocument();
  });

  it('應該在隱私模式下隱藏金額', () => {
    render(
      <PortfolioStats
        stocks={mockStocks}
        currentAccountId="account1"
        isPrivacyMode={true}
      />
    );

    // 檢查隱私遮罩
    const maskedValues = screen.getAllByText('****');
    expect(maskedValues.length).toBeGreaterThan(0);

    // 檢查百分比遮罩
    expect(screen.getByText('**%')).toBeInTheDocument();
  });

  it('應該只顯示當前帳戶的股票統計', () => {
    render(
      <PortfolioStats
        stocks={mockStocks}
        currentAccountId="account2"
        isPrivacyMode={false}
      />
    );

    // account2 只有一支股票：聯發科
    // 總市值: 500 * 750 = 375,000
    expect(screen.getByText('$375,000')).toBeInTheDocument();

    // 總成本: 500 * 800 = 400,000
    expect(screen.getByText('$400,000')).toBeInTheDocument();

    // 總損益: 375,000 - 400,000 = -25,000
    const lossElements = screen.getAllByText('-25000');
    expect(lossElements.length).toBeGreaterThan(0);
    expect(lossElements[0]).toBeInTheDocument();

    // 持股檔數: 1 檔
    expect(screen.getByText('1 檔')).toBeInTheDocument();
  });

  it('應該在沒有股票時顯示空狀態', () => {
    render(
      <PortfolioStats
        stocks={[]}
        currentAccountId="account1"
        isPrivacyMode={false}
      />
    );

    // 檢查空狀態訊息
    expect(screen.getByText('尚無投資資料')).toBeInTheDocument();
    expect(screen.getByText('新增股票後即可查看投資組合統計')).toBeInTheDocument();
  });

  it('應該正確計算損益率', () => {
    render(
      <PortfolioStats
        stocks={mockStocks}
        currentAccountId="account1"
        isPrivacyMode={false}
      />
    );

    // 損益率: (90,000 / 680,000) * 100 = 13.24%
    expect(screen.getByText('+13.24%')).toBeInTheDocument();
  });

  it('應該正確顯示股息收入', () => {
    const stocksWithDividends: StockRecord[] = [
      {
        id: '1',
        accountId: 'account1',
        symbol: '2330',
        name: '台積電',
        shares: 1000,
        costPrice: 500,
        adjustedCostPrice: 480, // 股息調整: 500 - 480 = 20
        purchaseDate: new Date('2023-01-01'),
        currentPrice: 550,
        lastUpdated: new Date(),
        priceSource: 'TWSE'
      },
      {
        id: '2',
        accountId: 'account1',
        symbol: '2317',
        name: '鴻海',
        shares: 2000,
        costPrice: 100,
        adjustedCostPrice: 95, // 股息調整: 100 - 95 = 5
        purchaseDate: new Date('2023-02-01'),
        currentPrice: 110,
        lastUpdated: new Date(),
        priceSource: 'TWSE'
      }
    ];

    render(
      <PortfolioStats
        stocks={stocksWithDividends}
        currentAccountId="account1"
        isPrivacyMode={false}
      />
    );

    // 股息收入: (1000 * 20) + (2000 * 5) = 20,000 + 10,000 = 30,000
    expect(screen.getByText('$30,000')).toBeInTheDocument();
  });

  it('應該正確顯示損益顏色', () => {
    // 測試獲利情況（綠色）
    const profitableStocks: StockRecord[] = [
      {
        id: '1',
        accountId: 'account1',
        symbol: '2330',
        name: '台積電',
        shares: 1000,
        costPrice: 500,
        adjustedCostPrice: 500,
        purchaseDate: new Date('2023-01-01'),
        currentPrice: 600, // 獲利
        lastUpdated: new Date(),
        priceSource: 'TWSE'
      }
    ];

    const { rerender } = render(
      <PortfolioStats
        stocks={profitableStocks}
        currentAccountId="account1"
        isPrivacyMode={false}
      />
    );

    // 檢查獲利顯示為綠色
    const gainLossElements = screen.getAllByText('+100000');
    expect(gainLossElements.length).toBeGreaterThan(0);
    expect(gainLossElements[0]).toHaveClass('text-green-400');

    // 測試虧損情況（紅色）
    const lossStocks: StockRecord[] = [
      {
        id: '1',
        accountId: 'account1',
        symbol: '2330',
        name: '台積電',
        shares: 1000,
        costPrice: 500,
        adjustedCostPrice: 500,
        purchaseDate: new Date('2023-01-01'),
        currentPrice: 400, // 虧損
        lastUpdated: new Date(),
        priceSource: 'TWSE'
      }
    ];

    rerender(
      <PortfolioStats
        stocks={lossStocks}
        currentAccountId="account1"
        isPrivacyMode={false}
      />
    );

    // 檢查虧損顯示為紅色
    const lossElements = screen.getAllByText('-100000');
    expect(lossElements.length).toBeGreaterThan(0);
    expect(lossElements[0]).toHaveClass('text-red-400');
  });

  it('應該正確計算平均成本', () => {
    render(
      <PortfolioStats
        stocks={mockStocks}
        currentAccountId="account1"
        isPrivacyMode={false}
      />
    );

    // account1 有 2 支股票，總成本 680,000
    // 平均成本: 680,000 / 2 = 340,000
    expect(screen.getByText('$340000')).toBeInTheDocument();
  });
});