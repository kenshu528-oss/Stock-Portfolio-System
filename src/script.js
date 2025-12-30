/**
 * 存股紀錄系統 - 主程式
 * Stock Portfolio System - Main Application
 * 
 * 版權所有 (c) 2025 徐國洲
 * Copyright (c) 2025 Xu Guo Zhou
 * 
 * 採用 CC BY-NC 4.0 授權條款 (禁止商業使用)
 * Licensed under CC BY-NC 4.0 License (Non-Commercial)
 * 
 * ⚠️ 重要聲明：本軟體禁止商業使用！
 * ⚠️ IMPORTANT: Commercial use is strictly prohibited!
 * 
 * 作者：徐國洲
 * 版本：v1.2.1.0
 * 建立日期：2025-12-24
 * 
 * 功能：
 * - 多帳戶股票管理
 * - 即時股價更新
 * - 雲端同步
 * - 損益計算
 */

// 商業使用檢測警告
console.warn('⚠️ 存股紀錄系統 - 版權聲明');
console.warn('本軟體採用 CC BY-NC 4.0 授權條款，禁止商業使用！');
console.warn('Commercial use is strictly prohibited under CC BY-NC 4.0 License!');
console.warn('如需商業授權，請聯絡：kenshu528@gmail.com');

class StockPortfolio {
    constructor() {
        this.stocks = [];
        this.accounts = ['帳戶1', '帳戶2'];
        this.currentFilter = 'all';
        this.lastTotalValue = 0;
        this.stockAPI = new StockAPI(); // 使用新的 API 模組
        this.cloudSync = new CloudSync(); // 雲端同步模組
        this.versionManager = new VersionManager(); // 版本管理模組
        this.viewMode = 'auto'; // 介面模式：auto, mobile, desktop
        this.summaryPrivacyMode = true; // 總市值隱私模式：預設啟用
        this.stockPrivacyMode = false; // 個股金額隱私模式：預設關閉
        this.darkMode = false; // 深色模式：預設關閉
        
        this.loadData(); // 先載入資料
        this.setupEventListeners();
        this.setupCloudSync();
        this.updateVersionDisplay();
        this.initViewMode();
        this.initPrivacyModes();
        this.initDarkMode();
    }

    init() {
        // 只在沒有儲存資料時初始化空的資料結構
        const saved = localStorage.getItem('stockPortfolio');
        if (!saved) {
            console.log('首次使用，初始化空的投資組合');
            this.stocks = []; // 不建立任何預設股票
            
            this.saveData();
        }
    }

