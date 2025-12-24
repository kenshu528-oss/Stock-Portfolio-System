/**
 * 存股紀錄系統 - 雲端同步模組
 * Stock Portfolio System - Cloud Sync Module
 * 
 * 版權所有 (c) 2025 [你的姓名]
 * Copyright (c) 2025 [Your Name]
 * 
 * 採用 MIT 授權條款
 * Licensed under MIT License
 */

// 雲端同步模組 - 使用 GitHub Gist 作為免費雲端儲存
class CloudSync {
    constructor() {
        this.githubToken = localStorage.getItem('github_token');
        this.gistId = localStorage.getItem('gist_id');
        this.syncEnabled = false;
    }

    // 設定 GitHub Token 和 Gist
    async setupCloudSync() {
        const instructions = `
設定雲端同步功能:

1. 前往 GitHub.com → Settings → Developer settings → Personal access tokens
2. 點擊 "Generate new token (classic)"
3. 勾選 "gist" 權限
4. 複製產生的 token

這樣就能在不同裝置間同步你的股票資料！
        `;

        alert(instructions);

        const token = prompt('請貼上你的 GitHub Personal Access Token:');
        if (!token) return false;

        try {
            // 測試 token 是否有效
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('Token 無效');
            }

            const user = await response.json();
            
            // 儲存 token
            this.githubToken = token;
            localStorage.setItem('github_token', token);

            // 建立或找到 Gist
            await this.createOrFindGist();

            alert(`✅ 雲端同步設定成功！\n歡迎 ${user.login}！\n\n現在你的資料會自動同步到雲端。`);
            
            this.syncEnabled = true;
            return true;

        } catch (error) {
            alert(`❌ 設定失敗: ${error.message}`);
            return false;
        }
    }

    async createOrFindGist() {
        try {
            // 先嘗試找現有的 Gist
            const gists = await this.fetchGists();
            let targetGist = gists.find(gist => 
                gist.description === 'Stock Portfolio Data - 存股紀錄系統'
            );

            if (!targetGist) {
                // 建立新的 Gist
                targetGist = await this.createGist();
            }

            this.gistId = targetGist.id;
            localStorage.setItem('gist_id', targetGist.id);
            
            return targetGist;

        } catch (error) {
            console.error('Gist 操作失敗:', error);
            throw error;
        }
    }

    async fetchGists() {
        const response = await fetch('https://api.github.com/gists', {
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('無法獲取 Gist 列表');
        }

        return await response.json();
    }

    async createGist() {
        const initialData = {
            stocks: [],
            accounts: ['國泰Ken', '國泰Mom'],
            lastTotalValue: 0,
            lastSync: new Date().toISOString()
        };

        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: 'Stock Portfolio Data - 存股紀錄系統',
                public: false,
                files: {
                    'portfolio-data.json': {
                        content: JSON.stringify(initialData, null, 2)
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error('無法建立 Gist');
        }

        return await response.json();
    }

    // 上傳資料到雲端
    async uploadData(data) {
        if (!this.syncEnabled || !this.githubToken || !this.gistId) {
            return false;
        }

        try {
            const syncData = {
                ...data,
                lastSync: new Date().toISOString(),
                device: this.getDeviceInfo()
            };

            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'portfolio-data.json': {
                            content: JSON.stringify(syncData, null, 2)
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error('上傳失敗');
            }

            console.log('✅ 資料已同步到雲端');
            return true;

        } catch (error) {
            console.error('❌ 雲端同步失敗:', error);
            return false;
        }
    }

    // 從雲端下載資料
    async downloadData() {
        if (!this.syncEnabled || !this.githubToken || !this.gistId) {
            return null;
        }

        try {
            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('下載失敗');
            }

            const gist = await response.json();
            const fileContent = gist.files['portfolio-data.json'].content;
            const data = JSON.parse(fileContent);

            console.log('✅ 已從雲端載入資料');
            return data;

        } catch (error) {
            console.error('❌ 雲端載入失敗:', error);
            return null;
        }
    }

    // 檢查是否已設定雲端同步
    isSetup() {
        return !!(this.githubToken && this.gistId);
    }

    // 啟用同步
    enable() {
        if (this.isSetup()) {
            this.syncEnabled = true;
            return true;
        }
        return false;
    }

    // 停用同步
    disable() {
        this.syncEnabled = false;
    }

    // 清除設定
    clearSetup() {
        localStorage.removeItem('github_token');
        localStorage.removeItem('gist_id');
        this.githubToken = null;
        this.gistId = null;
        this.syncEnabled = false;
    }

    // 獲取裝置資訊
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString()
        };
    }

    // 同步狀態檢查
    async checkSyncStatus() {
        if (!this.isSetup()) {
            return { status: 'not_setup', message: '未設定雲端同步' };
        }

        try {
            const cloudData = await this.downloadData();
            if (!cloudData) {
                return { status: 'error', message: '無法連接雲端' };
            }

            const localData = JSON.parse(localStorage.getItem('stockPortfolio') || '{}');
            const cloudTime = new Date(cloudData.lastSync || 0);
            const localTime = new Date(localData.lastSync || 0);

            if (cloudTime > localTime) {
                return { 
                    status: 'cloud_newer', 
                    message: '雲端資料較新',
                    cloudTime: cloudTime.toLocaleString('zh-TW'),
                    localTime: localTime.toLocaleString('zh-TW')
                };
            } else if (localTime > cloudTime) {
                return { 
                    status: 'local_newer', 
                    message: '本地資料較新',
                    cloudTime: cloudTime.toLocaleString('zh-TW'),
                    localTime: localTime.toLocaleString('zh-TW')
                };
            } else {
                return { status: 'synced', message: '資料已同步' };
            }

        } catch (error) {
            return { status: 'error', message: `同步檢查失敗: ${error.message}` };
        }
    }
}

// 匯出給主程式使用
window.CloudSync = CloudSync;