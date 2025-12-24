/**
 * 存股紀錄系統 - 主程式
 * Stock Portfolio System - Main Application
 * 
 * 版權所有 (c) 2025 徐國洲
 * Copyright (c) 2025 Xu Guo Zhou
 * 
 * 採用 MIT 授權條款
 * Licensed under MIT License
 * 
 * 作者：徐國洲
 * 版本：v1.2.0.1
 * 建立日期：2025-12-24
 * 
 * 功能：
 * - 多帳戶股票管理
 * - 即時股價更新
 * - 雲端同步
 * - 損益計算
 */

class StockPortfolio {
    constructor() {
        this.stocks = [];
        this.accounts = ['國泰Ken', '國泰Mom'];
        this.currentFilter = 'all';
        this.lastTotalValue = 0;
        this.stockAPI = new StockAPI(); // 使用新的 API 模組
        this.cloudSync = new CloudSync(); // 雲端同步模組
        this.versionManager = new VersionManager(); // 版本管理模組
        
        this.loadData(); // 先載入資料
        this.setupEventListeners();
        this.setupCloudSync();
        this.updateVersionDisplay();
    }

    init() {
        // 只在沒有儲存資料時初始化範例資料
        const saved = localStorage.getItem('stockPortfolio');
        if (!saved) {
            console.log('首次使用，初始化範例資料');
            this.stocks = [
                {
                    id: 1,
                    code: '0050',
                    name: '元大台灣50',
                    account: '國泰Ken',
                    shares: 1000,
                    costPrice: 120.5,
                    currentPrice: 0,
                    lastUpdate: null
                },
                {
                    id: 2,
                    code: '00631L',
                    name: '元大台灣50正2',
                    account: '國泰Mom',
                    shares: 500,
                    costPrice: 25.8,
                    currentPrice: 0,
                    lastUpdate: null
                },
                {
                    id: 3,
                    code: '2330',
                    name: '台積電',
                    account: '國泰Ken',
                    shares: 100,
                    costPrice: 580.0,
                    currentPrice: 0,
                    lastUpdate: null
                }
            ];
            
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
        document.querySelectorAll('.close, #cancelAdd, #cancelAddAccount, #cancelManageAccount').forEach(btn => {
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
                    <button class="btn-small btn-delete" onclick="portfolio.deleteAccount('${account}')" 
                            ${this.accounts.length <= 1 ? 'disabled title="至少需要保留一個帳戶"' : ''}>
                        刪除
                    </button>
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
        if (this.accounts.length <= 1) {
            alert('至少需要保留一個帳戶');
            return;
        }
        
        const stocksInAccount = this.stocks.filter(stock => stock.account === accountName);
        
        let confirmMessage = `確定要刪除帳戶 "${accountName}" 嗎？`;
        
        if (stocksInAccount.length > 0) {
            confirmMessage += `\n\n⚠️ 此帳戶有 ${stocksInAccount.length} 支股票，刪除帳戶後這些股票也會被刪除：\n`;
            stocksInAccount.forEach(stock => {
                confirmMessage += `• ${stock.code} ${stock.name}\n`;
            });
            confirmMessage += '\n此操作無法復原！';
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // 刪除帳戶
        this.accounts = this.accounts.filter(account => account !== accountName);
        
        // 刪除該帳戶的所有股票
        this.stocks = this.stocks.filter(stock => stock.account !== accountName);
        
        // 如果當前篩選的是被刪除的帳戶，切換到 "全部"
        if (this.currentFilter === accountName) {
            this.currentFilter = 'all';
        }
        
        this.saveData();
        this.updateAccountTabs();
        this.renderStocks();
        this.renderAccountList();
        
        console.log(`✅ 帳戶已刪除: ${accountName}`);
        alert(`✅ 帳戶 "${accountName}" 已刪除`);
    }

    resetAllData() {
        const confirm1 = confirm('⚠️ 警告：這將清除所有資料！\n\n包括：\n• 所有股票紀錄\n• 所有帳戶設定\n• 雲端同步設定\n\n此操作無法復原！\n\n確定要繼續嗎？');
        
        if (!confirm1) return;
        
        const confirm2 = confirm('🚨 最後確認：\n\n真的要刪除所有資料嗎？\n\n請輸入 "DELETE" 來確認');
        
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
            
            // 重置物件狀態
            this.stocks = [];
            this.accounts = ['國泰Ken', '國泰Mom'];
            this.currentFilter = 'all';
            this.lastTotalValue = 0;
            
            // 重置雲端同步
            this.cloudSync.clearSetup();
            this.updateSyncStatus('未設定');
            
            // 重新初始化
            this.init();
            this.updateAccountTabs();
            this.renderStocks();
            
            // 隱藏重置按鈕
            document.getElementById('resetBtn').style.display = 'none';
            
            alert('✅ 所有資料已清除，系統已重置為初始狀態');
            
        } catch (error) {
            console.error('重置失敗:', error);
            alert('❌ 重置失敗: ' + error.message);
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

🏷️ 授權條款：MIT License
✅ 允許商業使用
✅ 允許修改和分發
✅ 允許私人使用
✅ 允許專利使用

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

    closeModals() {
        document.getElementById('addStockModal').style.display = 'none';
        document.getElementById('addAccountModal').style.display = 'none';
        document.getElementById('manageAccountModal').style.display = 'none';
        
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
            costPrice: parseFloat(document.getElementById('costPrice').value)
        };

        // 驗證資料
        if (!formData.code || !formData.shares || !formData.costPrice) {
            alert('請填寫股票代碼、持股數和成本價');
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

        // 檢查股票代碼是否已存在於同一帳戶
        const exists = this.stocks.some(stock => 
            stock.code === formData.code && stock.account === formData.account
        );

        if (exists) {
            alert('此帳戶已有相同股票代碼的紀錄');
            return;
        }

        // 新增股票
        const newStock = {
            id: Date.now(),
            ...formData,
            currentPrice: formData.costPrice, // 初始使用成本價
            lastUpdate: null,
            error: null
        };

        this.stocks.push(newStock);
        this.saveData();
        this.renderStocks();
        this.closeModals();
        
        // 立即更新新股票的價格
        this.updateStockPrice(newStock);
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
    }

    createStockRow(stock) {
        const row = document.createElement('tr');
        
        const marketValue = stock.shares * stock.currentPrice;
        const totalCost = stock.shares * stock.costPrice;
        const profit = marketValue - totalCost;
        const profitRate = totalCost > 0 ? (profit / totalCost * 100) : 0;
        
        const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
        const profitSign = profit >= 0 ? '+' : '';

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
            <td class="editable-cell" onclick="portfolio.editShares(${stock.id})" title="點擊編輯股數">
                <span class="editable-value">${stock.shares.toLocaleString()}</span>
                <span class="edit-icon">✏️</span>
            </td>
            <td class="editable-cell" onclick="portfolio.editCostPrice(${stock.id})" title="點擊編輯成本價">
                <span class="editable-value">$${stock.costPrice.toFixed(2)}</span>
                <span class="edit-icon">✏️</span>
            </td>
            <td>${priceDisplay}<br><small class="update-time">${updateTime}</small></td>
            <td>$${marketValue.toLocaleString()}</td>
            <td class="${profitClass}">${profitSign}$${profit.toLocaleString()}</td>
            <td class="${profitClass}">${profitSign}${profitRate.toFixed(2)}%</td>
            <td>
                <button class="refresh-btn" onclick="portfolio.refreshSingleStock(${stock.id})" title="更新股價">🔄</button>
                <button class="delete-btn" onclick="portfolio.deleteStock(${stock.id})">刪除</button>
            </td>
        `;

        return row;
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
            return sum + (stock.shares * stock.costPrice);
        }, 0);

        const dailyChange = totalValue - this.lastTotalValue;
        const dailyChangeRate = this.lastTotalValue > 0 ? (dailyChange / this.lastTotalValue * 100) : 0;

        document.getElementById('totalValue').textContent = `$${totalValue.toLocaleString()}`;
        
        const dailyChangeElement = document.getElementById('dailyChange');
        const changeSign = dailyChange >= 0 ? '+' : '';
        const changeClass = dailyChange >= 0 ? 'positive' : 'negative';
        
        dailyChangeElement.textContent = `${changeSign}$${dailyChange.toLocaleString()} (${changeSign}${dailyChangeRate.toFixed(2)}%)`;
        dailyChangeElement.className = `daily-change ${changeClass}`;
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
                this.accounts = cloudData.accounts || ['國泰Ken', '國泰Mom'];
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
                this.accounts = data.accounts || ['國泰Ken', '國泰Mom'];
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