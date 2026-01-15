/**
 * 分級 Logger 系統
 * 用於控制 Console Log 輸出量，避免過多 log 影響開發體驗
 */

export const LogLevel = {
  ERROR: 0,   // 錯誤：必須顯示
  WARN: 1,    // 警告：重要提示
  INFO: 2,    // 資訊：一般訊息
  DEBUG: 3,   // 調試：詳細資訊
  TRACE: 4    // 追蹤：超詳細資訊
} as const;

export type LogModule = 
  | 'global'
  | 'dividend'
  | 'stock'
  | 'api'
  | 'cloud'
  | 'import'
  | 'export'
  | 'rights';

// 各模組的 Log 等級設定
const LOG_CONFIG: Record<LogModule, number> = {
  global: LogLevel.INFO,      // 全域預設：一般訊息
  dividend: LogLevel.INFO,    // 股息：一般訊息
  stock: LogLevel.INFO,       // 股票：一般訊息
  api: LogLevel.WARN,         // API：只顯示警告
  cloud: LogLevel.INFO,       // 雲端同步：一般訊息
  import: LogLevel.INFO,      // 匯入：一般訊息
  export: LogLevel.INFO,      // 匯出：一般訊息
  rights: LogLevel.INFO       // 配股：一般訊息
};

/**
 * 設定模組的 Log 等級
 * @example
 * // 開啟股息模組的詳細 log
 * setLogLevel('dividend', LogLevel.DEBUG);
 */
export const setLogLevel = (module: LogModule, level: number) => {
  LOG_CONFIG[module] = level;
  console.log(`📝 Log 等級設定: [${module}] = ${getLevelName(level)}`);
};

/**
 * 取得等級名稱
 */
const getLevelName = (level: number): string => {
  const names = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
  return names[level] || 'UNKNOWN';
};

/**
 * 格式化資料輸出
 */
const formatData = (data: any): string => {
  if (data === undefined) return '';
  if (typeof data === 'string') return data;
  if (typeof data === 'number' || typeof data === 'boolean') return String(data);
  
  try {
    // 物件只顯示關鍵欄位，避免過長
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      if (keys.length > 5) {
        const preview = keys.slice(0, 5).reduce((acc, key) => {
          acc[key] = data[key];
          return acc;
        }, {} as any);
        return JSON.stringify(preview) + ` ...(+${keys.length - 5} more)`;
      }
    }
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
};

/**
 * Logger 主要介面
 */
export const logger = {
  /**
   * 錯誤訊息（總是顯示）
   */
  error: (module: LogModule, msg: string, data?: any) => {
    console.error(`❌ [${module}] ${msg}`, data !== undefined ? formatData(data) : '');
  },

  /**
   * 警告訊息
   */
  warn: (module: LogModule, msg: string, data?: any) => {
    const level = LOG_CONFIG[module] ?? LOG_CONFIG.global;
    if (level >= LogLevel.WARN) {
      console.warn(`⚠️ [${module}] ${msg}`, data !== undefined ? formatData(data) : '');
    }
  },

  /**
   * 一般訊息
   */
  info: (module: LogModule, msg: string, data?: any) => {
    const level = LOG_CONFIG[module] ?? LOG_CONFIG.global;
    if (level >= LogLevel.INFO) {
      console.log(`ℹ️ [${module}] ${msg}`, data !== undefined ? formatData(data) : '');
    }
  },

  /**
   * 調試訊息（詳細）
   */
  debug: (module: LogModule, msg: string, data?: any) => {
    const level = LOG_CONFIG[module] ?? LOG_CONFIG.global;
    if (level >= LogLevel.DEBUG) {
      console.log(`🔍 [${module}] ${msg}`, data !== undefined ? formatData(data) : '');
    }
  },

  /**
   * 追蹤訊息（超詳細）
   */
  trace: (module: LogModule, msg: string, data?: any) => {
    const level = LOG_CONFIG[module] ?? LOG_CONFIG.global;
    if (level >= LogLevel.TRACE) {
      console.log(`🔬 [${module}] ${msg}`, data !== undefined ? formatData(data) : '');
    }
  },

  /**
   * 成功訊息
   */
  success: (module: LogModule, msg: string, data?: any) => {
    const level = LOG_CONFIG[module] ?? LOG_CONFIG.global;
    if (level >= LogLevel.INFO) {
      console.log(`✅ [${module}] ${msg}`, data !== undefined ? formatData(data) : '');
    }
  }
};

/**
 * 開發者工具：快速設定 log 等級
 * 在瀏覽器 Console 中使用：
 * 
 * @example
 * // 開啟股息模組的詳細 log
 * window.setLogLevel('dividend', 3);
 * 
 * // 開啟所有模組的詳細 log
 * window.setLogLevel('global', 4);
 */
if (typeof window !== 'undefined') {
  (window as any).setLogLevel = setLogLevel;
  (window as any).LogLevel = LogLevel;
  console.log('💡 提示: 使用 window.setLogLevel("模組", 等級) 調整 log 輸出');
}
