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