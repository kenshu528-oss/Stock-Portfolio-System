/**
 * 存股紀錄系統 - 版本管理模組
 * Stock Portfolio System - Version Management Module
 * 
 * 版權所有 (c) 2025 徐國洲
 * Copyright (c) 2025 Xu Guo Zhou
 * 
 * 採用 MIT 授權條款
 * Licensed under MIT License
 */

// 版本管理系統
class VersionManager {
    constructor() {
        this.currentVersion = '1.2.1.0';
        this.versionHistory = [
            {
                version: '1.0.0.0',
                date: '2025-12-24',
                features: [
                    '基本股票管理功能',
                    '多帳戶支援',
                    '即時股價更新',
                    '損益計算'
                ]
            },
            {
                version: '1.1.0.0',
                date: '2025-12-24',
                features: [
                    '真實股價 API 整合',
                    '多重資料源備援',
                    '即時編輯股數和成本價',
                    '批量編輯功能',
                    '個別股票更新'
                ]
            },
            {
                version: '1.2.0.0',
                date: '2025-12-24',
                features: [
                    '雲端同步功能',
                    '跨裝置資料同步',
                    '版本管理系統',
                    '帳戶管理功能 (刪除/更名)',
                    '部署指南'
                ]
            },
            {
                version: '1.2.0.3',
                date: '2025-12-24',
                features: [
                    '新增深色模式功能',
                    '支援亮色/深色主題切換',
                    '改善夜間使用體驗',
                    '自動記憶使用者偏好設定'
                ]
            },
            {
                version: '1.2.1.0',
                date: '2025-12-30',
                features: [
                    '完整股息管理系統',
                    '股息記錄與統計',
                    '自動調整成本價功能',
                    '真實報酬率計算',
                    '股息殖利率分析',
                    '個股股息設定管理'
                ]
            }
        ];
        
        this.checkForUpdates();
    }

    getCurrentVersion() {
        return this.currentVersion;
    }

    getVersionHistory() {
        return this.versionHistory;
    }

    checkForUpdates() {
        const savedVersion = localStorage.getItem('app_version');
        
        if (!savedVersion) {
            // 首次使用
            this.showWelcomeMessage();
            localStorage.setItem('app_version', this.currentVersion);
        } else if (savedVersion !== this.currentVersion) {
            // 版本更新
            this.showUpdateMessage(savedVersion, this.currentVersion);
            localStorage.setItem('app_version', this.currentVersion);
            
            // 執行資料遷移 (如果需要)
            this.migrateData(savedVersion, this.currentVersion);
        }
    }

    showWelcomeMessage() {
        const message = `
🎉 歡迎使用存股紀錄系統！

版本: ${this.currentVersion}

主要功能:
• 多帳戶股票管理
• 即時股價更新
• 損益計算
• 雲端同步
• 跨裝置使用

開始使用前，建議先設定雲端同步功能，
這樣就能在不同裝置間同步資料！
        `;
        
        alert(message);
    }

    showUpdateMessage(oldVersion, newVersion) {
        const latestUpdate = this.versionHistory.find(v => v.version === newVersion);
        
        let message = `🚀 系統已更新！\n\n`;
        message += `${oldVersion} → ${newVersion}\n\n`;
        message += `新功能:\n`;
        
        if (latestUpdate) {
            latestUpdate.features.forEach(feature => {
                message += `• ${feature}\n`;
            });
        }
        
        message += `\n感謝您的使用！`;
        
        alert(message);
    }

    migrateData(fromVersion, toVersion) {
        console.log(`執行資料遷移: ${fromVersion} → ${toVersion}`);
        
        // 根據版本執行不同的遷移邏輯
        if (this.compareVersions(fromVersion, '1.1.0.0') < 0) {
            this.migrateToV110();
        }
        
        if (this.compareVersions(fromVersion, '1.2.0.0') < 0) {
            this.migrateToV120();
        }
        
        if (this.compareVersions(fromVersion, '1.2.0.3') < 0) {
            this.migrateToV1203();
        }
        
        if (this.compareVersions(fromVersion, '1.2.1.0') < 0) {
            this.migrateToV1210();
        }
    }

