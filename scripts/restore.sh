#!/bin/bash
# 快速復原腳本 - Stock Portfolio System

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

log_question() {
    echo -e "${BLUE}[QUESTION]${NC} $1"
}

# 顯示使用說明
show_usage() {
    echo "Stock Portfolio System 復原工具"
    echo ""
    echo "使用方式:"
    echo "  $0 [選項] [備份標籤]"
    echo ""
    echo "選項:"
    echo "  -l, --list     列出可用的備份"
    echo "  -g, --git      使用 Git 復原"
    echo "  -f, --file     使用檔案系統復原"
    echo "  -h, --help     顯示此說明"
    echo ""
    echo "範例:"
    echo "  $0 -l                                    # 列出可用備份"
    echo "  $0 backup-v1.0.0.0005-20240108-143022   # 復原到指定備份"
    echo "  $0 -g backup-v1.0.0.0005-20240108-143022 # 使用 Git 復原"
}

# 列出可用備份
list_backups() {
    log_info "可用的 Git 備份標籤:"
    if [ -d ".git" ]; then
        git tag | grep "backup-" | tail -10 | while read tag; do
            commit_date=$(git log -1 --format="%ci" "$tag" 2>/dev/null || echo "未知時間")
            echo "  $tag ($commit_date)"
        done
    else
        log_warn "未找到 Git 倉庫"
    fi
    
    echo ""
    log_info "可用的檔案系統備份:"
    if [ -d "../backups" ]; then
        ls -dt ../backups/stock-portfolio-backup-* 2>/dev/null | head -10 | while read backup; do
            backup_name=$(basename "$backup")
            if [ -f "$backup/.backup-info" ]; then
                backup_time=$(grep "建立時間:" "$backup/.backup-info" | cut -d: -f2- | xargs)
                echo "  $backup_name ($backup_time)"
            else
                echo "  $backup_name"
            fi
        done
    else
        log_warn "未找到備份目錄"
    fi
}

# Git 復原
git_restore() {
    local backup_tag=$1
    
    if [ ! -d ".git" ]; then
        log_error "未找到 Git 倉庫"
        return 1
    fi
    
    # 檢查標籤是否存在
    if ! git tag | grep -q "^$backup_tag$"; then
        log_error "備份標籤 '$backup_tag' 不存在"
        return 1
    fi
    
    log_warn "這將會重置所有未提交的變更！"
    log_question "確定要繼續嗎？(y/N)"
    read -r confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_info "取消復原"
        return 0
    fi
    
    log_info "復原到 Git 標籤: $backup_tag"
    git reset --hard "$backup_tag"
    log_info "Git 復原完成"
}

# 檔案系統復原
file_restore() {
    local backup_name=$1
    local backup_path="../backups/stock-portfolio-$backup_name"
    
    if [ ! -d "$backup_path" ]; then
        log_error "備份目錄不存在: $backup_path"
        return 1
    fi
    
    log_warn "這將會覆蓋當前的所有檔案！"
    log_question "確定要繼續嗎？(y/N)"
    read -r confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        log_info "取消復原"
        return 0
    fi
    
    log_info "從檔案系統復原: $backup_path"
    
    # 備份當前狀態（以防萬一）
    current_backup="emergency-backup-$(date +%Y%m%d-%H%M%S)"
    log_info "建立緊急備份: $current_backup"
    mkdir -p "../backups"
    cp -r . "../backups/$current_backup/" 2>/dev/null || true
    
    # 復原檔案
    log_info "復原檔案..."
    rsync -av --exclude='.git' \
              --exclude='node_modules' \
              --exclude='dist' \
              "$backup_path/" ./
    
    log_info "檔案系統復原完成"
}

# 復原後驗證
verify_restore() {
    log_info "驗證復原結果..."
    
    # 檢查關鍵檔案
    if [ ! -f "package.json" ]; then
        log_error "package.json 不存在"
        return 1
    fi
    
    if [ ! -d "src" ]; then
        log_error "src 目錄不存在"
        return 1
    fi
    
    if [ ! -f "src/constants/version.ts" ]; then
        log_error "版本檔案不存在"
        return 1
    fi
    
    # 讀取版本號
    local version=$(grep "PATCH:" src/constants/version.ts | grep -o '[0-9]\+' || echo "未知")
    log_info "當前版本: v1.0.0.$(printf "%04d" $version)"
    
    log_info "基本驗證通過"
    
    # 建議後續步驟
    echo ""
    log_info "建議執行以下步驟完成復原:"
    echo "  1. npm install          # 重新安裝相依套件"
    echo "  2. npm test            # 執行測試"
    echo "  3. npm run build       # 驗證建置"
    echo "  4. npm run dev         # 啟動開發伺服器"
}

# 主程式
main() {
    local restore_method="auto"
    local backup_target=""
    
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--list)
                list_backups
                exit 0
                ;;
            -g|--git)
                restore_method="git"
                shift
                ;;
            -f|--file)
                restore_method="file"
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                log_error "未知選項: $1"
                show_usage
                exit 1
                ;;
            *)
                backup_target="$1"
                shift
                ;;
        esac
    done
    
    # 檢查是否在專案根目錄
    if [ ! -f "package.json" ]; then
        log_error "請在專案根目錄執行此腳本"
        exit 1
    fi
    
    # 如果沒有指定備份目標，顯示可用備份
    if [ -z "$backup_target" ]; then
        log_info "未指定備份目標，顯示可用備份:"
        echo ""
        list_backups
        echo ""
        log_question "請輸入要復原的備份名稱:"
        read -r backup_target
        
        if [ -z "$backup_target" ]; then
            log_info "取消復原"
            exit 0
        fi
    fi
    
    log_info "開始復原程序..."
    log_info "目標備份: $backup_target"
    log_info "復原方式: $restore_method"
    
    # 執行復原
    case $restore_method in
        "git")
            git_restore "$backup_target"
            ;;
        "file")
            file_restore "$backup_target"
            ;;
        "auto")
            # 自動選擇復原方式
            if [ -d ".git" ] && git tag | grep -q "^$backup_target$"; then
                log_info "使用 Git 復原"
                git_restore "$backup_target"
            elif [ -d "../backups/stock-portfolio-$backup_target" ]; then
                log_info "使用檔案系統復原"
                file_restore "$backup_target"
            else
                log_error "找不到備份: $backup_target"
                exit 1
            fi
            ;;
    esac
    
    # 驗證復原結果
    verify_restore
    
    log_info "復原完成！"
}

# 執行主程式
main "$@"