    setupEventListeners() {
        // 新增股票按鈕
        document.getElementById('addStockBtn').addEventListener('click', () => {
            this.showAddStockModal();
        });

        // 新增帳戶按鈕
        document.getElementById('addAccountBtn').addEventListener('click', () => {
            this.showAddAccountModal();
        });

        // 更新股價按鈕
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshStockPrices();
        });

        // 測試 API 按鈕
        document.getElementById('testApiBtn').addEventListener('click', () => {
            this.testApiConnection();
        });

        // 批量編輯按鈕
        document.getElementById('batchEditBtn').addEventListener('click', () => {
            this.showBatchEditMode();
        });

        // 雲端同步按鈕
        document.getElementById('cloudSyncBtn').addEventListener('click', () => {
            this.handleCloudSync();
        });

        // 管理帳戶按鈕
        document.getElementById('manageAccountBtn').addEventListener('click', () => {
            this.showManageAccountModal();
        });

        // 版本資訊按鈕
        document.getElementById('versionBtn').addEventListener('click', () => {
            this.versionManager.showVersionInfo();
        });

        // 新增除錯快捷鍵 (Ctrl+D)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.showDebugInfo();
            }
            // 顯示重置按鈕 (Ctrl+Shift+R)
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                document.getElementById('resetBtn').style.display = 'inline-block';
            }
        });

        // 重置資料按鈕 (隱藏)
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetAllData();
        });

        // 重置系統按鈕 (管理帳戶對話框中)
        document.getElementById('resetSystemBtn').addEventListener('click', () => {
            this.resetAllData();
        });

        // 介面模式切換
        document.getElementById('viewModeBtn').addEventListener('click', () => {
            this.toggleViewMode();
        });

        // 功能選單切換 (手機版)
        document.getElementById('toggleBtn').addEventListener('click', () => {
            this.toggleControlsMenu();
        });

        // 總市值隱私模式切換
        document.getElementById('summaryPrivacyBtn').addEventListener('click', () => {
            this.toggleSummaryPrivacy();
        });

        // 個股金額隱私模式切換
        document.getElementById('stockPrivacyBtn').addEventListener('click', () => {
            this.toggleStockPrivacy();
        });

        // 深色模式切換
        document.getElementById('darkModeBtn').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // 股息管理按鈕
        document.getElementById('dividendBtn').addEventListener('click', () => {
            this.showDividendModal();
        });

        // 視窗大小變化時關閉所有下拉選單
        window.addEventListener('resize', () => {
            this.closeAllActionMenus();
        });

        // 滾動時關閉所有下拉選單
        window.addEventListener('scroll', () => {
            this.closeAllActionMenus();
        });

        // 帳戶標籤切換
        document.getElementById('accountTabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchAccount(e.target.dataset.account);
            }
        });

        // 新增股票表單
        document.getElementById('addStockForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addStock();
        });

        // 新增帳戶表單
        document.getElementById('addAccountForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addAccount();
        });

        // 關閉對話框
        document.querySelectorAll('.close, #cancelAdd, #cancelAddAccount, #cancelManageAccount, #cancelDividend').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // 點擊對話框外部關閉
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });

        // 定期更新股價 (每30秒)
        this.autoRefreshInterval = setInterval(() => {
            // 只有在沒有開啟 modal 時才自動更新
            if (!this.isModalOpen()) {
                this.refreshStockPrices();
            }
        }, 30000);
    }

    isModalOpen() {
        const modals = ['addStockModal', 'addAccountModal', 'manageAccountModal'];
        return modals.some(modalId => {
            const modal = document.getElementById(modalId);
            return modal && modal.style.display === 'block';
        });
    }

    showAddStockModal() {
        // 更新帳戶選項
        const accountSelect = document.getElementById('account');
        accountSelect.innerHTML = '';
        this.accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account;
            option.textContent = account;
            accountSelect.appendChild(option);
        });
        
        // 設定預設購買日期為今天
        const purchaseDateInput = document.getElementById('purchaseDate');
        if (purchaseDateInput) {
            const today = new Date().toISOString().split('T')[0];
            purchaseDateInput.value = today;
        }
        
        // 設定智能搜尋
        this.setupStockSearch();
        
        document.getElementById('addStockModal').style.display = 'block';
    }

    setupStockSearch() {
        const codeInput = document.getElementById('stockCode');
        const nameInput = document.getElementById('stockName');
        const codeStatus = document.getElementById('codeSearchStatus');
        const nameStatus = document.getElementById('nameSearchStatus');
        
        let codeSearchTimeout;
        let nameSearchTimeout;
        
        // 股票代碼輸入時自動查詢名稱
        codeInput.addEventListener('input', (e) => {
            clearTimeout(codeSearchTimeout);
            const code = e.target.value.trim().toUpperCase();
            
            if (code.length >= 4) {
                codeStatus.textContent = '🔍 查詢中...';
                codeStatus.className = 'search-status loading';
                
                codeSearchTimeout = setTimeout(async () => {
                    try {
                        console.log(`搜尋股票代碼: ${code}`);
                        const stockInfo = await this.searchStockByCode(code);
                        console.log(`搜尋結果:`, stockInfo);
                        
                        if (stockInfo && stockInfo.name && stockInfo.name !== code) {
                            nameInput.value = stockInfo.name;
                            codeStatus.textContent = `✅ 找到: ${stockInfo.name}`;
                            codeStatus.className = 'search-status success';
                            nameStatus.textContent = '';
                        } else {
                            codeStatus.textContent = '❌ 找不到此股票代碼';
                            codeStatus.className = 'search-status error';
                        }
                    } catch (error) {
                        console.error('搜尋錯誤:', error);
                        codeStatus.textContent = '⚠️ 查詢失敗，請手動輸入';
                        codeStatus.className = 'search-status error';
                    }
                }, 800);
            } else {
                codeStatus.textContent = '';
                codeStatus.className = 'search-status';
            }
        });
        
        // 股票名稱輸入時自動查詢代碼
        nameInput.addEventListener('input', (e) => {
            clearTimeout(nameSearchTimeout);
            const name = e.target.value.trim();
            
            if (name.length >= 2) {
                nameStatus.textContent = '🔍 查詢中...';
                nameStatus.className = 'search-status loading';
                
                nameSearchTimeout = setTimeout(async () => {
                    try {
                        const stockInfo = await this.searchStockByName(name);
                        if (stockInfo.code) {
                            codeInput.value = stockInfo.code;
                            nameStatus.textContent = `✅ 找到: ${stockInfo.code}`;
                            nameStatus.className = 'search-status success';
                            codeStatus.textContent = '';
                        } else {
                            nameStatus.textContent = '❌ 找不到此股票名稱';
                            nameStatus.className = 'search-status error';
                        }
                    } catch (error) {
                        nameStatus.textContent = '⚠️ 查詢失敗，請手動輸入';
                        nameStatus.className = 'search-status error';
                    }
                }, 800);
            } else {
                nameStatus.textContent = '';
                nameStatus.className = 'search-status';
            }
        });
    }

    async searchStockByCode(code) {
        console.log(`開始搜尋股票代碼: ${code}`);
        
        // 優先使用本地股票資料庫 (更快更準確)
        const localResult = this.getStockFromLocalDB(code, 'code');
        console.log(`本地搜尋結果:`, localResult);
        
        if (localResult && localResult.name) {
            return localResult;
        }
        
        // 如果本地找不到，再嘗試 API 查詢
        try {
            console.log(`嘗試 API 查詢: ${code}`);
            const stockInfo = await this.stockAPI.getStockInfo(code);
            console.log(`API 查詢結果:`, stockInfo);
            
            if (stockInfo && stockInfo.name && stockInfo.name !== code) {
                return stockInfo;
            }
        } catch (error) {
            console.warn(`API 查詢失敗:`, error);
        }
        
        // 如果都找不到，回傳空結果
        return { code: null, name: null };
    }

    async searchStockByName(name) {
        try {
            // 先從本地資料庫搜尋
            const localResult = this.getStockFromLocalDB(name, 'name');
            if (localResult.code) {
                return localResult;
            }
            
            // 如果本地找不到，可以擴展為 API 搜尋
            throw new Error('找不到股票');
        } catch (error) {
            return { code: null, name: null };
        }
    }

    getStockFromLocalDB(query, searchType) {
        // 常見台股資料庫
        const stockDB = [
            { code: '2330', name: '台積電' },
            { code: '2317', name: '鴻海' },
            { code: '2454', name: '聯發科' },
            { code: '2881', name: '富邦金' },
            { code: '2882', name: '國泰金' },
            { code: '2883', name: '開發金' },
            { code: '2884', name: '玉山金' },
            { code: '2885', name: '元大金' },
            { code: '2886', name: '兆豐金' },
            { code: '2887', name: '台新金' },
            { code: '2890', name: '永豐金' },
            { code: '2891', name: '中信金' },
            { code: '2892', name: '第一金' },
            { code: '2912', name: '統一超' },
            { code: '3008', name: '大立光' },
            { code: '3711', name: '日月光投控' },
            { code: '5880', name: '合庫金' },
            { code: '6505', name: '台塑化' },
            { code: '0050', name: '元大台灣50' },
            { code: '0056', name: '元大高股息' },
            { code: '00631L', name: '元大台灣50正2' },
            { code: '00632R', name: '元大台灣50反1' },
            { code: '00679B', name: '元大美債20年' },
            { code: '00692', name: '富邦公司治理' },
            { code: '00701', name: '國泰股利精選30' },
            { code: '00713', name: '元大台灣高息低波' },
            { code: '00878', name: '國泰永續高股息' },
            { code: '00881', name: '國泰台灣5G+' },
            { code: '00900', name: '富邦特選高股息30' },
            { code: '00919', name: '群益台灣精選高息' },
            { code: '1101', name: '台泥' },
            { code: '1102', name: '亞泥' },
            { code: '1216', name: '統一' },
            { code: '1301', name: '台塑' },
            { code: '1303', name: '南亞' },
            { code: '1326', name: '台化' },
            { code: '2002', name: '中鋼' },
            { code: '2207', name: '和泰車' },
            { code: '2303', name: '聯電' },
            { code: '2308', name: '台達電' },
            { code: '2327', name: '國巨' },
            { code: '2357', name: '華碩' },
            { code: '2382', name: '廣達' },
            { code: '2395', name: '研華' },
            { code: '2408', name: '南亞科' },
            { code: '2412', name: '中華電' },
            { code: '2474', name: '可成' },
            { code: '2603', name: '長榮' },
            { code: '2609', name: '陽明' },
            { code: '2615', name: '萬海' },
            { code: '2801', name: '彰銀' },
            { code: '2880', name: '華南金' },
            { code: '3045', name: '台灣大' },
            { code: '3481', name: '群創' },
            { code: '4938', name: '和碩' },
            { code: '5871', name: '中租-KY' },
            { code: '6415', name: '矽力-KY' },
            { code: '6669', name: '緯穎' }
        ];
        
        console.log(`本地資料庫搜尋: ${searchType} = ${query}`);
        
        if (searchType === 'code') {
            const result = stockDB.find(stock => stock.code === query);
            console.log(`代碼搜尋結果:`, result);
            return result || { code: null, name: null };
        } else if (searchType === 'name') {
            const result = stockDB.find(stock => 
                stock.name.includes(query) || query.includes(stock.name)
            );
            console.log(`名稱搜尋結果:`, result);
            return result || { code: null, name: null };
        }
        
        return { code: null, name: null };
    }

    showAddAccountModal() {
        document.getElementById('addAccountModal').style.display = 'block';
    }

    showManageAccountModal() {
        this.renderAccountList();
        document.getElementById('manageAccountModal').style.display = 'block';
    }

    renderAccountList() {
        const accountList = document.getElementById('accountList');
        accountList.innerHTML = '';

        this.accounts.forEach((account, index) => {
            const accountItem = document.createElement('div');
            accountItem.className = 'account-item';
            
            // 計算該帳戶的股票數量
            const stockCount = this.stocks.filter(stock => stock.account === account).length;
            
            accountItem.innerHTML = `
                <div class="account-info">
                    <span class="account-name">${account}</span>
                    <small class="stock-count">${stockCount} 支股票</small>
                </div>
                <div class="account-actions">
                    <button class="btn-small btn-edit" onclick="portfolio.renameAccount('${account}')">重新命名</button>
                    <button class="btn-small btn-delete" onclick="portfolio.deleteAccount('${account}')">刪除</button>
                </div>
            `;
            
            accountList.appendChild(accountItem);
        });
    }

    renameAccount(oldName) {
        const newName = prompt(`重新命名帳戶 "${oldName}":`, oldName);
        
        if (!newName || newName.trim() === '') {
            alert('帳戶名稱不能為空');
            return;
        }
        
        const trimmedName = newName.trim();
        
        if (trimmedName === oldName) {
            return; // 沒有變更
        }
        
        if (this.accounts.includes(trimmedName)) {
            alert('帳戶名稱已存在');
            return;
        }
        
        // 更新帳戶列表
        const accountIndex = this.accounts.indexOf(oldName);
        if (accountIndex !== -1) {
            this.accounts[accountIndex] = trimmedName;
        }
        
        // 更新所有股票的帳戶名稱
        this.stocks.forEach(stock => {
            if (stock.account === oldName) {
                stock.account = trimmedName;
            }
        });
        
        // 更新當前篩選器
        if (this.currentFilter === oldName) {
            this.currentFilter = trimmedName;
        }
        
        this.saveData();
        this.updateAccountTabs();
        this.renderStocks();
        this.renderAccountList();
        
        console.log(`✅ 帳戶已重新命名: ${oldName} → ${trimmedName}`);
        alert(`✅ 帳戶已重新命名為 "${trimmedName}"`);
    }

    deleteAccount(accountName) {
        const stocksInAccount = this.stocks.filter(stock => stock.account === accountName);
        
        let confirmMessage = `確定要刪除帳戶 "${accountName}" 嗎？`;
        
        if (stocksInAccount.length > 0) {
            confirmMessage += `\n\n⚠️ 此帳戶有 ${stocksInAccount.length} 支股票，刪除帳戶後這些股票也會被刪除：\n`;
            stocksInAccount.forEach(stock => {
                confirmMessage += `• ${stock.code} ${stock.name}\n`;
            });
            confirmMessage += '\n此操作無法復原！';
        }
        
        // 如果是最後一個帳戶，給予特別提示
        if (this.accounts.length <= 1) {
            confirmMessage += `\n\n📝 注意：這是最後一個帳戶，刪除後系統會自動建立一個新的「帳戶1」。`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // 刪除帳戶
        this.accounts = this.accounts.filter(account => account !== accountName);
        
        // 刪除該帳戶的所有股票
        this.stocks = this.stocks.filter(stock => stock.account !== accountName);
        
        // 如果沒有帳戶了，建立一個預設帳戶
        if (this.accounts.length === 0) {
            this.accounts = ['帳戶1'];
            console.log('已自動建立預設帳戶：帳戶1');
        }
        
        // 如果當前篩選的是被刪除的帳戶，切換到 "全部"
        if (this.currentFilter === accountName) {
            this.currentFilter = 'all';
        }
        
        this.saveData();
        this.updateAccountTabs();
        this.renderStocks();
        this.renderAccountList();
        
        console.log(`✅ 帳戶已刪除: ${accountName}`);
        alert(`✅ 帳戶 "${accountName}" 已刪除${this.accounts.length === 1 && this.accounts[0] === '帳戶1' ? '，已自動建立新的預設帳戶' : ''}`);
    }

    initViewMode() {
        // 載入儲存的介面模式設定
        const savedMode = localStorage.getItem('viewMode') || 'auto';
        this.viewMode = savedMode;
        this.applyViewMode();
        
        // 監聽螢幕大小變化
        window.addEventListener('resize', () => {
            if (this.viewMode === 'auto') {
                this.applyViewMode();
            }
        });
    }

    toggleViewMode() {
        const modes = ['auto', 'mobile', 'desktop'];
        const currentIndex = modes.indexOf(this.viewMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.viewMode = modes[nextIndex];
        
        // 儲存設定
        localStorage.setItem('viewMode', this.viewMode);
        
        this.applyViewMode();
        this.updateViewModeIcon();
        
        // 顯示提示
        const modeNames = {
            'auto': '自動偵測',
            'mobile': '行動版',
            'desktop': '桌面版'
        };
        
        console.log(`介面模式已切換為: ${modeNames[this.viewMode]}`);
    }

    applyViewMode() {
        const controlsContainer = document.getElementById('controlsContainer');
        const isMobile = window.innerWidth <= 768;
        
        // 移除所有模式 class
        controlsContainer.classList.remove('mobile-mode', 'desktop-mode');
        
        let actualMode;
        if (this.viewMode === 'auto') {
            actualMode = isMobile ? 'mobile' : 'desktop';
        } else {
            actualMode = this.viewMode;
        }
        
        // 套用對應的模式
        controlsContainer.classList.add(`${actualMode}-mode`);
        
        // 如果是手機模式，確保選單是收合的
        if (actualMode === 'mobile') {
            const controlsContent = document.getElementById('controlsContent');
            controlsContent.classList.remove('expanded');
        }
        
        this.updateViewModeIcon();
    }

    updateViewModeIcon() {
        const icon = document.getElementById('viewModeIcon');
        const icons = {
            'auto': '🔄',
            'mobile': '📱',
            'desktop': '🖥️'
        };
        icon.textContent = icons[this.viewMode];
        
        const titles = {
            'auto': '自動偵測模式 (點擊切換)',
            'mobile': '行動版模式 (點擊切換)',
            'desktop': '桌面版模式 (點擊切換)'
        };
        document.getElementById('viewModeBtn').title = titles[this.viewMode];
    }

    toggleControlsMenu() {
        const controlsContent = document.getElementById('controlsContent');
        const toggleIcon = document.querySelector('.toggle-icon');
        
        controlsContent.classList.toggle('expanded');
        
        // 更新圖示
        if (controlsContent.classList.contains('expanded')) {
            toggleIcon.textContent = '×';
        } else {
            toggleIcon.textContent = '≡';
        }
    }

    initPrivacyModes() {
        // 載入儲存的隱私模式設定
        const savedSummaryPrivacy = localStorage.getItem('summaryPrivacyMode');
        const savedStockPrivacy = localStorage.getItem('stockPrivacyMode');
        
        this.summaryPrivacyMode = savedSummaryPrivacy !== null ? savedSummaryPrivacy === 'true' : true; // 預設啟用
        this.stockPrivacyMode = savedStockPrivacy !== null ? savedStockPrivacy === 'true' : false; // 預設關閉
        
        this.applyPrivacyModes();
        this.updatePrivacyIcons();
    }

    toggleSummaryPrivacy() {
        this.summaryPrivacyMode = !this.summaryPrivacyMode;
        
        // 儲存設定
        localStorage.setItem('summaryPrivacyMode', this.summaryPrivacyMode.toString());
        
        this.applyPrivacyModes();
        this.updatePrivacyIcons();
        
        console.log(`總市值隱私模式: ${this.summaryPrivacyMode ? '已啟用' : '已停用'}`);
    }

    toggleStockPrivacy() {
        this.stockPrivacyMode = !this.stockPrivacyMode;
        
        // 儲存設定
        localStorage.setItem('stockPrivacyMode', this.stockPrivacyMode.toString());
        
        this.applyPrivacyModes();
        this.updatePrivacyIcons();
        
        console.log(`個股金額隱私模式: ${this.stockPrivacyMode ? '已啟用' : '已停用'}`);
    }

    applyPrivacyModes() {
        // 處理總市值隱私
        const summaryElements = document.querySelectorAll('.summary-privacy-value');
        summaryElements.forEach(element => {
            if (this.summaryPrivacyMode) {
                element.classList.add('hidden');
            } else {
                element.classList.remove('hidden');
            }
        });

        // 處理個股金額隱私
        const stockElements = document.querySelectorAll('.stock-privacy-value');
        stockElements.forEach(element => {
            if (this.stockPrivacyMode) {
                element.classList.add('hidden');
            } else {
                element.classList.remove('hidden');
            }
        });

        // 更新隱私提示
        this.updatePrivacyNotice();
    }

    updatePrivacyNotice() {
        const privacyNotice = document.getElementById('privacyNotice');
        
        if (this.summaryPrivacyMode || this.stockPrivacyMode) {
            let message = '🙈 隱私保護已啟用 - ';
            const hiddenItems = [];
            
            if (this.summaryPrivacyMode) {
                hiddenItems.push('總市值');
            }
            if (this.stockPrivacyMode) {
                hiddenItems.push('個股金額');
            }
            
            message += hiddenItems.join('、') + ' 已隱藏。';
            privacyNotice.innerHTML = message;
            privacyNotice.classList.add('show');
        } else {
            privacyNotice.classList.remove('show');
        }
    }

    updatePrivacyIcons() {
        // 更新總市值隱私按鈕
        const summaryIcon = document.getElementById('summaryPrivacyIcon');
        const summaryBtn = document.getElementById('summaryPrivacyBtn');
        
        if (summaryIcon && summaryBtn) {
            if (this.summaryPrivacyMode) {
                summaryIcon.textContent = '🙈'; // 隱藏狀態
                summaryBtn.title = '點擊顯示總市值';
            } else {
                summaryIcon.textContent = '👁️'; // 顯示狀態
                summaryBtn.title = '點擊隱藏總市值';
            }
        }

        // 更新個股金額隱私按鈕
        const stockIcon = document.getElementById('stockPrivacyIcon');
        const stockBtn = document.getElementById('stockPrivacyBtn');
        
        if (stockIcon && stockBtn) {
            if (this.stockPrivacyMode) {
                stockIcon.textContent = '🙈'; // 隱藏狀態
                stockBtn.title = '點擊顯示個股金額';
            } else {
                stockIcon.textContent = '👁️'; // 顯示狀態
                stockBtn.title = '點擊隱藏個股金額';
            }
        }
    }

    initDarkMode() {
        // 載入儲存的深色模式設定
        const savedDarkMode = localStorage.getItem('darkMode');
        this.darkMode = savedDarkMode === 'true';
        
        this.applyDarkMode();
        this.updateDarkModeIcon();
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        
        // 儲存設定
        localStorage.setItem('darkMode', this.darkMode.toString());
        
        this.applyDarkMode();
        this.updateDarkModeIcon();
        
        console.log(`深色模式: ${this.darkMode ? '已啟用' : '已停用'}`);
    }

    applyDarkMode() {
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    updateDarkModeIcon() {
        const icon = document.getElementById('darkModeIcon');
        const button = document.getElementById('darkModeBtn');
        
        if (this.darkMode) {
            icon.textContent = '☀️'; // 深色模式下顯示太陽 (點擊切換到亮色)
            button.title = '切換到亮色模式';
        } else {
            icon.textContent = '🌙'; // 亮色模式下顯示月亮 (點擊切換到深色)
            button.title = '切換到深色模式';
        }
    }

    resetAllData() {
        // 提供重置選項
        const resetOptions = [
            '1. 完全重置 - 清除所有資料（股票、帳戶、設定）',
            '2. 重置帳戶 - 只重置帳戶為預設值，保留股票資料',
            '3. 重置設定 - 只重置系統設定，保留股票和帳戶',
            '4. 取消'
        ];
        
        const choice = prompt(
            '🔄 選擇重置類型：\n\n' + 
            resetOptions.join('\n') + 
            '\n\n請輸入選項 (1-4):'
        );
        
        switch(choice) {
            case '1':
                this.performFullReset();
                break;
            case '2':
                this.resetAccountsOnly();
                break;
            case '3':
                this.resetSettingsOnly();
                break;
            case '4':
            default:
                return;
        }
    }

    performFullReset() {
        const confirm1 = confirm('⚠️ 警告：這將清除所有資料！\n\n包括：\n• 所有股票紀錄\n• 所有帳戶設定\n• 雲端同步設定\n• 所有系統設定\n\n此操作無法復原！\n\n確定要繼續嗎？');
        
        if (!confirm1) return;
        
        const confirm2 = confirm('🚨 最後確認：\n\n真的要刪除所有資料嗎？');
        
        if (!confirm2) return;
        
        const userInput = prompt('請輸入 "DELETE" 來確認刪除所有資料:');
        
        if (userInput !== 'DELETE') {
            alert('取消操作');
            return;
        }
        
        try {
            // 清除 localStorage
            localStorage.removeItem('stockPortfolio');
            localStorage.removeItem('github_token');
            localStorage.removeItem('gist_id');
            localStorage.removeItem('app_version');
            localStorage.removeItem('summaryPrivacyMode');
            localStorage.removeItem('stockPrivacyMode');
            localStorage.removeItem('darkMode');
            localStorage.removeItem('viewMode');
            localStorage.removeItem('globalDividendAdjustment');
            localStorage.removeItem('defaultTaxRate');
            
            // 重置物件狀態
            this.stocks = [];
            this.accounts = ['帳戶1', '帳戶2'];
            this.currentFilter = 'all';
            this.lastTotalValue = 0;
            this.summaryPrivacyMode = true;
            this.stockPrivacyMode = false;
            this.darkMode = false;
            this.viewMode = 'auto';
            
            // 重置雲端同步
            this.cloudSync.clearSetup();
            this.updateSyncStatus('未設定');
            
            // 重新初始化
            this.init();
            this.updateAccountTabs();
            this.renderStocks();
            this.applyPrivacyModes();
            this.applyDarkMode();
            this.applyViewMode();
            
            // 隱藏重置按鈕和關閉對話框
            document.getElementById('resetBtn').style.display = 'none';
            this.closeModals();
            
            alert('✅ 系統已完全重置為初始狀態');
            
        } catch (error) {
            console.error('重置失敗:', error);
            alert('❌ 重置失敗: ' + error.message);
        }
    }

    resetAccountsOnly() {
        const confirm1 = confirm('🔄 重置帳戶\n\n這將：\n• 將帳戶重置為「帳戶1」、「帳戶2」\n• 將所有股票移動到「帳戶1」\n• 保留所有股票資料\n\n確定要繼續嗎？');
        
        if (!confirm1) return;
        
        try {
            // 將所有股票移動到帳戶1
            this.stocks.forEach(stock => {
                stock.account = '帳戶1';
            });
            
            // 重置帳戶
            this.accounts = ['帳戶1', '帳戶2'];
            this.currentFilter = 'all';
            
            this.saveData();
            this.updateAccountTabs();
            this.renderStocks();
            this.closeModals();
            
            alert('✅ 帳戶已重置，所有股票已移動到「帳戶1」');
            
        } catch (error) {
            console.error('帳戶重置失敗:', error);
            alert('❌ 帳戶重置失敗: ' + error.message);
        }
    }

    resetSettingsOnly() {
        const confirm1 = confirm('⚙️ 重置設定\n\n這將重置：\n• 隱私模式設定\n• 深色模式設定\n• 介面模式設定\n• 股息管理設定\n\n保留股票和帳戶資料\n\n確定要繼續嗎？');
        
        if (!confirm1) return;
        
        try {
            // 清除設定相關的 localStorage
            localStorage.removeItem('summaryPrivacyMode');
            localStorage.removeItem('stockPrivacyMode');
            localStorage.removeItem('darkMode');
            localStorage.removeItem('viewMode');
            localStorage.removeItem('globalDividendAdjustment');
            localStorage.removeItem('defaultTaxRate');
            
            // 重置設定狀態
            this.summaryPrivacyMode = true;
            this.stockPrivacyMode = false;
            this.darkMode = false;
            this.viewMode = 'auto';
            
            // 重新套用設定
            this.applyPrivacyModes();
            this.updatePrivacyIcons();
            this.applyDarkMode();
            this.updateDarkModeIcon();
            this.applyViewMode();
            
            this.closeModals();
            
            alert('✅ 系統設定已重置為預設值');
            
        } catch (error) {
            console.error('設定重置失敗:', error);
            alert('❌ 設定重置失敗: ' + error.message);
        }
    }

    showDebugInfo() {
        const saved = localStorage.getItem('stockPortfolio');
        let debugInfo = '🔍 除錯資訊\n\n';
        
        debugInfo += `目前記憶體狀態:\n`;
        debugInfo += `• 股票數量: ${this.stocks.length}\n`;
        debugInfo += `• 帳戶數量: ${this.accounts.length}\n`;
        debugInfo += `• 帳戶名稱: ${this.accounts.join(', ')}\n`;
        debugInfo += `• 當前篩選: ${this.currentFilter}\n\n`;
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                debugInfo += `localStorage 儲存狀態:\n`;
                debugInfo += `• 股票數量: ${data.stocks?.length || 0}\n`;
                debugInfo += `• 帳戶數量: ${data.accounts?.length || 0}\n`;
                debugInfo += `• 帳戶名稱: ${data.accounts?.join(', ') || '無'}\n`;
                debugInfo += `• 最後同步: ${data.lastSync || '無'}\n`;
                debugInfo += `• 資料大小: ${(saved.length / 1024).toFixed(2)} KB\n`;
            } catch (error) {
                debugInfo += `localStorage 資料損壞: ${error.message}\n`;
            }
        } else {
            debugInfo += `localStorage: 無儲存資料\n`;
        }
        
        debugInfo += `\n雲端同步狀態:\n`;
        debugInfo += `• 已設定: ${this.cloudSync.isSetup() ? '是' : '否'}\n`;
        debugInfo += `• 已啟用: ${this.cloudSync.syncEnabled ? '是' : '否'}\n`;
        
        debugInfo += `\n💡 提示: 按 Ctrl+D 可隨時查看此資訊`;
        
        alert(debugInfo);
    }

    showCopyrightInfo() {
        const copyrightInfo = `
📋 存股紀錄系統 版權資訊

版權所有 © 2025 徐國洲
Stock Portfolio System

🏷️ 授權條款：CC BY-NC 4.0 License
✅ 允許個人使用
✅ 允許修改和分發
❌ 禁止商業使用
✅ 允許非營利組織使用

⚠️ 使用條件：
• 必須保留版權聲明
• 必須包含授權條款
• 不提供任何擔保

📧 聯絡方式：kenshu528@gmail.com
🔗 GitHub：https://github.com/kenshu528-oss

⚖️ 免責聲明：
本軟體僅供個人投資記錄使用，不構成投資建議。
股價資料來源於第三方 API，準確性請自行驗證。
使用者需自行承擔投資風險。

🔗 完整授權條款：
https://creativecommons.org/licenses/by-nc/4.0/deed.zh_TW

感謝使用存股紀錄系統！
        `;
        
        alert(copyrightInfo);
    }

    updateVersionDisplay() {
        const versionElement = document.getElementById('versionInfo');
        if (versionElement) {
            versionElement.textContent = `v${this.versionManager.getCurrentVersion()}`;
            versionElement.onclick = () => this.versionManager.showVersionInfo();
        }
    }

    showDividendModal() {
        this.setupDividendModal();
        document.getElementById('dividendModal').style.display = 'block';
    }

    setupDividendModal() {
        // 設定標籤切換
        const tabButtons = document.querySelectorAll('.dividend-tabs .tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // 更新標籤狀態
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // 更新內容顯示
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(this.getTabContentId(targetTab)).classList.add('active');
                
                // 載入對應內容
                this.loadTabContent(targetTab);
            });
        });
        
        // 設定股息表單
        this.setupDividendForm();
        
        // 載入預設內容
        this.loadTabContent('records');
    }

    getTabContentId(tab) {
        const tabMap = {
            'records': 'dividendRecords',
            'add': 'addDividend',
            'settings': 'dividendSettings'
        };
        return tabMap[tab];
    }

    loadTabContent(tab) {
        switch(tab) {
            case 'records':
                this.loadDividendRecords();
                break;
            case 'add':
                this.loadAddDividendForm();
                break;
            case 'settings':
                this.loadDividendSettings();
                break;
        }
    }

    loadDividendRecords() {
        // 計算股息統計
        let totalDividends = 0;
        let yearlyDividends = 0;
        const currentYear = new Date().getFullYear();
        
        this.stocks.forEach(stock => {
            if (stock.dividends) {
                stock.dividends.forEach(dividend => {
                    totalDividends += dividend.netAmount;
                    const dividendYear = new Date(dividend.date).getFullYear();
                    if (dividendYear === currentYear) {
                        yearlyDividends += dividend.netAmount;
                    }
                });
            }
        });
        
        // 更新統計顯示
        document.getElementById('totalDividendAmount').textContent = `$${totalDividends.toLocaleString()}`;
        document.getElementById('yearlyDividendAmount').textContent = `$${yearlyDividends.toLocaleString()}`;
        
        // 計算平均殖利率
        const totalInvestment = this.stocks.reduce((sum, stock) => sum + (stock.shares * stock.costPrice), 0);
        const averageYield = totalInvestment > 0 ? (yearlyDividends / totalInvestment * 100) : 0;
        document.getElementById('averageYield').textContent = `${averageYield.toFixed(2)}%`;
        
        // 載入股息記錄表格
        this.renderDividendTable();
    }

    renderDividendTable() {
        const tbody = document.getElementById('dividendTableBody');
        tbody.innerHTML = '';
        
        // 收集所有股息記錄
        const allDividends = [];
        this.stocks.forEach(stock => {
            if (stock.dividends) {
                stock.dividends.forEach(dividend => {
                    allDividends.push({
                        ...dividend,
                        stockCode: stock.code,
                        stockName: stock.name,
                        stockId: stock.id
                    });
                });
            }
        });
        
        // 按日期排序 (最新的在前)
        allDividends.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // 渲染表格
        allDividends.forEach(dividend => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${dividend.date}</td>
                <td>${dividend.stockCode} ${dividend.stockName}</td>
                <td>${this.getDividendTypeText(dividend.type)}</td>
                <td>$${dividend.perShare.toFixed(2)}</td>
                <td>${dividend.shares.toLocaleString()}</td>
                <td>$${dividend.netAmount.toLocaleString()}</td>
                <td>
                    <button class="btn-small btn-edit" onclick="portfolio.editDividend('${dividend.id}')">編輯</button>
                    <button class="btn-small btn-delete" onclick="portfolio.deleteDividend('${dividend.id}')">刪除</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        if (allDividends.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #7f8c8d;">尚無股息記錄</td></tr>';
        }
    }

    getDividendTypeText(type) {
        const types = {
            'cash': '現金股息',
            'stock': '股票股息',
            'both': '現金+股票'
        };
        return types[type] || type;
    }

    loadAddDividendForm() {
        // 載入股票選項
        const stockSelect = document.getElementById('dividendStock');
        stockSelect.innerHTML = '<option value="">請選擇股票</option>';
        
        this.stocks.forEach(stock => {
            const option = document.createElement('option');
            option.value = stock.id;
            option.textContent = `${stock.code} ${stock.name}`;
            stockSelect.appendChild(option);
        });
        
        // 設定今天為預設日期
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dividendDate').value = today;
        
        // 載入預設扣稅率
        const defaultTaxRate = localStorage.getItem('defaultTaxRate') || '0';
        document.getElementById('taxRate').value = defaultTaxRate;
    }

    setupDividendForm() {
        const form = document.getElementById('addDividendForm');
        const stockSelect = document.getElementById('dividendStock');
        const sharesInput = document.getElementById('sharesAtDate');
        const perShareInput = document.getElementById('dividendPerShare');
        const taxRateInput = document.getElementById('taxRate');
        
        // 當選擇股票時，自動填入持股數
        stockSelect.addEventListener('change', () => {
            const stockId = parseInt(stockSelect.value);
            const stock = this.stocks.find(s => s.id === stockId);
            if (stock) {
                sharesInput.value = stock.shares;
                this.updateDividendPreview();
            }
        });
        
        // 即時更新預覽
        [perShareInput, sharesInput, taxRateInput].forEach(input => {
            input.addEventListener('input', () => {
                this.updateDividendPreview();
            });
        });
        
        // 表單提交
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addDividendRecord();
        });
    }

    updateDividendPreview() {
        const perShare = parseFloat(document.getElementById('dividendPerShare').value) || 0;
        const shares = parseInt(document.getElementById('sharesAtDate').value) || 0;
        const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
        
        const grossIncome = perShare * shares;
        const taxAmount = grossIncome * (taxRate / 100);
        const netIncome = grossIncome - taxAmount;
        
        document.getElementById('previewIncome').textContent = `$${grossIncome.toLocaleString()}`;
        document.getElementById('previewTax').textContent = `$${taxAmount.toLocaleString()}`;
        document.getElementById('previewNet').textContent = `$${netIncome.toLocaleString()}`;
    }

    addDividendRecord() {
        const formData = {
            stockId: parseInt(document.getElementById('dividendStock').value),
            date: document.getElementById('dividendDate').value,
            type: document.getElementById('dividendType').value,
            perShare: parseFloat(document.getElementById('dividendPerShare').value),
            shares: parseInt(document.getElementById('sharesAtDate').value),
            taxRate: parseFloat(document.getElementById('taxRate').value),
            note: document.getElementById('dividendNote').value.trim()
        };
        
        // 驗證資料
        if (!formData.stockId || !formData.date || !formData.perShare || !formData.shares) {
            alert('請填寫所有必填欄位');
            return;
        }
        
        // 計算金額
        const grossAmount = formData.perShare * formData.shares;
        const taxAmount = grossAmount * (formData.taxRate / 100);
        const netAmount = grossAmount - taxAmount;
        
        // 建立股息記錄
        const dividendRecord = {
            id: Date.now().toString(),
            date: formData.date,
            type: formData.type,
            perShare: formData.perShare,
            shares: formData.shares,
            grossAmount: grossAmount,
            taxAmount: taxAmount,
            netAmount: netAmount,
            taxRate: formData.taxRate,
            note: formData.note
        };
        
        // 找到對應股票並新增記錄
        const stock = this.stocks.find(s => s.id === formData.stockId);
        if (stock) {
            if (!stock.dividends) {
                stock.dividends = [];
            }
            stock.dividends.push(dividendRecord);
            
            // 更新累計股息
            stock.totalDividends = (stock.totalDividends || 0) + netAmount;
            
            // 更新調整後成本價 (如果啟用)
            if (stock.dividendAdjustment !== false) {
                const dividendPerShare = netAmount / stock.shares;
                stock.adjustedCostPrice = Math.max(0.01, stock.costPrice - dividendPerShare);
            }
            
            this.saveData();
            this.renderStocks();
            
            // 清空表單
            document.getElementById('addDividendForm').reset();
            this.loadAddDividendForm();
            
            // 切換到記錄頁面
            document.querySelector('[data-tab="records"]').click();
            
            alert('✅ 股息記錄已新增');
        }
    }

    loadDividendSettings() {
        // 載入全域設定
        const globalAdjustment = localStorage.getItem('globalDividendAdjustment') !== 'false';
        document.getElementById('globalDividendAdjustment').checked = globalAdjustment;
        
        const defaultTaxRate = localStorage.getItem('defaultTaxRate') || '0';
        document.getElementById('defaultTaxRate').value = defaultTaxRate;
        
        // 載入個股設定
        this.renderStockDividendSettings();
        
        // 設定儲存按鈕
        document.getElementById('saveDividendSettings').addEventListener('click', () => {
            this.saveDividendSettings();
        });
    }

    renderStockDividendSettings() {
        const container = document.getElementById('stockDividendSettings');
        container.innerHTML = '';
        
        this.stocks.forEach(stock => {
            const settingItem = document.createElement('div');
            settingItem.className = 'stock-setting-item';
            
            const isEnabled = stock.dividendAdjustment !== false;
            
            settingItem.innerHTML = `
                <div class="stock-info">
                    <div class="stock-name">${stock.name}</div>
                    <div class="stock-code">${stock.code}</div>
                </div>
                <label class="checkbox-label">
                    <input type="checkbox" ${isEnabled ? 'checked' : ''} 
                           onchange="portfolio.toggleStockDividendAdjustment(${stock.id}, this.checked)">
                    <span class="checkmark"></span>
                    啟用股息調整
                </label>
            `;
            
            container.appendChild(settingItem);
        });
    }

    toggleStockDividendAdjustment(stockId, enabled) {
        const stock = this.stocks.find(s => s.id === stockId);
        if (stock) {
            stock.dividendAdjustment = enabled;
            
            // 重新計算調整後成本價
            if (enabled && stock.totalDividends > 0) {
                const dividendPerShare = stock.totalDividends / stock.shares;
                stock.adjustedCostPrice = Math.max(0.01, stock.costPrice - dividendPerShare);
            } else {
                stock.adjustedCostPrice = stock.costPrice;
            }
            
            this.saveData();
            this.renderStocks();
        }
    }

    saveDividendSettings() {
        const globalAdjustment = document.getElementById('globalDividendAdjustment').checked;
        const defaultTaxRate = document.getElementById('defaultTaxRate').value;
        
        localStorage.setItem('globalDividendAdjustment', globalAdjustment.toString());
        localStorage.setItem('defaultTaxRate', defaultTaxRate);
        
        // 套用全域設定到所有股票
        this.stocks.forEach(stock => {
            if (stock.dividendAdjustment === undefined) {
                stock.dividendAdjustment = globalAdjustment;
            }
        });
        
        this.saveData();
        alert('✅ 設定已儲存');
    }

    deleteDividend(dividendId) {
        if (!confirm('確定要刪除這筆股息記錄嗎？')) {
            return;
        }
        
        // 找到並刪除股息記錄
        this.stocks.forEach(stock => {
            if (stock.dividends) {
                const dividendIndex = stock.dividends.findIndex(d => d.id === dividendId);
                if (dividendIndex !== -1) {
                    const dividend = stock.dividends[dividendIndex];
                    
                    // 更新累計股息
                    stock.totalDividends = (stock.totalDividends || 0) - dividend.netAmount;
                    
                    // 重新計算調整後成本價
                    if (stock.dividendAdjustment !== false && stock.totalDividends > 0) {
                        const dividendPerShare = stock.totalDividends / stock.shares;
                        stock.adjustedCostPrice = Math.max(0.01, stock.costPrice - dividendPerShare);
                    } else {
                        stock.adjustedCostPrice = stock.costPrice;
                    }
                    
                    // 刪除記錄
                    stock.dividends.splice(dividendIndex, 1);
                    
                    this.saveData();
                    this.renderStocks();
                    this.loadDividendRecords();
                    
                    alert('✅ 股息記錄已刪除');
                }
            }
        });
    }

    showStockDividends(stockId) {
        const stock = this.stocks.find(s => s.id === stockId);
        if (!stock) return;
        
        const dividends = stock.dividends || [];
        
        if (dividends.length === 0) {
            const addDividend = confirm(`${stock.name} (${stock.code}) 尚無股息記錄。\n\n是否要新增股息記錄？`);
            if (addDividend) {
                this.showDividendModal();
                // 自動選擇該股票
                setTimeout(() => {
                    const stockSelect = document.getElementById('dividendStock');
                    stockSelect.value = stockId;
                    stockSelect.dispatchEvent(new Event('change'));
                    // 切換到新增頁面
                    document.querySelector('[data-tab="add"]').click();
                }, 100);
            }
            return;
        }
        
        // 計算統計資料
        const totalDividends = dividends.reduce((sum, d) => sum + d.netAmount, 0);
        const currentYear = new Date().getFullYear();
        const yearlyDividends = dividends
            .filter(d => new Date(d.date).getFullYear() === currentYear)
            .reduce((sum, d) => sum + d.netAmount, 0);
        
        const totalCost = stock.shares * (stock.adjustedCostPrice || stock.costPrice);
        const dividendYield = totalCost > 0 ? (yearlyDividends / totalCost * 100) : 0;
        
        // 顯示股息詳情
        let message = `📊 ${stock.name} (${stock.code}) 股息記錄\n\n`;
        message += `💰 累計股息收入: ${totalDividends.toLocaleString()} 元\n`;
        message += `📅 本年度股息: ${yearlyDividends.toLocaleString()} 元\n`;
        message += `📈 年化殖利率: ${dividendYield.toFixed(2)}%\n\n`;
        message += `📋 股息記錄 (共 ${dividends.length} 筆):\n`;
        
        // 按日期排序顯示
        const sortedDividends = [...dividends].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedDividends.forEach((dividend, index) => {
            if (index < 5) { // 只顯示最近5筆
                message += `\n${dividend.date} - ${this.getDividendTypeText(dividend.type)}`;
                message += `\n  每股: ${dividend.perShare.toFixed(2)} 元`;
                message += `\n  股數: ${dividend.shares.toLocaleString()} 股`;
                message += `\n  淨收入: ${dividend.netAmount.toLocaleString()} 元`;
                if (dividend.note) {
                    message += `\n  備註: ${dividend.note}`;
                }
            }
        });
        
        if (dividends.length > 5) {
            message += `\n\n... 還有 ${dividends.length - 5} 筆記錄`;
        }
        
        message += `\n\n💡 提示: 點擊「股息管理」可查看完整記錄`;
        
        alert(message);
    }

    toggleActionMenu(stockId) {
        // 關閉所有其他的下拉選單
        document.querySelectorAll('.action-menu').forEach(menu => {
            if (menu.id !== `actionMenu${stockId}`) {
                menu.classList.remove('show');
            }
        });
        
        // 切換當前選單
        const menu = document.getElementById(`actionMenu${stockId}`);
        const button = document.querySelector(`button[onclick="portfolio.toggleActionMenu(${stockId})"]`);
        
        if (menu && button) {
            const isShowing = menu.classList.contains('show');
            
            if (!isShowing) {
                // 計算按鈕位置
                const buttonRect = button.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                
                // 預估選單高度（4個項目 * 約50px）
                const estimatedMenuHeight = 200;
                
                // 計算最佳位置
                let top = buttonRect.bottom + 5;
                let left = buttonRect.right - 160; // 選單寬度160px，右對齊
                
                // 如果選單會超出視窗底部，則顯示在按鈕上方
                if (top + estimatedMenuHeight > viewportHeight) {
                    top = buttonRect.top - estimatedMenuHeight - 5;
                }
                
                // 如果選單會超出視窗左側，則調整到右側
                if (left < 10) {
                    left = buttonRect.left;
                }
                
                // 如果選單會超出視窗右側，則調整到左側
                if (left + 160 > viewportWidth - 10) {
                    left = viewportWidth - 170;
                }
                
                // 設定選單位置
                menu.style.top = `${top}px`;
                menu.style.left = `${left}px`;
                
                // 顯示選單
                menu.classList.add('show');
            } else {
                // 隱藏選單
                menu.classList.remove('show');
            }
        }
        
        // 點擊外部關閉選單
        if (menu && menu.classList.contains('show')) {
            const closeHandler = (e) => {
                if (!e.target.closest('.action-dropdown')) {
                    menu.classList.remove('show');
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', closeHandler);
            }, 0);
        }
    }

    closeAllActionMenus() {
        document.querySelectorAll('.action-menu').forEach(menu => {
            menu.classList.remove('show');
        });
    }

    closeModals() {
        document.getElementById('addStockModal').style.display = 'none';
        document.getElementById('addAccountModal').style.display = 'none';
        document.getElementById('manageAccountModal').style.display = 'none';
        document.getElementById('dividendModal').style.display = 'none';
        
        // 清空表單
        document.getElementById('addStockForm').reset();
        document.getElementById('addAccountForm').reset();
        
        // 清空搜尋狀態
        const searchStatuses = document.querySelectorAll('.search-status');
        searchStatuses.forEach(status => {
            status.textContent = '';
            status.className = 'search-status';
        });
    }

    async addStock() {
        const formData = {
            code: document.getElementById('stockCode').value.trim().toUpperCase(),
            name: document.getElementById('stockName').value.trim(),
            account: document.getElementById('account').value,
            shares: parseInt(document.getElementById('shares').value),
            costPrice: parseFloat(document.getElementById('costPrice').value),
            purchaseDate: document.getElementById('purchaseDate').value
        };

        // 驗證資料
        if (!formData.code || !formData.shares || !formData.costPrice || !formData.purchaseDate) {
            alert('請填寫所有必填欄位');
            return;
        }

        // 驗證股票代碼格式
        if (!/^[0-9]{4}[A-Z]*$/.test(formData.code)) {
            alert('股票代碼格式錯誤，請輸入正確的台股代碼 (例如: 2330, 0050)');
            return;
        }

        // 如果沒有填寫股票名稱，嘗試自動獲取
        if (!formData.name) {
            try {
                const stockInfo = await this.searchStockByCode(formData.code);
                if (stockInfo.name) {
                    formData.name = stockInfo.name;
                } else {
                    alert('找不到此股票代碼，請手動輸入股票名稱');
                    return;
                }
            } catch (error) {
                alert('無法驗證股票代碼，請確認代碼正確並手動輸入股票名稱');
                return;
            }
        }

        // 檢查是否已有相同股票，如果有則詢問是否要合併或新增
        const existingStock = this.stocks.find(stock => 
            stock.code === formData.code && stock.account === formData.account
        );

        if (existingStock) {
            const choice = confirm(
                `此帳戶已有 ${formData.name} (${formData.code}) 的紀錄。\n\n` +
                `現有：${existingStock.shares} 股，成本價 ${existingStock.costPrice}\n` +
                `新增：${formData.shares} 股，成本價 ${formData.costPrice}\n\n` +
                `點擊「確定」合併為一筆記錄\n` +
                `點擊「取消」新增為獨立記錄`
            );

            if (choice) {
                // 合併到現有記錄
                this.mergeStockPurchase(existingStock, formData);
                this.closeModals();
                return;
            } else {
                // 新增為獨立記錄，修改ID以避免衝突
                formData.id = Date.now() + Math.random();
            }
        }

        // 新增股票
        const newStock = {
            id: formData.id || Date.now(),
            ...formData,
            currentPrice: formData.costPrice, // 初始使用成本價
            lastUpdate: null,
            error: null,
            dividends: [], // 股息記錄
            totalDividends: 0, // 累計股息收入
            adjustedCostPrice: formData.costPrice, // 調整後成本價
            dividendAdjustment: true, // 是否啟用股息調整成本價
            purchaseHistory: [{ // 購買歷史記錄
                date: formData.purchaseDate,
                shares: formData.shares,
                costPrice: formData.costPrice,
                amount: formData.shares * formData.costPrice
            }]
        };

        this.stocks.push(newStock);
        this.saveData();
        this.renderStocks();
        this.closeModals();
        
        // 立即更新新股票的價格
        this.updateStockPrice(newStock);
        
        // 自動計算應得股息
        this.calculateHistoricalDividends(newStock);
    }

    mergeStockPurchase(existingStock, newPurchase) {
        // 計算合併後的平均成本價
        const totalShares = existingStock.shares + newPurchase.shares;
        const totalAmount = (existingStock.shares * existingStock.costPrice) + 
                           (newPurchase.shares * newPurchase.costPrice);
        const avgCostPrice = totalAmount / totalShares;

        // 更新股票資料
        existingStock.shares = totalShares;
        existingStock.costPrice = avgCostPrice;
        existingStock.adjustedCostPrice = avgCostPrice;

        // 新增購買歷史記錄
        if (!existingStock.purchaseHistory) {
            existingStock.purchaseHistory = [{
                date: existingStock.purchaseDate || new Date().toISOString().split('T')[0],
                shares: existingStock.shares - newPurchase.shares,
                costPrice: existingStock.costPrice,
                amount: (existingStock.shares - newPurchase.shares) * existingStock.costPrice
            }];
        }

        existingStock.purchaseHistory.push({
            date: newPurchase.purchaseDate,
            shares: newPurchase.shares,
            costPrice: newPurchase.costPrice,
            amount: newPurchase.shares * newPurchase.costPrice
        });

        // 更新最早購買日期
        const allDates = existingStock.purchaseHistory.map(p => p.date);
        existingStock.purchaseDate = allDates.sort()[0];

        this.saveData();
        this.renderStocks();
        
        alert(`✅ 已合併購買記錄\n\n` +
              `總持股：${totalShares} 股\n` +
              `平均成本價：${avgCostPrice.toFixed(2)} 元`);
        
        // 重新計算應得股息
        this.calculateHistoricalDividends(existingStock);
    }

    // 台股股息歷史資料庫 (部分常見股票的歷史股息資料)
    getDividendDatabase() {
        return {
            '2330': [ // 台積電
                { year: 2024, cashDividend: 11.0, stockDividend: 0, exDate: '2024-06-13' },
                { year: 2023, cashDividend: 11.0, stockDividend: 0, exDate: '2023-06-15' },
                { year: 2022, cashDividend: 11.0, stockDividend: 0, exDate: '2022-06-16' },
                { year: 2021, cashDividend: 10.0, stockDividend: 0, exDate: '2021-06-17' }
            ],
            '0050': [ // 元大台灣50
                { year: 2024, cashDividend: 3.7, stockDividend: 0, exDate: '2024-10-21' },
                { year: 2023, cashDividend: 3.6, stockDividend: 0, exDate: '2023-10-19' },
                { year: 2022, cashDividend: 3.6, stockDividend: 0, exDate: '2022-10-20' },
                { year: 2021, cashDividend: 3.05, stockDividend: 0, exDate: '2021-10-21' }
            ],
            '0056': [ // 元大高股息
                { year: 2024, cashDividend: 2.3, stockDividend: 0, exDate: '2024-10-23' },
                { year: 2023, cashDividend: 2.2, stockDividend: 0, exDate: '2023-10-25' },
                { year: 2022, cashDividend: 1.8, stockDividend: 0, exDate: '2022-10-26' },
                { year: 2021, cashDividend: 1.6, stockDividend: 0, exDate: '2021-10-27' }
            ],
            '2317': [ // 鴻海
                { year: 2024, cashDividend: 5.2, stockDividend: 0, exDate: '2024-07-18' },
                { year: 2023, cashDividend: 5.0, stockDividend: 0, exDate: '2023-07-20' },
                { year: 2022, cashDividend: 4.8, stockDividend: 0, exDate: '2022-07-21' },
                { year: 2021, cashDividend: 4.2, stockDividend: 0, exDate: '2021-07-22' }
            ],
            '2454': [ // 聯發科
                { year: 2024, cashDividend: 75.0, stockDividend: 0, exDate: '2024-06-20' },
                { year: 2023, cashDividend: 70.0, stockDividend: 0, exDate: '2023-06-21' },
                { year: 2022, cashDividend: 80.0, stockDividend: 0, exDate: '2022-06-22' },
                { year: 2021, cashDividend: 60.0, stockDividend: 0, exDate: '2021-06-23' }
            ]
        };
    }

    calculateHistoricalDividends(stock) {
        const dividendDB = this.getDividendDatabase();
        const stockDividends = dividendDB[stock.code];
        
        if (!stockDividends || !stock.purchaseHistory) {
            console.log(`${stock.code} 無歷史股息資料或購買記錄`);
            return;
        }

        let calculatedDividends = [];
        let totalCalculatedDividends = 0;

        // 遍歷每個購買記錄
        stock.purchaseHistory.forEach(purchase => {
            const purchaseDate = new Date(purchase.date);
            
            // 找出購買後的所有股息發放
            stockDividends.forEach(dividend => {
                const exDate = new Date(dividend.exDate);
                
                // 如果除息日在購買日之後，則有資格領取股息
                if (exDate > purchaseDate) {
                    const cashAmount = purchase.shares * dividend.cashDividend;
                    
                    if (cashAmount > 0) {
                        // 檢查是否已經有這筆股息記錄
                        const existingDividend = stock.dividends.find(d => 
                            d.date === dividend.exDate && d.calculatedFromPurchase === true
                        );
                        
                        if (!existingDividend) {
                            const dividendRecord = {
                                id: `calc_${stock.id}_${dividend.year}`,
                                date: dividend.exDate,
                                type: 'cash',
                                perShare: dividend.cashDividend,
                                shares: purchase.shares,
                                grossAmount: cashAmount,
                                taxAmount: cashAmount * 0.1, // 假設10%扣稅
                                netAmount: cashAmount * 0.9,
                                taxRate: 10,
                                note: `自動計算 - ${dividend.year}年股息`,
                                calculatedFromPurchase: true // 標記為自動計算
                            };
                            
                            calculatedDividends.push(dividendRecord);
                            totalCalculatedDividends += dividendRecord.netAmount;
                        }
                    }
                }
            });
        });

        if (calculatedDividends.length > 0) {
            // 將計算出的股息加入記錄
            stock.dividends = stock.dividends.concat(calculatedDividends);
            stock.totalDividends = (stock.totalDividends || 0) + totalCalculatedDividends;
            
            // 重新計算調整後成本價
            if (stock.dividendAdjustment !== false) {
                const dividendPerShare = stock.totalDividends / stock.shares;
                stock.adjustedCostPrice = Math.max(0.01, stock.costPrice - dividendPerShare);
            }
            
            this.saveData();
            this.renderStocks();
            
            alert(`✅ 自動計算完成\n\n` +
                  `${stock.name} (${stock.code})\n` +
                  `計算出 ${calculatedDividends.length} 筆股息記錄\n` +
                  `總股息收入：${totalCalculatedDividends.toLocaleString()} 元`);
        } else {
            console.log(`${stock.code} 購買日期後無股息發放記錄`);
        }
    }

    showPurchaseHistory(stockId) {
        const stock = this.stocks.find(s => s.id === stockId);
        if (!stock) return;
        
        let message = `📋 ${stock.name} (${stock.code}) 購買歷史\n\n`;
        
        if (!stock.purchaseHistory || stock.purchaseHistory.length === 0) {
            // 如果沒有購買歷史，但有購買日期，顯示單次購買
            if (stock.purchaseDate) {
                message += `購買日期：${stock.purchaseDate}\n`;
                message += `購買股數：${stock.shares.toLocaleString()} 股\n`;
                message += `購買成本：${stock.costPrice.toFixed(2)} 元\n`;
                message += `購買金額：${(stock.shares * stock.costPrice).toLocaleString()} 元\n\n`;
                message += `💡 提示：這是舊版資料格式，建議重新新增以支援多次買入功能`;
            } else {
                message += `暫無購買歷史記錄`;
            }
        } else {
            // 顯示詳細購買歷史
            message += `📊 購買統計：\n`;
            message += `總持股：${stock.shares.toLocaleString()} 股\n`;
            message += `平均成本：${stock.costPrice.toFixed(2)} 元\n`;
            message += `總投入：${(stock.shares * stock.costPrice).toLocaleString()} 元\n\n`;
            
            message += `📅 購買明細 (共 ${stock.purchaseHistory.length} 次)：\n`;
            
            // 按日期排序顯示
            const sortedHistory = [...stock.purchaseHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            sortedHistory.forEach((purchase, index) => {
                message += `\n${index + 1}. ${purchase.date}`;
                message += `\n   股數：${purchase.shares.toLocaleString()} 股`;
                message += `\n   成本：${purchase.costPrice.toFixed(2)} 元`;
                message += `\n   金額：${purchase.amount.toLocaleString()} 元`;
            });
            
            // 顯示自動計算的股息資訊
            const calculatedDividends = stock.dividends?.filter(d => d.calculatedFromPurchase) || [];
            if (calculatedDividends.length > 0) {
                message += `\n\n💰 自動計算股息：`;
                message += `\n已計算 ${calculatedDividends.length} 筆股息記錄`;
                message += `\n總股息收入：${calculatedDividends.reduce((sum, d) => sum + d.netAmount, 0).toLocaleString()} 元`;
            }
        }
        
        alert(message);
    }

    addAccount() {
        const accountName = document.getElementById('accountName').value.trim();
        
        if (!accountName) {
            alert('請輸入帳戶名稱');
            return;
        }

        if (this.accounts.includes(accountName)) {
            alert('帳戶名稱已存在');
            return;
        }

        this.accounts.push(accountName);
        this.updateAccountTabs();
        this.closeModals();
        this.saveData();
    }

    switchAccount(account) {
        this.currentFilter = account;
        
        // 更新標籤樣式
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-account="${account}"]`).classList.add('active');
        
        this.renderStocks();
    }

    updateAccountTabs() {
        const tabsContainer = document.getElementById('accountTabs');
        tabsContainer.innerHTML = '<button class="tab-btn active" data-account="all">全部</button>';
        
        this.accounts.forEach(account => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.dataset.account = account;
            btn.textContent = account;
            tabsContainer.appendChild(btn);
        });
    }

    async refreshStockPrices() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.innerHTML = '<span class="loading"></span> 更新中...';
        refreshBtn.disabled = true;

        const promises = this.stocks.map(stock => this.updateStockPrice(stock));
        await Promise.all(promises);

        refreshBtn.innerHTML = '更新股價';
        refreshBtn.disabled = false;
        
        this.renderStocks();
        this.updateLastUpdateTime();
    }

    async updateStockPrice(stock) {
        try {
            console.log(`正在更新 ${stock.code} 的股價...`);
            
            // 顯示載入狀態
            this.updateStockLoadingState(stock.id, true);
            
            // 使用新的 API 模組
            const result = await this.stockAPI.getStockPrice(stock.code);
            
            stock.currentPrice = result.price;
            stock.lastUpdate = result.timestamp;
            stock.error = null;
            stock.source = result.source;
            stock.change = result.change || 0;
            stock.changePercent = result.changePercent || 0;
            
            console.log(`✅ ${stock.code} 股價更新成功: $${result.price} (來源: ${result.source})`);
            
        } catch (error) {
            console.error(`❌ 更新股價失敗: ${stock.code}`, error);
            stock.error = error.message;
            
            // 如果是第一次載入且沒有歷史價格，使用成本價作為預設值
            if (!stock.currentPrice || stock.currentPrice === 0) {
                stock.currentPrice = stock.costPrice;
                console.warn(`${stock.code} 使用成本價作為預設值`);
            }
            
            // 拋出錯誤讓調用者知道失敗了
            throw error;
        } finally {
            this.updateStockLoadingState(stock.id, false);
        }
    }

    updateStockLoadingState(stockId, isLoading) {
        // 在表格中顯示載入狀態
        const rows = document.querySelectorAll('#stockTableBody tr');
        rows.forEach(row => {
            const cells = row.cells;
            if (cells.length > 0) {
                const code = cells[0].textContent;
                const stock = this.stocks.find(s => s.code === code);
                if (stock && stock.id === stockId) {
                    const priceCell = cells[5]; // 現價欄位
                    if (isLoading) {
                        priceCell.innerHTML = '<span class="loading"></span>';
                    }
                }
            }
        });
    }

    renderStocks() {
        const tbody = document.getElementById('stockTableBody');
        const filteredStocks = this.currentFilter === 'all' 
            ? this.stocks 
            : this.stocks.filter(stock => stock.account === this.currentFilter);

        tbody.innerHTML = '';

        filteredStocks.forEach(stock => {
            const row = this.createStockRow(stock);
            tbody.appendChild(row);
        });

        this.updateSummary();
        
        // 重新套用隱私模式
        this.applyPrivacyModes();
    }

    createStockRow(stock) {
        const row = document.createElement('tr');
        
        // 計算損益 (使用調整後成本價)
        const effectiveCostPrice = stock.adjustedCostPrice || stock.costPrice;
        const marketValue = stock.shares * stock.currentPrice;
        const totalCost = stock.shares * effectiveCostPrice;
        const profit = marketValue - totalCost;
        const profitRate = totalCost > 0 ? (profit / totalCost * 100) : 0;
        
        // 加入股息收入到總收益
        const totalDividends = stock.totalDividends || 0;
        const totalReturn = profit + totalDividends;
        const totalReturnRate = totalCost > 0 ? (totalReturn / totalCost * 100) : 0;
        
        const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
        const profitSign = profit >= 0 ? '+' : '';

        // 計算年化殖利率 (基於調整後成本價)
        const currentYear = new Date().getFullYear();
        const yearlyDividends = (stock.dividends || [])
            .filter(d => new Date(d.date).getFullYear() === currentYear)
            .reduce((sum, d) => sum + d.netAmount, 0);
        const dividendYield = totalCost > 0 ? (yearlyDividends / totalCost * 100) : 0;

        const totalReturnClass = totalReturn >= 0 ? 'profit-positive' : 'profit-negative';
        const totalReturnSign = totalReturn >= 0 ? '+' : '';

        // 處理股價顯示
        let priceDisplay = `$${stock.currentPrice.toFixed(2)}`;
        if (stock.error) {
            priceDisplay += ` <span class="error-indicator" title="${stock.error}">⚠️</span>`;
        }
        if (stock.source) {
            priceDisplay += ` <small class="source-info">(${stock.source})</small>`;
        }

        // 處理最後更新時間
        let updateTime = '--';
        if (stock.lastUpdate) {
            const now = new Date();
            const lastUpdate = new Date(stock.lastUpdate);
            const diff = Math.floor((now - lastUpdate) / 1000);
            if (diff < 60) {
                updateTime = `${diff}秒前`;
            } else if (diff < 3600) {
                updateTime = `${Math.floor(diff / 60)}分鐘前`;
            } else {
                updateTime = lastUpdate.toLocaleTimeString('zh-TW', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }

        row.innerHTML = `
            <td>${stock.code}</td>
            <td>${stock.name}</td>
            <td>${stock.account}</td>
            <td class="purchase-date-cell">
                ${this.formatPurchaseDate(stock)}
            </td>
            <td class="editable-cell" onclick="portfolio.editShares(${stock.id})" title="點擊編輯股數">
                <span class="editable-value">${stock.shares.toLocaleString()}</span>
                <span class="edit-icon">✏️</span>
            </td>
            <td class="editable-cell" onclick="portfolio.editCostPrice(${stock.id})" title="點擊編輯成本價">
                <span class="editable-value stock-privacy-value">${stock.costPrice.toFixed(2)}</span>
                <span class="edit-icon">✏️</span>
                ${effectiveCostPrice !== stock.costPrice ? 
                    `<br><small class="adjusted-price" title="股息調整後成本價">調整後: ${effectiveCostPrice.toFixed(2)}</small>` : ''}
            </td>
            <td>${priceDisplay}<br><small class="update-time">${updateTime}</small></td>
            <td class="stock-privacy-value">$${marketValue.toLocaleString()}</td>
            <td class="${profitClass} stock-privacy-value">${profitSign}$${profit.toLocaleString()}</td>
            <td class="${profitClass}">${profitSign}${profitRate.toFixed(2)}%</td>
            <td class="dividend-info">
                <div class="stock-privacy-value">${totalDividends.toLocaleString()}</div>
                <small class="dividend-yield">${dividendYield.toFixed(2)}%</small>
            </td>
            <td class="${totalReturnClass} stock-privacy-value total-return" title="含股息總報酬">
                ${totalReturnSign}${totalReturn.toLocaleString()}
                <br><small>(${totalReturnSign}${totalReturnRate.toFixed(2)}%)</small>
            </td>
            <td class="action-cell">
                <div class="action-dropdown">
                    <button class="action-toggle" onclick="portfolio.toggleActionMenu(${stock.id})" title="操作選單">
                        <span class="action-icon">⚙️</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="action-menu" id="actionMenu${stock.id}">
                        <button class="action-item refresh-action" onclick="portfolio.refreshSingleStock(${stock.id})" title="更新股價">
                            <span class="action-icon">🔄</span>
                            <span class="action-text">更新股價</span>
                        </button>
                        <button class="action-item history-action" onclick="portfolio.showPurchaseHistory(${stock.id})" title="購買歷史">
                            <span class="action-icon">📋</span>
                            <span class="action-text">購買歷史</span>
                        </button>
                        <button class="action-item dividend-action" onclick="portfolio.showStockDividends(${stock.id})" title="股息記錄">
                            <span class="action-icon">💰</span>
                            <span class="action-text">股息記錄</span>
                        </button>
                        <button class="action-item delete-action" onclick="portfolio.deleteStock(${stock.id})" title="刪除股票">
                            <span class="action-icon">🗑️</span>
                            <span class="action-text">刪除</span>
                        </button>
                    </div>
                </div>
            </td>
        `;

        return row;
    }

    formatPurchaseDate(stock) {
        if (!stock.purchaseDate && !stock.purchaseHistory) {
            return '<small class="text-muted">未記錄</small>';
        }
        
        // 如果有購買歷史記錄，顯示最早和最新的日期
        if (stock.purchaseHistory && stock.purchaseHistory.length > 1) {
            const dates = stock.purchaseHistory.map(p => p.date).sort();
            const earliestDate = dates[0];
            const latestDate = dates[dates.length - 1];
            
            return `
                <div class="purchase-dates">
                    <div class="earliest-date">${earliestDate}</div>
                    <small class="purchase-count" title="共 ${stock.purchaseHistory.length} 次買入">
                        +${stock.purchaseHistory.length - 1} 次
                    </small>
                </div>
            `;
        }
        
        // 單次購買
        const purchaseDate = stock.purchaseDate || (stock.purchaseHistory && stock.purchaseHistory[0]?.date);
        return purchaseDate ? `<div class="single-purchase">${purchaseDate}</div>` : '<small class="text-muted">未記錄</small>';
    }

    async refreshSingleStock(stockId) {
        const stock = this.stocks.find(s => s.id === stockId);
        if (!stock) {
            console.error('找不到股票:', stockId);
            return;
        }

        // 找到對應的按鈕並顯示載入狀態
        const refreshBtn = document.querySelector(`button[onclick="portfolio.refreshSingleStock(${stockId})"]`);
        if (refreshBtn) {
            refreshBtn.innerHTML = '<span class="loading"></span>';
            refreshBtn.disabled = true;
        }

        try {
            console.log(`手動更新 ${stock.code} 股價...`);
            await this.updateStockPrice(stock);
            this.renderStocks();
            console.log(`${stock.code} 更新完成`);
        } catch (error) {
            console.error(`手動更新 ${stock.code} 失敗:`, error);
            alert(`更新 ${stock.code} 失敗: ${error.message}`);
        } finally {
            // 恢復按鈕狀態
            if (refreshBtn) {
                refreshBtn.innerHTML = '🔄';
                refreshBtn.disabled = false;
            }
        }
    }

    showBatchEditMode() {
        const message = `批量編輯功能:\n\n選擇操作類型:`;
        const options = [
            '1. 按比例調整所有持股數量',
            '2. 按比例調整特定帳戶持股數量',
            '3. 統一調整成本價 (加減固定金額)',
            '4. 取消'
        ];
        
        const choice = prompt(message + '\n\n' + options.join('\n') + '\n\n請輸入選項 (1-4):');
        
        switch(choice) {
            case '1':
                this.batchAdjustShares('all');
                break;
            case '2':
                this.batchAdjustShares('account');
                break;
            case '3':
                this.batchAdjustCostPrice();
                break;
            case '4':
            default:
                return;
        }
    }

    batchAdjustShares(mode) {
        let targetAccount = null;
        
        if (mode === 'account') {
            targetAccount = prompt('請輸入要調整的帳戶名稱:', this.accounts[0]);
            if (!targetAccount || !this.accounts.includes(targetAccount)) {
                alert('帳戶名稱無效');
                return;
            }
        }
        
        const ratio = prompt('請輸入調整比例 (例如: 1.5 表示增加50%, 0.8 表示減少20%):', '1.0');
        const adjustRatio = parseFloat(ratio);
        
        if (isNaN(adjustRatio) || adjustRatio <= 0) {
            alert('請輸入有效的比例 (正數)');
            return;
        }
        
        let affectedStocks = this.stocks;
        if (mode === 'account') {
            affectedStocks = this.stocks.filter(stock => stock.account === targetAccount);
        }
        
        if (affectedStocks.length === 0) {
            alert('沒有找到符合條件的股票');
            return;
        }
        
        const confirmMsg = `確定要調整 ${affectedStocks.length} 支股票的持股數量嗎？\n調整比例: ${adjustRatio}\n${mode === 'account' ? `目標帳戶: ${targetAccount}` : '目標: 所有股票'}`;
        
        if (confirm(confirmMsg)) {
            affectedStocks.forEach(stock => {
                const newShares = Math.round(stock.shares * adjustRatio);
                console.log(`${stock.code}: ${stock.shares} → ${newShares}`);
                stock.shares = newShares;
            });
            
            this.saveData();
            this.renderStocks();
            alert(`✅ 已成功調整 ${affectedStocks.length} 支股票的持股數量`);
        }
    }

    batchAdjustCostPrice() {
        const adjustment = prompt('請輸入成本價調整金額 (正數表示增加，負數表示減少):', '0');
        const adjustAmount = parseFloat(adjustment);
        
        if (isNaN(adjustAmount)) {
            alert('請輸入有效的調整金額');
            return;
        }
        
        if (adjustAmount === 0) {
            alert('調整金額不能為 0');
            return;
        }
        
        const filteredStocks = this.currentFilter === 'all' 
            ? this.stocks 
            : this.stocks.filter(stock => stock.account === this.currentFilter);
        
        const confirmMsg = `確定要調整 ${filteredStocks.length} 支股票的成本價嗎？\n調整金額: ${adjustAmount > 0 ? '+' : ''}${adjustAmount}\n範圍: ${this.currentFilter === 'all' ? '所有股票' : this.currentFilter + ' 帳戶'}`;
        
        if (confirm(confirmMsg)) {
            filteredStocks.forEach(stock => {
                const newCostPrice = Math.max(0.01, stock.costPrice + adjustAmount);
                console.log(`${stock.code}: $${stock.costPrice} → $${newCostPrice}`);
                stock.costPrice = newCostPrice;
            });
            
            this.saveData();
            this.renderStocks();
            alert(`✅ 已成功調整 ${filteredStocks.length} 支股票的成本價`);
        }
    }

    editShares(stockId) {
        const stock = this.stocks.find(s => s.id === stockId);
        if (!stock) return;

        const newShares = prompt(`編輯 ${stock.name} (${stock.code}) 的持股數量:`, stock.shares);
        
        if (newShares !== null) {
            const shares = parseInt(newShares);
            
            if (isNaN(shares) || shares < 0) {
                alert('請輸入有效的股數 (正整數)');
                return;
            }
            
            if (shares === 0) {
                if (confirm('股數設為 0 將刪除此股票紀錄，確定要繼續嗎？')) {
                    this.deleteStock(stockId);
                }
                return;
            }
            
            stock.shares = shares;
            this.saveData();
            this.renderStocks();
            
            console.log(`✅ ${stock.code} 股數已更新為: ${shares}`);
        }
    }

    editCostPrice(stockId) {
        const stock = this.stocks.find(s => s.id === stockId);
        if (!stock) return;

        const newCostPrice = prompt(`編輯 ${stock.name} (${stock.code}) 的成本價:`, stock.costPrice.toFixed(2));
        
        if (newCostPrice !== null) {
            const costPrice = parseFloat(newCostPrice);
            
            if (isNaN(costPrice) || costPrice <= 0) {
                alert('請輸入有效的成本價 (正數)');
                return;
            }
            
            stock.costPrice = costPrice;
            this.saveData();
            this.renderStocks();
            
            console.log(`✅ ${stock.code} 成本價已更新為: $${costPrice}`);
        }
    }

    async testApiConnection() {
        const testBtn = document.getElementById('testApiBtn');
        testBtn.innerHTML = '<span class="loading"></span> 測試中...';
        testBtn.disabled = true;

        try {
            console.log('🔍 開始測試 API 連線...');
            
            // 測試台積電股價 (2330)
            const result = await this.stockAPI.getStockPrice('2330');
            
            alert(`✅ API 連線正常！\n\n台積電 (2330) 股價: $${result.price}\n資料來源: ${result.source}\n更新時間: ${result.timestamp.toLocaleString('zh-TW')}`);
            
            console.log('✅ API 測試成功:', result);
            
        } catch (error) {
            console.error('❌ API 測試失敗:', error);
            
            alert(`❌ API 連線失敗！\n\n錯誤訊息: ${error.message}\n\n可能原因:\n1. 網路連線問題\n2. API 服務暫時無法使用\n3. 瀏覽器阻擋跨域請求\n\n請檢查網路連線或稍後再試。`);
        } finally {
            testBtn.innerHTML = '測試 API 連線';
            testBtn.disabled = false;
        }
    }

    deleteStock(stockId) {
        if (confirm('確定要刪除這筆股票紀錄嗎？')) {
            this.stocks = this.stocks.filter(stock => stock.id !== stockId);
            this.saveData();
            this.renderStocks();
        }
    }

    updateSummary() {
        const filteredStocks = this.currentFilter === 'all' 
            ? this.stocks 
            : this.stocks.filter(stock => stock.account === this.currentFilter);

        const totalValue = filteredStocks.reduce((sum, stock) => {
            return sum + (stock.shares * stock.currentPrice);
        }, 0);

        const totalCost = filteredStocks.reduce((sum, stock) => {
            const effectiveCostPrice = stock.adjustedCostPrice || stock.costPrice;
            return sum + (stock.shares * effectiveCostPrice);
        }, 0);

        // 計算總股息收入
        const totalDividends = filteredStocks.reduce((sum, stock) => {
            return sum + (stock.totalDividends || 0);
        }, 0);

        // 計算總報酬 (含股息)
        const totalProfit = totalValue - totalCost;
        const totalReturn = totalProfit + totalDividends;
        const totalReturnRate = totalCost > 0 ? (totalReturn / totalCost * 100) : 0;

        const dailyChange = totalValue - this.lastTotalValue;
        const dailyChangeRate = this.lastTotalValue > 0 ? (dailyChange / this.lastTotalValue * 100) : 0;

        document.getElementById('totalValue').textContent = `${totalValue.toLocaleString()}`;
        
        const dailyChangeElement = document.getElementById('dailyChange');
        const changeSign = dailyChange >= 0 ? '+' : '';
        const changeClass = dailyChange >= 0 ? 'positive' : 'negative';
        
        dailyChangeElement.textContent = `${changeSign}${dailyChange.toLocaleString()} (${changeSign}${dailyChangeRate.toFixed(2)}%)`;
        dailyChangeElement.className = `daily-change ${changeClass}`;

        // 更新總報酬顯示 (如果有對應的元素)
        const totalReturnElement = document.getElementById('totalReturn');
        if (totalReturnElement) {
            const returnSign = totalReturn >= 0 ? '+' : '';
            const returnClass = totalReturn >= 0 ? 'positive' : 'negative';
            totalReturnElement.textContent = `${returnSign}${totalReturn.toLocaleString()} (${returnSign}${totalReturnRate.toFixed(2)}%)`;
            totalReturnElement.className = `total-return ${returnClass}`;
        }

        // 更新股息統計 (如果有對應的元素)
        const totalDividendsElement = document.getElementById('totalDividendsDisplay');
        if (totalDividendsElement) {
            totalDividendsElement.textContent = `${totalDividends.toLocaleString()}`;
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('zh-TW');
        document.getElementById('lastUpdate').textContent = timeString;
    }

    async setupCloudSync() {
        // 檢查是否已設定雲端同步
        if (this.cloudSync.isSetup()) {
            this.cloudSync.enable();
            this.updateSyncStatus('已設定');
            
            // 檢查同步狀態
            const status = await this.cloudSync.checkSyncStatus();
            this.handleSyncStatusCheck(status);
        } else {
            this.updateSyncStatus('未設定');
        }
    }

    async handleCloudSync() {
        if (!this.cloudSync.isSetup()) {
            // 首次設定
            const success = await this.cloudSync.setupCloudSync();
            if (success) {
                this.updateSyncStatus('已設定');
                await this.syncToCloud();
            }
        } else {
            // 顯示同步選單
            this.showSyncMenu();
        }
    }

    async showSyncMenu() {
        const status = await this.cloudSync.checkSyncStatus();
        
        let menu = '雲端同步選單:\n\n';
        menu += `目前狀態: ${status.message}\n\n`;
        
        if (status.cloudTime && status.localTime) {
            menu += `雲端時間: ${status.cloudTime}\n`;
            menu += `本地時間: ${status.localTime}\n\n`;
        }
        
        menu += '1. 上傳到雲端 (覆蓋雲端資料)\n';
        menu += '2. 從雲端下載 (覆蓋本地資料)\n';
        menu += '3. 檢查同步狀態\n';
        menu += '4. 清除雲端設定\n';
        menu += '5. 取消\n\n';
        menu += '請選擇 (1-5):';

        const choice = prompt(menu);
        
        switch(choice) {
            case '1':
                await this.syncToCloud();
                break;
            case '2':
                await this.syncFromCloud();
                break;
            case '3':
                await this.checkSyncStatus();
                break;
            case '4':
                this.clearCloudSetup();
                break;
            default:
                return;
        }
    }

    async syncToCloud() {
        this.updateSyncStatus('上傳中...');
        
        const data = {
            stocks: this.stocks,
            accounts: this.accounts,
            lastTotalValue: this.lastTotalValue,
            lastSync: new Date().toISOString()
        };

        const success = await this.cloudSync.uploadData(data);
        
        if (success) {
            this.updateSyncStatus('已同步');
            alert('✅ 資料已上傳到雲端');
        } else {
            this.updateSyncStatus('同步失敗');
            alert('❌ 上傳失敗，請檢查網路連線');
        }
    }

    async syncFromCloud() {
        this.updateSyncStatus('下載中...');
        
        const cloudData = await this.cloudSync.downloadData();
        
        if (cloudData) {
            // 確認是否要覆蓋本地資料
            const confirm = window.confirm('確定要用雲端資料覆蓋本地資料嗎？\n\n本地資料將會遺失！');
            
            if (confirm) {
                this.stocks = cloudData.stocks || [];
                this.accounts = cloudData.accounts || ['帳戶1', '帳戶2'];
                this.lastTotalValue = cloudData.lastTotalValue || 0;
                
                this.saveData();
                this.updateAccountTabs();
                this.renderStocks();
                
                this.updateSyncStatus('已同步');
                alert('✅ 已從雲端載入資料');
            } else {
                this.updateSyncStatus('已取消');
            }
        } else {
            this.updateSyncStatus('下載失敗');
            alert('❌ 下載失敗，請檢查網路連線');
        }
    }

    async checkSyncStatus() {
        this.updateSyncStatus('檢查中...');
        
        const status = await this.cloudSync.checkSyncStatus();
        this.handleSyncStatusCheck(status);
        
        let message = `同步狀態: ${status.message}`;
        if (status.cloudTime && status.localTime) {
            message += `\n\n雲端時間: ${status.cloudTime}`;
            message += `\n本地時間: ${status.localTime}`;
        }
        
        alert(message);
    }

    handleSyncStatusCheck(status) {
        switch(status.status) {
            case 'cloud_newer':
                this.updateSyncStatus('雲端較新');
                if (confirm('雲端資料較新，是否要下載？')) {
                    this.syncFromCloud();
                }
                break;
            case 'local_newer':
                this.updateSyncStatus('本地較新');
                break;
            case 'synced':
                this.updateSyncStatus('已同步');
                break;
            case 'error':
                this.updateSyncStatus('同步錯誤');
                break;
            default:
                this.updateSyncStatus('未知狀態');
        }
    }

    clearCloudSetup() {
        if (confirm('確定要清除雲端同步設定嗎？')) {
            this.cloudSync.clearSetup();
            this.updateSyncStatus('未設定');
            alert('✅ 雲端同步設定已清除');
        }
    }

    updateSyncStatus(status) {
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            statusElement.textContent = status;
            
            // 更新樣式
            statusElement.className = 'sync-indicator';
            if (status.includes('已同步')) {
                statusElement.classList.add('synced');
            } else if (status.includes('失敗') || status.includes('錯誤')) {
                statusElement.classList.add('error');
            } else if (status.includes('中...')) {
                statusElement.classList.add('loading');
            }
        }
    }

    saveData() {
        const data = {
            stocks: this.stocks,
            accounts: this.accounts,
            lastTotalValue: this.lastTotalValue,
            lastSync: new Date().toISOString()
        };
        
        try {
            // 儲存到本地
            localStorage.setItem('stockPortfolio', JSON.stringify(data));
            console.log('✅ 資料已儲存到本地', {
                stocks: this.stocks.length,
                accounts: this.accounts.length,
                accountNames: this.accounts
            });
            
            // 自動同步到雲端 (如果已設定)
            if (this.cloudSync && this.cloudSync.isSetup() && this.cloudSync.syncEnabled) {
                this.cloudSync.uploadData(data).then(success => {
                    if (success) {
                        this.updateSyncStatus('已同步');
                    }
                }).catch(error => {
                    console.warn('自動同步失敗:', error);
                });
            }
        } catch (error) {
            console.error('❌ 儲存資料失敗:', error);
            alert('儲存資料失敗，請檢查瀏覽器儲存空間');
        }
    }

    loadData() {
        const saved = localStorage.getItem('stockPortfolio');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.stocks = data.stocks || [];
                this.accounts = data.accounts || ['帳戶1', '帳戶2'];
                this.lastTotalValue = data.lastTotalValue || 0;
                console.log('✅ 已載入儲存的資料');
            } catch (error) {
                console.error('載入資料失敗:', error);
                this.init(); // 如果載入失敗，初始化預設資料
            }
        } else {
            // 沒有儲存資料，初始化預設資料
            this.init();
        }
        
        this.updateAccountTabs();
        this.renderStocks();
        
        // 載入後立即更新一次股價
        setTimeout(() => {
            this.refreshStockPrices();
        }, 1000);
    }
}

// 初始化應用程式
let portfolio;
document.addEventListener('DOMContentLoaded', () => {
    portfolio = new StockPortfolio();
});