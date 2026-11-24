// 服務層匯出

export { stockPriceService, stockService, StockPriceService } from './stockPriceService';
export { storageService, StorageService } from './storageService';
export { 
  StockSymbolAnalyzer, 
  analyzeStockSymbol, 
  getStockSuffixes, 
  getStockType, 
  getMarketType, 
  isValidStockSymbol 
} from './stockSymbolAnalyzer';

// 新的標準化服務
export { APIManager, apiManager, APIProvider, APIProviderPriority, APIProviderStatus } from './apiManager';
export { YahooFinanceAPIProvider, yahooFinanceAPI, YahooFinanceError, YahooFinanceErrorType } from './yahooFinanceAPI';
export { FinMindAPIProvider, finMindAPI } from './finMindAPI';
export { StockDataMerger, DataSourcePriority, getStockPrice as getMergedStockPrice, getBatchStockPrices as getBatchMergedStockPrices } from './stockDataMerger';
export { StockPriceCache, stockPriceCache, CacheEntry, CacheStats } from './stockPriceCache';
export { 
  UnifiedStockPriceService, 
  unifiedStockPriceService,
  getStockPrice,
  getBatchStockPrices,
  searchStock,
  getStockName
} from './unifiedStockPriceService';