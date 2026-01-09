#!/bin/bash
# 系統驗證腳本 - Stock Portfolio System

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：輸出彩色訊息
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 全域變數
ERRORS=0
WARNINGS=0

# 記錄錯誤
record_error() {
    ERRORS=$((ERRORS + 1))
    log_error "$1"
}

# 記錄警告
record_warning() {
    WARNINGS=$((WARNINGS + 1))
    log_warn "$1"
}

# 檢查檔案存在
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        log_success "✓ $description: $file"
        return 0
    else
        record_error "✗ $description 不存在: $file"
        return 1
    fi
}

# 檢查目錄存在
check_directory() {
    local dir=$1
    local description=$2
    
    if [ -d "$dir" ]; then
        log_success "✓ $description: $dir"
        return 0
    else
        record_error "✗ $description 不存在: $dir"
        return 1
    fi
}

# 檢查命令可用性
check_command() {
    local cmd=$1
    local description=$2
    
    if command -v "$cmd" >/dev/null 2>&1; then
        local version=$(eval "$cmd --version 2>/dev/null | head -1" || echo "版本未知")
        log_success "✓ $description: $cmd ($version)"
        return 0
    else
        record_error "✗ $description 不可用: $cmd"
        return 1
    fi
}

# 主要驗證函數
main() {
    log_info "Stock Portfolio System 系統驗證"
    log_info "================================"
    echo ""
    
    # 1. 檢查專案結構
    log_step "1. 檢查專案結構"
    check_file "package.json" "專案配置檔案"
    check_file "vite.config.ts" "Vite 配置檔案"
    check_file "tsconfig.json" "TypeScript 配置檔案"
    check_file "tailwind.config.js" "Tailwind 配置檔案"
    check_file "index.html" "HTML 入口檔案"
    
    check_directory "src" "原始碼目錄"
    check_directory "src/components" "元件目錄"
    check_directory "src/components/ui" "UI 元件目錄"
    check_directory ".kiro" "Kiro 配置目錄"
    check_directory ".kiro/specs" "規格目錄"
    check_directory ".kiro/steering" "Steering 目錄"
    echo ""
    
    # 2. 檢查關鍵檔案
    log_step "2. 檢查關鍵檔案"
    check_file "src/main.tsx" "應用程式入口"
    check_file "src/App.tsx" "主要元件"
    check_file "src/constants/version.ts" "版本管理檔案"
    check_file "src/components/Header.tsx" "Header 元件"
    check_file "src/components/Sidebar.tsx" "Sidebar 元件"
    check_file "src/components/ui/Button.tsx" "Button 元件"
    check_file "src/components/ui/Input.tsx" "Input 元件"
    check_file "src/components/ui/Modal.tsx" "Modal 元件"
    echo ""
    
    # 3. 檢查版本資訊
    log_step "3. 檢查版本資訊"
    if [ -f "src/constants/version.ts" ]; then
        local major=$(grep "MAJOR:" src/constants/version.ts | grep -o '[0-9]\+' || echo "0")
        local minor=$(grep "MINOR:" src/constants/version.ts | grep -o '[0-9]\+' || echo "0")
        local release=$(grep "RELEASE:" src/constants/version.ts | grep -o '[0-9]\+' || echo "0")
        local patch=$(grep "PATCH:" src/constants/version.ts | grep -o '[0-9]\+' || echo "0")
        
        if [ "$major" != "0" ] || [ "$minor" != "0" ] || [ "$release" != "0" ] || [ "$patch" != "0" ]; then
            log_success "✓ 版本號: v$major.$minor.$release.$(printf "%04d" $patch)"
        else
            record_error "✗ 版本號格式錯誤"
        fi
    else
        record_error "✗ 版本檔案不存在"
    fi
    echo ""
    
    # 4. 檢查開發工具
    log_step "4. 檢查開發工具"
    check_command "node" "Node.js"
    check_command "npm" "NPM"
    check_command "git" "Git"
    echo ""
    
    # 5. 檢查相依套件
    log_step "5. 檢查相依套件"
    if [ -f "package.json" ] && [ -d "node_modules" ]; then
        log_success "✓ node_modules 目錄存在"
        
        # 檢查關鍵套件
        local packages=("react" "typescript" "vite" "tailwindcss" "vitest")
        for pkg in "${packages[@]}"; do
            if [ -d "node_modules/$pkg" ]; then
                log_success "✓ 套件已安裝: $pkg"
            else
                record_warning "⚠ 套件可能未安裝: $pkg"
            fi
        done
    else
        record_warning "⚠ node_modules 不存在，請執行 npm install"
    fi
    echo ""
    
    # 6. 語法檢查
    log_step "6. 語法檢查"
    if command -v npx >/dev/null 2>&1; then
        if npx tsc --noEmit >/dev/null 2>&1; then
            log_success "✓ TypeScript 語法檢查通過"
        else
            record_error "✗ TypeScript 語法檢查失敗"
        fi
    else
        record_warning "⚠ 無法執行 TypeScript 語法檢查"
    fi
    echo ""
    
    # 7. 建置測試
    log_step "7. 建置測試"
    if [ -f "package.json" ]; then
        if npm run build >/dev/null 2>&1; then
            log_success "✓ 建置測試通過"
            if [ -d "dist" ]; then
                log_success "✓ 建置輸出目錄存在"
            else
                record_warning "⚠ 建置輸出目錄不存在"
            fi
        else
            record_error "✗ 建置測試失敗"
        fi
    else
        record_error "✗ 無法執行建置測試"
    fi
    echo ""
    
    # 8. 測試執行
    log_step "8. 測試執行"
    if [ -f "package.json" ]; then
        if npm test >/dev/null 2>&1; then
            log_success "✓ 單元測試通過"
        else
            record_warning "⚠ 單元測試失敗或無測試"
        fi
    else
        record_error "✗ 無法執行測試"
    fi
    echo ""
    
    # 9. 備份系統檢查
    log_step "9. 備份系統檢查"
    check_file "scripts/backup.sh" "備份腳本"
    check_file "scripts/restore.sh" "復原腳本"
    check_file ".kiro/steering/backup-recovery.md" "備份規範文件"
    
    if [ -d "../backups" ]; then
        local backup_count=$(ls -1 ../backups/ 2>/dev/null | wc -l)
        log_success "✓ 備份目錄存在，包含 $backup_count 個備份"
    else
        record_warning "⚠ 備份目錄不存在"
    fi
    
    if [ -d ".git" ]; then
        local tag_count=$(git tag | grep "backup-" | wc -l)
        log_success "✓ Git 倉庫存在，包含 $tag_count 個備份標籤"
    else
        record_warning "⚠ Git 倉庫不存在"
    fi
    echo ""
    
    # 10. 規格文件檢查
    log_step "10. 規格文件檢查"
    check_file ".kiro/specs/stock-portfolio-system/requirements.md" "需求文件"
    check_file ".kiro/specs/stock-portfolio-system/design.md" "設計文件"
    check_file ".kiro/specs/stock-portfolio-system/tasks.md" "任務文件"
    check_file ".kiro/steering/versioning.md" "版本管理規範"
    check_file ".kiro/steering/ui-guidelines.md" "UI 設計指南"
    echo ""
    
    # 總結
    log_info "驗證完成"
    log_info "========"
    
    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        log_success "🎉 系統狀態良好，所有檢查都通過！"
        exit 0
    elif [ $ERRORS -eq 0 ]; then
        log_warn "⚠️  系統基本正常，但有 $WARNINGS 個警告需要注意"
        exit 0
    else
        log_error "❌ 發現 $ERRORS 個錯誤和 $WARNINGS 個警告"
        echo ""
        log_info "建議執行以下步驟修復問題："
        echo "  1. npm install          # 安裝相依套件"
        echo "  2. ./scripts/backup.sh  # 建立備份"
        echo "  3. npm run build        # 測試建置"
        echo "  4. npm test            # 執行測試"
        exit 1
    fi
}

# 檢查是否在專案根目錄
if [ ! -f "package.json" ]; then
    log_error "請在專案根目錄執行此腳本"
    exit 1
fi

# 執行主程式
main "$@"