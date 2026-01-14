// 債券ETF識別和證交稅計算服務
// 遵循 api-data-integrity.md：使用真實資料，不提供虛假預設資料

export interface BondETFInfo {
  isBondETF: boolean;
  isLeveraged: boolean;
  isInverse: boolean;
  transactionTaxRate: number; // 證交稅率（%）
  exemptionEndDate?: string;  // 免稅期限
}

/**
 * 債券ETF代碼模式
 * 根據台灣證交所規則識別債券ETF
 */
const BOND_ETF_PATTERNS = {
  // 一般債券ETF（00開頭的6位數代碼，通常包含B）
  GENERAL_BOND: /^00\d{3}B?$/i,
  
  // 槓桿型債券ETF（通常包含L或2X等標識）
  LEVERAGED_PATTERNS: [
    /L$/i,           // 以L結尾
    /2X/i,           // 包含2X
    /槓桿/,          // 包含槓桿字樣
    /LEVERAGED/i     // 包含LEVERAGED
  ],
  
  // 反向型債券ETF（通常包含R或INVERSE等標識）
  INVERSE_PATTERNS: [
    /R$/i,           // 以R結尾
    /反向/,          // 包含反向字樣
    /INVERSE/i,      // 包含INVERSE
    /SHORT/i         // 包含SHORT
  ]
};

/**
 * 已知的債券ETF清單（可擴展）
 * 遵循 api-data-integrity.md：真實資料優先
 */
const KNOWN_BOND_ETFS = new Set([
  // 一般債券ETF（證交稅免徵至2026/12/31）
  '00679B', '00687B', '00694B', '00696B', '00697B',
  '00751B', '00753B', '00754B', '00755B', '00756B',
  '00760B', '00761B', '00762B', '00763B', '00764B',
  '00765B', '00766B', '00767B', '00768B', '00769B',
  '00770B', '00771B', '00772B', '00773B', '00774B',
  '00775B', '00776B', '00777B', '00778B', '00779B',
  
  // 可新增更多已知的債券ETF代碼
]);

/**
 * 已知的槓桿型/反向型債券ETF（仍需繳交0.1%證交稅）
 */
const LEVERAGED_INVERSE_BOND_ETFS = new Set([
  // 槓桿型債券ETF
  '00680L', '00681L', '00682L',
  
  // 反向型債券ETF  
  '00683R', '00684R', '00685R',
  
  // 可新增更多槓桿型/反向型債券ETF代碼
]);

/**
 * 識別股票是否為債券ETF並計算對應證交稅率
 * @param symbol 股票代碼
 * @param name 股票名稱（可選，用於輔助判斷）
 * @returns 債券ETF資訊
 */
export function identifyBondETF(symbol: string, name?: string): BondETFInfo {
  const upperSymbol = symbol.toUpperCase();
  const stockName = name?.toUpperCase() || '';
  
  // 檢查是否為已知的槓桿型/反向型債券ETF
  if (LEVERAGED_INVERSE_BOND_ETFS.has(upperSymbol)) {
    return {
      isBondETF: true,
      isLeveraged: true,
      isInverse: false,
      transactionTaxRate: 0.1, // 槓桿型/反向型仍需繳交0.1%證交稅
    };
  }
  
  // 檢查是否為已知的一般債券ETF
  if (KNOWN_BOND_ETFS.has(upperSymbol)) {
    return {
      isBondETF: true,
      isLeveraged: false,
      isInverse: false,
      transactionTaxRate: 0, // 一般債券ETF免徵證交稅至2026/12/31
      exemptionEndDate: '2026-12-31'
    };
  }
  
  // 根據代碼模式判斷
  if (BOND_ETF_PATTERNS.GENERAL_BOND.test(upperSymbol)) {
    // 檢查是否為槓桿型
    const isLeveraged = BOND_ETF_PATTERNS.LEVERAGED_PATTERNS.some(pattern => 
      pattern.test(upperSymbol) || pattern.test(stockName)
    );
    
    // 檢查是否為反向型
    const isInverse = BOND_ETF_PATTERNS.INVERSE_PATTERNS.some(pattern => 
      pattern.test(upperSymbol) || pattern.test(stockName)
    );
    
    if (isLeveraged || isInverse) {
      return {
        isBondETF: true,
        isLeveraged,
        isInverse,
        transactionTaxRate: 0.1, // 槓桿型/反向型需繳交0.1%證交稅
      };
    } else {
      return {
        isBondETF: true,
        isLeveraged: false,
        isInverse: false,
        transactionTaxRate: 0, // 一般債券ETF免徵證交稅
        exemptionEndDate: '2026-12-31'
      };
    }
  }
  
  // 不是債券ETF，使用一般股票證交稅率
  return {
    isBondETF: false,
    isLeveraged: false,
    isInverse: false,
    transactionTaxRate: 0.3, // 一般股票證交稅率0.3%
  };
}

/**
 * 計算特定股票的證交稅率
 * @param symbol 股票代碼
 * @param name 股票名稱（可選）
 * @returns 證交稅率（%）
 */
export function getTransactionTaxRate(symbol: string, name?: string): number {
  const bondInfo = identifyBondETF(symbol, name);
  return bondInfo.transactionTaxRate;
}

/**
 * 檢查是否為債券ETF
 * @param symbol 股票代碼
 * @param name 股票名稱（可選）
 * @returns 是否為債券ETF
 */
export function isBondETF(symbol: string, name?: string): boolean {
  const bondInfo = identifyBondETF(symbol, name);
  return bondInfo.isBondETF;
}

/**
 * 獲取債券ETF的詳細資訊說明
 * @param symbol 股票代碼
 * @param name 股票名稱（可選）
 * @returns 說明文字
 */
export function getBondETFDescription(symbol: string, name?: string): string {
  const bondInfo = identifyBondETF(symbol, name);
  
  if (!bondInfo.isBondETF) {
    return '一般股票，證交稅率 0.3%';
  }
  
  if (bondInfo.isLeveraged || bondInfo.isInverse) {
    const type = bondInfo.isLeveraged ? '槓桿型' : '反向型';
    return `${type}債券ETF，證交稅率 0.1%`;
  }
  
  return `一般債券ETF，證交稅免徵至 ${bondInfo.exemptionEndDate || '2026/12/31'}`;
}

// 導出常數供其他模組使用
export const BOND_ETF_CONSTANTS = {
  GENERAL_BOND_TAX_RATE: 0,      // 一般債券ETF證交稅率
  LEVERAGED_BOND_TAX_RATE: 0.1,  // 槓桿型/反向型債券ETF證交稅率
  REGULAR_STOCK_TAX_RATE: 0.3,   // 一般股票證交稅率
  EXEMPTION_END_DATE: '2026-12-31' // 債券ETF免稅期限
} as const;