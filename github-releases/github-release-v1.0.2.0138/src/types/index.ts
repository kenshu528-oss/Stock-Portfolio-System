// 核心資料模型與型別定義

// 股票記錄介面
export interface StockRecord {
  id: string;                    // 唯一識別碼
  accountId: string;             // 所屬帳戶ID
  symbol: string;                // 股票代碼
  name: string;                  // 股票名稱
  shares: number;                // 持股數
  costPrice: number;             // 原始成本價
  adjustedCostPrice: number;     // 調整成本價（扣除股息）
  purchaseDate: Date;            // 購買日期
  currentPrice: number;          // 現價
  lastUpdated: Date;             // 最後更新時間
  priceSource: 'TWSE' | 'Yahoo' | 'Investing'; // 價格來源
  dividendRecords?: DividendRecord[]; // 股息記錄（可選）
  lastDividendUpdate?: string;   // 最後股息更新時間（ISO字串）
  isBondETF?: boolean;           // 是否為債券ETF
  transactionTaxRate?: number;   // 個別證交稅率（%，覆蓋預設值）
}

// 帳戶介面
export interface Account {
  id: string;                    // 帳戶ID
  name: string;                  // 帳戶名稱
  stockCount: number;            // 股票數量（用於UI顯示）
  brokerageFee: number;          // 證券手續費率（預設0.1425%）
  transactionTax: number;        // 交易稅率（固定0.3%，賣出時適用）
  createdAt?: Date;              // 建立時間
}

// 除權息記錄介面（完整版）
export interface DividendRecord {
  id: string;                    // 唯一識別碼
  stockId: string;               // 關聯的股票記錄ID
  symbol: string;                // 股票代碼
  exRightDate: Date;             // 除權息日期（統一命名）
  
  // 現金股利（除息）
  cashDividendPerShare: number;  // 每股現金股利
  totalCashDividend: number;     // 總現金股利金額
  
  // 股票股利（除權/配股）
  stockDividendRatio: number;    // 配股比例（每1000股配X股）
  stockDividendShares: number;   // 配得股數
  
  // 記錄時的持股狀況
  sharesBeforeRight: number;     // 除權息前持股數
  sharesAfterRight: number;      // 除權息後持股數（含配股）
  
  // 成本價調整
  costPriceBeforeRight: number;  // 除權息前成本價
  costPriceAfterRight: number;   // 除權息後調整成本價
  
  // 其他資訊
  recordDate?: Date;             // 停止過戶日
  paymentDate?: Date;            // 發放日
  type: 'cash' | 'stock' | 'both'; // 除權息類型
  
  // 向後相容性（保留舊欄位）
  /** @deprecated 使用 exRightDate 替代 */
  exDividendDate?: Date;
  /** @deprecated 使用 cashDividendPerShare 替代 */
  dividendPerShare?: number;
  /** @deprecated 使用 totalCashDividend 替代 */
  totalDividend?: number;
  /** @deprecated 使用 sharesBeforeRight 替代 */
  shares?: number;
}

// 投資組合統計介面
export interface PortfolioStats {
  totalMarketValue: number;      // 總市值
  totalCost: number;             // 總成本
  totalGainLoss: number;         // 總損益
  totalGainLossPercent: number;  // 總損益率
  totalDividend: number;         // 總股息收入
  totalReturn: number;           // 總報酬（損益+股息）
  todayChange: number;           // 今日變化
  todayChangePercent: number;    // 今日變化率
}

// 股票搜尋結果介面
export interface StockSearchResult {
  symbol: string;                // 股票代碼
  name: string;                  // 股票名稱
  market: string;                // 市場標示
  price?: number;                // 股價
  change?: number;               // 漲跌金額
  changePercent?: number;        // 漲跌百分比
}

// 股票價格介面
export interface StockPrice {
  symbol: string;                // 股票代碼
  price: number;                 // 股價
  change: number;                // 漲跌金額
  changePercent: number;         // 漲跌百分比
  timestamp: Date;               // 時間戳記
  source: 'TWSE' | 'Yahoo' | 'Investing'; // 價格來源
}

// 表單資料介面
export interface StockFormData {
  symbol: string;                // 股票代碼
  name: string;                  // 股票名稱
  price: number;                 // 股價
  shares: string;                // 持股數（字串形式用於表單）
  costPrice: string;             // 成本價（字串形式用於表單）
  purchaseDate: string;          // 購買日期（ISO字串）
  account: string;               // 所屬帳戶
}

// 應用程式資料介面
export interface AppData {
  accounts: Account[];           // 帳戶列表
  stocks: StockRecord[];         // 股票記錄列表
  dividends: DividendRecord[];   // 股息記錄列表
  settings: UserSettings;        // 使用者設定
  lastModified: Date;            // 最後修改時間
}

// 使用者設定介面
export interface UserSettings {
  privacyMode: boolean;          // 隱私模式
  autoRefresh: boolean;          // 自動重新整理
  refreshInterval: number;       // 重新整理間隔（秒）
  defaultAccount: string;        // 預設帳戶
  githubToken?: string;          // GitHub Token（雲端同步）
  theme: 'dark' | 'light';       // 主題（目前只支援深色）
}

// 匯入結果介面
export interface ImportResult {
  success: boolean;              // 匯入是否成功
  accounts: Account[];           // 匯入的帳戶
  stocks: StockRecord[];         // 匯入的股票記錄
  conflicts: ConflictInfo[];     // 衝突資訊
  errors: string[];              // 錯誤訊息
}

// 衝突資訊介面
export interface ConflictInfo {
  type: 'account' | 'stock';     // 衝突類型
  existingId: string;            // 現有記錄ID
  newData: Account | StockRecord; // 新資料
  field: string;                 // 衝突欄位
}

// 驗證錯誤介面
export interface ValidationError {
  field: string;                 // 欄位名稱
  message: string;               // 錯誤訊息
  code: string;                  // 錯誤代碼
}

// API回應介面
export interface ApiResponse<T> {
  success: boolean;              // 請求是否成功
  data?: T;                      // 回應資料
  error?: string;                // 錯誤訊息
  source?: string;               // 資料來源
}

// 同步狀態介面
export interface SyncStatus {
  isEnabled: boolean;            // 是否啟用同步
  lastSync: Date | null;         // 最後同步時間
  status: 'idle' | 'syncing' | 'error'; // 同步狀態
  error?: string;                // 錯誤訊息
}