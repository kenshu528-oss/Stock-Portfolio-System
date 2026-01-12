// 交易成本計算工具

export interface TransactionCosts {
  brokerageFee: number;      // 手續費
  transactionTax: number;    // 交易稅（僅賣出）
  totalCosts: number;        // 總成本
}

export interface BuyCosts extends TransactionCosts {
  netAmount: number;         // 實際支付金額（含手續費）
}

export interface SellCosts extends TransactionCosts {
  netAmount: number;         // 實際收到金額（扣除手續費和交易稅）
}

/**
 * 計算買入成本
 * @param shares 股數
 * @param price 股價
 * @param brokerageFeeRate 手續費率（%）
 * @returns 買入成本詳情
 */
export function calculateBuyCosts(
  shares: number, 
  price: number, 
  brokerageFeeRate: number
): BuyCosts {
  const grossAmount = shares * price;
  const brokerageFee = Math.round(grossAmount * (brokerageFeeRate / 100));
  const transactionTax = 0; // 買入無交易稅
  const totalCosts = brokerageFee + transactionTax;
  const netAmount = grossAmount + totalCosts;

  return {
    brokerageFee,
    transactionTax,
    totalCosts,
    netAmount
  };
}

/**
 * 計算賣出成本
 * @param shares 股數
 * @param price 股價
 * @param brokerageFeeRate 手續費率（%）
 * @param transactionTaxRate 交易稅率（%，預設0.3%）
 * @returns 賣出成本詳情
 */
export function calculateSellCosts(
  shares: number, 
  price: number, 
  brokerageFeeRate: number,
  transactionTaxRate: number = 0.3
): SellCosts {
  const grossAmount = shares * price;
  const brokerageFee = Math.round(grossAmount * (brokerageFeeRate / 100));
  const transactionTax = Math.round(grossAmount * (transactionTaxRate / 100));
  const totalCosts = brokerageFee + transactionTax;
  const netAmount = grossAmount - totalCosts;

  return {
    brokerageFee,
    transactionTax,
    totalCosts,
    netAmount
  };
}

/**
 * 計算實際成本價（包含買入手續費）
 * @param shares 股數
 * @param price 原始股價
 * @param brokerageFeeRate 手續費率（%）
 * @returns 實際成本價
 */
export function calculateActualCostPrice(
  shares: number, 
  price: number, 
  brokerageFeeRate: number
): number {
  const buyCosts = calculateBuyCosts(shares, price, brokerageFeeRate);
  return buyCosts.netAmount / shares;
}

/**
 * 計算實際賣出價格（扣除所有費用後）
 * @param shares 股數
 * @param price 原始股價
 * @param brokerageFeeRate 手續費率（%）
 * @param transactionTaxRate 交易稅率（%）
 * @returns 實際賣出價格
 */
export function calculateActualSellPrice(
  shares: number, 
  price: number, 
  brokerageFeeRate: number,
  transactionTaxRate: number = 0.3
): number {
  const sellCosts = calculateSellCosts(shares, price, brokerageFeeRate, transactionTaxRate);
  return sellCosts.netAmount / shares;
}

/**
 * 計算損益（考慮所有交易成本）
 * @param shares 股數
 * @param buyPrice 買入價格
 * @param sellPrice 賣出價格
 * @param brokerageFeeRate 手續費率（%）
 * @param transactionTaxRate 交易稅率（%）
 * @returns 實際損益
 */
export function calculateRealizedGainLoss(
  shares: number,
  buyPrice: number,
  sellPrice: number,
  brokerageFeeRate: number,
  transactionTaxRate: number = 0.3
): {
  grossGainLoss: number;     // 毛損益
  buyCosts: BuyCosts;        // 買入成本
  sellCosts: SellCosts;      // 賣出成本
  netGainLoss: number;       // 淨損益
  totalTransactionCosts: number; // 總交易成本
} {
  const buyCosts = calculateBuyCosts(shares, buyPrice, brokerageFeeRate);
  const sellCosts = calculateSellCosts(shares, sellPrice, brokerageFeeRate, transactionTaxRate);
  
  const grossGainLoss = (sellPrice - buyPrice) * shares;
  const totalTransactionCosts = buyCosts.totalCosts + sellCosts.totalCosts;
  const netGainLoss = sellCosts.netAmount - buyCosts.netAmount;

  return {
    grossGainLoss,
    buyCosts,
    sellCosts,
    netGainLoss,
    totalTransactionCosts
  };
}

/**
 * 台灣股市交易成本常數
 */
export const TAIWAN_STOCK_CONSTANTS = {
  DEFAULT_BROKERAGE_FEE: 0.1425,  // 預設手續費率 0.1425%
  TRANSACTION_TAX: 0.3,           // 交易稅率 0.3%（固定）
  MIN_BROKERAGE_FEE: 20,          // 最低手續費 20 元
  MAX_BROKERAGE_FEE_RATE: 0.1425  // 最高手續費率 0.1425%
} as const;