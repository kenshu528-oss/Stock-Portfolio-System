// 改版記錄管理
export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch' | 'hotfix';
  title: string;
  description: string;
  changes: string[];
  fixes?: string[];
  breaking?: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.2.0036',
    date: '2026-01-12',
    type: 'major',
    title: '修復雲端同步功能：支援 GitHub Pages 跨平台同步',
    description: '完全修復雲端同步功能，移除錯誤的環境限制，實現 GitHub Pages 上的完整雲端同步能力，支援跨平台（手機、電腦、家人）資料共享。',
    changes: [
      '移除錯誤的環境檢測限制，所有環境都支援雲端同步',
      '確認 GitHub API 支援 CORS，可直接從瀏覽器調用',
      '簡化 GitHubGistService 實作，移除不必要的代理邏輯',
      '參考 Stock-Accumulation 成功案例的實作方式',
      '更新環境檢測邏輯，正確識別雲端同步可用性',
      '完整的版本歸檔和倉庫隔離規則遵循'
    ],
    fixes: [
      '修復 GitHub Pages 上雲端同步功能顯示「不可用」的問題',
      '修復過度工程化導致的 API 調用複雜性',
      '修復環境檢測邏輯錯誤導致的功能限制'
    ]
  },
  {
    version: '1.0.2.0035',
    date: '2026-01-12',
    type: 'minor',
    title: '完善 RESET 功能：完全符合規格定義的預設狀態',
    description: '根據開發規格文件和 appStore 初始狀態定義，完善恢復預設值功能，確保 RESET 後所有狀態都恢復到規格要求的預設值。',
    changes: [
      '根據規格創建兩個預設帳戶（帳戶1、帳戶2）而非單一帳戶',
      '確保隱私模式預設啟用（符合規格：預設啟用，保護敏感資料）',
      '確保成本價顯示模式為預設值（顯示原始成本價）',
      '重置所有 UI 狀態到預設值（關閉側邊欄、帳戶管理、新增股票表單）',
      '添加詳細的狀態重置日誌記錄',
      '完全符合開發規格文件中的預設狀態定義'
    ],
    fixes: [
      '修復 RESET 後只創建一個帳戶的問題（應為兩個）',
      '修復成本價顯示模式沒有重置的問題',
      '修復 UI 狀態沒有重置的問題'
    ]
  },
  {
    version: '1.0.2.0034',
    date: '2026-01-12',
    type: 'hotfix',
    title: '修復：RESET 後預設值應該啟用隱私模式',
    description: '修復恢復預設值後隱私模式邏輯錯誤的問題，確保 RESET 後預設不顯示金額，保護用戶隱私。',
    changes: [
      'RESET 後預設啟用隱私模式（不顯示金額）',
      '修正隱私模式重置邏輯，從關閉改為確保啟用',
      '添加 RESET 隱私模式設定的調試日誌',
      '符合安全開發規則中的隱私保護要求'
    ],
    fixes: [
      '修復 RESET 後隱私模式被錯誤關閉的問題',
      '修復預設值不符合隱私保護原則的問題'
    ]
  },
  {
    version: '1.0.2.0033',
    date: '2026-01-12',
    type: 'hotfix',
    title: '修復：RESET 後未自動顯示初始設定對話框',
    description: '修復恢復預設值後沒有自動跳出 GitHub Token 設定頁面的問題，確保用戶在 RESET 後能立即進行初始設定。',
    changes: [
      'RESET 後重置初始設定檢查狀態',
      '恢復預設值後自動觸發初始設定檢查',
      '添加詳細的調試日誌幫助問題排查',
      '確保 RESET 後用戶體驗的連續性'
    ],
    fixes: [
      '修復 RESET 後沒有自動顯示 TOKEN 設定頁面的問題',
      '修復 hasCheckedToken 狀態沒有重置的問題'
    ]
  },
  {
    version: '1.0.2.0032',
    date: '2026-01-12',
    type: 'hotfix',
    title: '緊急修復：雲端下載後隱私模式未自動啟用',
    description: '修復雲端下載後隱私模式沒有自動啟用的問題，確保用戶資料安全，符合雲端同步開發規範中「預設啟用隱私模式保護用戶資料」的要求。',
    changes: [
      '雲端下載後自動啟用隱私模式保護用戶資料',
      '統一 handleCloudDataSync 和 handleDataSync 的隱私模式設定',
      '添加隱私模式啟用的操作日誌記錄',
      '確保符合雲端同步開發規範的安全要求'
    ],
    fixes: [
      '修復雲端下載後金額仍然顯示的隱私洩露問題',
      '修復隱私模式沒有按規範自動啟用的問題'
    ]
  },
  {
    version: '1.0.2.0031',
    date: '2026-01-12',
    type: 'minor',
    title: '用戶體驗優化：自動帳戶切換和隱私模式預設',
    description: '優化雲端資料下載後的用戶體驗，自動切換到第一個帳戶並預設啟用隱私模式，讓用戶無需額外操作即可看到股票資料。',
    changes: [
      '雲端資料同步後自動切換到第一個帳戶',
      '預設啟用隱私模式（金額顯示為星號）',
      '用戶無需手動點擊帳戶即可看到股票列表',
      '改善初次使用和資料恢復的體驗',
      '統一兩個雲端同步入口的帳戶切換邏輯'
    ],
    fixes: [
      '修復雲端下載後需要手動點擊帳戶才能看到股票的問題',
      '修復預設顯示金額可能造成隱私洩露的問題'
    ]
  },
  {
    version: '1.0.2.0030',
    date: '2026-01-12',
    type: 'hotfix',
    title: '緊急修復：雲端下載不依賴本地 gistId',
    description: '修復雲端同步功能在恢復預設值後無法下載資料的問題，改用自動搜尋 Gists 的方式，不再依賴本地儲存的 gistId。',
    changes: [
      '修改 handleDownloadFromCloud 使用 downloadData 自動搜尋方法',
      '移除對本地 gistId 的依賴',
      '自動尋找用戶的投資組合 Gists',
      '增強錯誤處理和調試信息',
      '確保恢復預設值後仍能正常下載雲端資料'
    ],
    fixes: [
      '修復恢復預設值後雲端下載失敗的問題',
      '解決「找不到雲端資料，請先上傳資料到雲端」錯誤',
      '修復版本號顯示不正確的問題'
    ]
  },
  {
    version: '1.0.2.0029',
    date: '2026-01-12',
    type: 'hotfix',
    title: '緊急修復：統一雲端同步功能邏輯',
    description: '修復右上角雲端同步功能失敗問題，統一初始設定和雲端同步設定的資料導入邏輯，確保兩個入口都能正常工作。',
    changes: [
      '統一 handleCloudDataSync 和 handleDataSync 的實現邏輯',
      '兩個雲端同步入口都使用相同的 importData 方法',
      '添加延遲頁面重載確保資料正確顯示',
      '移除對 addAccount 和 addStock 的依賴',
      '簡化雲端同步邏輯，提高一致性和可靠性'
    ],
    fixes: [
      '修復右上角雲端同步功能失敗的問題',
      '解決兩個雲端同步入口邏輯不一致的問題',
      '確保所有雲端同步操作都能正確顯示資料'
    ]
  },
  {
    version: '1.0.2.0028',
    date: '2026-01-12',
    type: 'hotfix',
    title: '緊急修復：雲端資料同步後 UI 不更新問題',
    description: '修復雲端資料下載成功但 UI 沒有顯示資料的問題，改用正確的 importData 方法並添加頁面重載確保資料正確顯示。',
    changes: [
      '改用 Zustand store 的 importData 方法進行資料同步',
      '使用 replace 模式完全替換本地資料',
      '添加頁面重載確保 React 組件正確更新',
      '簡化資料同步邏輯，提高可靠性',
      '確保雲端資料能正確顯示在投資組合中'
    ],
    fixes: [
      '修復雲端資料下載成功但 UI 沒有顯示的問題',
      '解決 React 組件沒有正確訂閱 Zustand 狀態變化的問題',
      '修復資料同步後需要手動重新整理才能看到資料的問題'
    ]
  },
  {
    version: '1.0.2.0026',
    date: '2026-01-12',
    type: 'hotfix',
    title: '緊急修復：初始設定雲端下載功能失敗',
    description: '修復初始設定流程中雲端資料下載後沒有正確同步到主系統的問題，確保下載的資料能正確顯示在投資組合中。',
    changes: [
      '修復 InitialSetup 組件中 onDataSync 回調函數的傳遞問題',
      '增強雲端下載的調試信息和錯誤處理',
      '確保下載的資料正確整合到 Zustand store',
      '改善初始設定流程的資料同步邏輯',
      '新增詳細的 Console 調試信息',
      '移除干擾用戶的 alert 彈窗'
    ],
    fixes: [
      '修復初始設定下載雲端資料後仍顯示「沒有資料」的問題',
      '解決 onDataSync 回調函數未正確傳遞的問題',
      '修復資料下載成功但沒有整合到主系統的問題'
    ]
  },
  {
    version: '1.0.2.0025',
    date: '2026-01-12',
    type: 'hotfix',
    title: '緊急修復：股息管理日期處理錯誤',
    description: '修復 DividendManager 組件中的日期處理錯誤，解決 exDividendDate.getTime() is not a function 問題，確保股息記錄功能正常運作。',
    changes: [
      '修復股息記錄日期排序錯誤',
      '新增安全的日期物件檢查機制',
      '修復日期顯示格式問題',
      '改善年度股息計算的日期比較邏輯',
      '增強歷史股息檢查的日期處理',
      '確保所有日期操作的安全性'
    ],
    fixes: [
      '修復 exDividendDate.getTime() is not a function 錯誤',
      '解決股息管理功能崩潰問題',
      '修復個股顯示區塊異常問題'
    ]
  },
  {
    version: '1.0.2.0024',
    date: '2026-01-12',
    type: 'hotfix',
    title: '緊急修復：雲端資料下載同步邏輯問題',
    description: '修復雲端資料下載後沒有完全覆蓋本地資料的問題。之前的邏輯只會添加或更新資料，現在會先清空本地資料再導入雲端資料，確保完全同步。',
    changes: [
      '修復雲端下載邏輯，先清空本地資料再導入雲端資料',
      '確保雲端資料完全覆蓋本地資料，而非僅添加',
      '修復刪除股票後從雲端下載無法恢復的問題',
      '改善資料同步的完整性和一致性',
      '更新本地存儲以保持資料同步',
      '改善同步成功後的日誌訊息'
    ],
    fixes: [
      '修復雲端下載後資料沒有完全恢復的問題',
      '修復本地刪除資料後雲端下載無效的問題'
    ]
  },
  {
    version: '1.0.2.0023',
    date: '2026-01-12',
    type: 'minor',
    title: '完善恢復預設值功能：全面重置應用程式狀態',
    description: '改進恢復預設值功能，現在會清除所有應用程式設定，包括 GitHub Token 和雲端同步設定，提供真正的「全新開始」體驗。',
    changes: [
      '恢復預設值現在會清除 GitHub Token 和相關設定',
      '清除所有雲端同步設定（gistId、lastSyncTime、autoSyncEnabled 等）',
      '清除初始設定跳過標記，重新整理後會顯示初始設定對話框',
      '更新確認對話框，明確說明會清除 GitHub 設定',
      '新增操作完成後的提示訊息',
      '確保完全重置到應用程式初始狀態'
    ]
  },
  {
    version: '1.0.2.0021',
    date: '2026-01-12',
    type: 'hotfix',
    title: '緊急修復：初始設定雲端資料下載整合問題',
    description: '修復初始設定流程中雲端資料下載後沒有正確整合到主要資料管理系統的問題，確保下載的資料能正確顯示在投資組合中。',
    changes: [
      '修復 InitialSetup 組件中的資料同步邏輯',
      '新增 onDataSync 回調函數處理資料整合',
      '更新 App.tsx 中的資料同步處理',
      '新增 GitHubGistService.downloadData 方法',
      '自動尋找和下載用戶的投資組合 Gist',
      '確保下載的資料正確更新到 Zustand store',
      '修復「沒有資料」的顯示問題'
    ],
    fixes: [
      '修復初始設定下載雲端資料後仍顯示「沒有資料」的問題',
      '修復資料下載成功但沒有整合到主系統的問題'
    ]
  },
  {
    version: '1.0.2.0020',
    date: '2026-01-12',
    type: 'minor',
    title: '初始設定流程：多步驟引導和雲端資料下載',
    description: '大幅改善初始設定流程，新增多步驟引導，包含連線測試確認和雲端資料下載選項，提供更好的用戶控制和體驗。',
    changes: [
      '重新設計初始設定流程為多步驟引導',
      '新增連線測試確認步驟，用戶可選擇是否測試連線',
      '新增雲端資料下載確認步驟，用戶可選擇是否下載',
      '每個步驟都提供清楚的說明和選項',
      '支援返回上一步和跳過功能',
      '新增下載前自動備份本地資料功能',
      '改善視覺指示和狀態反饋',
      '遵循所有 steering 規則和設計標準'
    ],
    fixes: [
      '修復用戶對初始設定流程的困惑',
      '解決資料覆蓋風險問題'
    ]
  },
  {
    version: '1.0.2.0019',
    date: '2026-01-12',
    type: 'patch',
    title: 'Token 管理：新增清除 GitHub Token 功能',
    description: '在雲端同步設定中新增清除 GitHub Token 功能，讓用戶可以輕鬆移除已設定的 Token，重置雲端同步狀態，改善用戶控制體驗。',
    changes: [
      '新增清除 GitHub Token 按鈕',
      '清除 Token 時同時移除相關儲存資料',
      '重置連線狀態和用戶資訊',
      '清除後提示重新整理以顯示初始設定',
      '只在有 Token 時顯示清除按鈕',
      '確認對話框防止誤操作',
      '改善 Token 管理用戶體驗'
    ]
  },
  {
    version: '1.0.2.0018',
    date: '2026-01-12',
    type: 'minor',
    title: '初始設定：新增啟動時 GitHub Token 檢查',
    description: '新增應用程式啟動時的 GitHub Token 檢查功能，提供友善的初始設定流程，讓用戶可以在首次使用時輕鬆配置雲端同步功能。',
    changes: [
      '新增初始設定對話框組件 (InitialSetup.tsx)',
      '啟動時自動檢查 GitHub Token 是否存在',
      '提供友善的 Token 設定引導流程',
      '支援 Token 格式驗證和有效性檢查',
      '用戶可選擇立即設定或稍後配置',
      '環境檢測整合，適應不同部署環境',
      '改善首次使用者體驗'
    ]
  },
  {
    version: '1.0.2.0017',
    date: '2026-01-12',
    type: 'minor',
    title: '文檔完善：補充開發規格文件',
    description: '建立完整的技術文檔體系，包含開發規格、系統架構、API 規格等詳細文檔，提升專案的可維護性和開發效率。',
    changes: [
      '新增完整的開發規格文件 (DEVELOPMENT_SPECIFICATION.md)',
      '詳細的系統架構說明',
      '完整的資料模型定義',
      'UI/UX 設計規範文檔',
      '安全與品質規範說明',
      '部署和測試規格文檔',
      '更新 README.md 和本地開發指南',
      '建立完整的技術文檔體系'
    ]
  },
  {
    version: '1.0.2.0016',
    date: '2026-01-12',
    type: 'minor',
    title: '版本資訊：新增改版記錄說明功能',
    description: '新增詳細的版本資訊對話框，用戶可以查看當前版本、更新內容、版本歷史和系統資訊。',
    changes: [
      '新增版本資訊對話框組件 (VersionInfo.tsx)',
      '新增改版記錄管理系統 (changelog.ts)',
      '版本號可點擊查看詳細資訊',
      '顯示最新更新內容和功能變更',
      '提供完整的版本歷史記錄',
      '顯示系統技術資訊',
      '改善版本追蹤和用戶了解度'
    ]
  },
  {
    version: '1.0.2.0015',
    date: '2026-01-12',
    type: 'patch',
    title: '環境檢測：雲端同步智能適應',
    description: '解決 GitHub Pages 環境中雲端同步功能無法使用的問題，新增智能環境檢測和適應性用戶界面。',
    changes: [
      '新增環境自動檢測功能 (environment.ts)',
      '雲端同步組件智能適應不同環境',
      'GitHub Pages 環境顯示清楚的功能限制說明',
      '提供本機開發環境使用指引',
      '新增替代方案建議（手動匯出/匯入）',
      '改善用戶體驗和錯誤提示'
    ],
    fixes: [
      '修復 GitHub Pages 環境中雲端同步功能失敗問題',
      '解決用戶對環境差異的困惑'
    ]
  },
  {
    version: '1.0.2.0014',
    date: '2026-01-12',
    type: 'patch',
    title: '雲端同步環境修復準備',
    description: '為解決 GitHub Pages 雲端同步問題進行的準備工作。',
    changes: [
      '版本號更新和準備工作',
      '環境檢測邏輯準備'
    ]
  },
  {
    version: '1.0.2.0013',
    date: '2026-01-12',
    type: 'patch',
    title: 'UI 改善：搜尋圖示視覺效果提升',
    description: '改善搜尋功能的視覺效果和用戶體驗。',
    changes: [
      '搜尋圖示視覺效果優化',
      'UI 組件細節改善'
    ]
  },
  {
    version: '1.0.2.0012',
    date: '2026-01-11',
    type: 'patch',
    title: 'GitHub Pages 修復：環境變數和部署配置',
    description: '確保 GitHub Pages 部署的正確性，修復環境變數和部署配置問題。',
    changes: [
      'GitHub Pages 部署配置優化',
      '環境變數設定修復',
      '部署流程改善'
    ],
    fixes: [
      '修復 GitHub Pages 部署問題',
      '解決環境變數配置錯誤'
    ]
  }
];

// 取得最新版本的改版記錄
export function getLatestChangelog(): ChangelogEntry | null {
  return CHANGELOG.length > 0 ? CHANGELOG[0] : null;
}

// 取得指定版本的改版記錄
export function getChangelogByVersion(version: string): ChangelogEntry | null {
  return CHANGELOG.find(entry => entry.version === version) || null;
}

// 取得版本類型的中文說明
export function getVersionTypeText(type: ChangelogEntry['type']): string {
  const typeMap = {
    major: '重大更新',
    minor: '功能更新',
    patch: '修復更新',
    hotfix: '緊急修復'
  };
  return typeMap[type];
}

// 取得版本類型的顏色
export function getVersionTypeColor(type: ChangelogEntry['type']): string {
  const colorMap = {
    major: 'text-red-400',
    minor: 'text-blue-400',
    patch: 'text-green-400',
    hotfix: 'text-yellow-400'
  };
  return colorMap[type];
}