    migrateToV110() {
        console.log('遷移到 v1.1.0.0...');
        // 新增 error 和 source 欄位到現有股票
        const data = JSON.parse(localStorage.getItem('stockPortfolio') || '{}');
        if (data.stocks) {
            data.stocks.forEach(stock => {
                if (!stock.hasOwnProperty('error')) {
                    stock.error = null;
                }
                if (!stock.hasOwnProperty('source')) {
                    stock.source = null;
                }
            });
            localStorage.setItem('stockPortfolio', JSON.stringify(data));
        }
    }

    migrateToV120() {
        console.log('遷移到 v1.2.0.0...');
        // 新增 lastSync 欄位
        const data = JSON.parse(localStorage.getItem('stockPortfolio') || '{}');
        if (!data.lastSync) {
            data.lastSync = new Date().toISOString();
            localStorage.setItem('stockPortfolio', JSON.stringify(data));
        }
    }

    migrateToV1203() {
        console.log('遷移到 v1.2.0.3...');
        // 初始化深色模式設定
        if (localStorage.getItem('darkMode') === null) {
            localStorage.setItem('darkMode', 'false'); // 預設使用亮色模式
        }
        console.log('已初始化深色模式功能');
    }

    migrateToV1210() {
        console.log('遷移到 v1.2.1.0...');
        // 初始化股息管理功能
        const data = JSON.parse(localStorage.getItem('stockPortfolio') || '{}');
        if (data.stocks) {
            data.stocks.forEach(stock => {
                // 新增股息相關欄位
                if (!stock.hasOwnProperty('dividends')) {
                    stock.dividends = [];
                }
                if (!stock.hasOwnProperty('totalDividends')) {
                    stock.totalDividends = 0;
                }
                if (!stock.hasOwnProperty('adjustedCostPrice')) {
                    stock.adjustedCostPrice = stock.costPrice;
                }
                if (!stock.hasOwnProperty('dividendAdjustment')) {
                    stock.dividendAdjustment = true; // 預設啟用股息調整
                }
            });
            localStorage.setItem('stockPortfolio', JSON.stringify(data));
        }
        
        // 初始化股息管理設定
        if (localStorage.getItem('globalDividendAdjustment') === null) {
            localStorage.setItem('globalDividendAdjustment', 'true');
        }
        if (localStorage.getItem('defaultTaxRate') === null) {
            localStorage.setItem('defaultTaxRate', '10'); // 預設扣稅率 10%
        }
        
        console.log('已初始化股息管理功能');
    }

    compareVersions(version1, version2) {
        // 支援四位數版本號比較 (major.minor.patch.build)
        const v1parts = version1.split('.').map(Number);
        const v2parts = version2.split('.').map(Number);
        
        // 確保都是四位數版本號
        while (v1parts.length < 4) v1parts.push(0);
        while (v2parts.length < 4) v2parts.push(0);
        
        for (let i = 0; i < 4; i++) {
            const v1part = v1parts[i] || 0;
            const v2part = v2parts[i] || 0;
            
            if (v1part < v2part) return -1;
            if (v1part > v2part) return 1;
        }
        
        return 0;
    }

    showVersionInfo() {
        let info = `📋 版本資訊\n\n`;
        info += `目前版本: ${this.currentVersion}\n\n`;
        info += `版本歷史:\n`;
        
        this.versionHistory.reverse().forEach(version => {
            info += `\n${version.version} (${version.date})\n`;
            version.features.forEach(feature => {
                info += `• ${feature}\n`;
            });
        });
        
        alert(info);
    }

    exportVersionInfo() {
        return {
            currentVersion: this.currentVersion,
            versionHistory: this.versionHistory,
            lastCheck: new Date().toISOString()
        };
    }
}

// 匯出給主程式使用
window.VersionManager = VersionManager;