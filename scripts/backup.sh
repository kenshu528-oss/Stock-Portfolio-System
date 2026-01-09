#!/bin/bash
# 自動備份腳本 - Stock Portfolio System

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 檢查是否在專案根目錄
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    log_error "請在專案根目錄執行此腳本"
    exit 1
fi

# 讀取當前版本號
if [ ! -f "src/constants/version.ts" ]; then
    log_error "找不到版本檔案: src/constants/version.ts"
    exit 1
fi

PATCH_VERSION=$(grep "PATCH:" src/constants/version.ts | grep -o '[0-9]\+')
if [ -z "$PATCH_VERSION" ]; then
    log_error "無法讀取版本號"
    exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
VERSION_STRING="1.0.0.$(printf "%04d" $PATCH_VERSION)"
BACKUP_NAME="backup-v${VERSION_STRING}-${TIMESTAMP}"

log_info "開始建立備份: $BACKUP_NAME"

# 檢查 Git 狀態
if [ -d ".git" ]; then
    # 檢查是否有未提交的變更
    if ! git diff-index --quiet HEAD --; then
        log_warn "發現未提交的變更，將包含在備份中"
    fi
    
    # 建立 Git 備份
    log_info "建立 Git 備份點..."
    git add .
    git commit -m "Auto backup: $BACKUP_NAME" || log_warn "Git commit 失敗，可能沒有變更"
    git tag "$BACKUP_NAME"
    log_info "Git 備份完成: 標籤 $BACKUP_NAME"
else
    log_warn "未找到 Git 倉庫，跳過 Git 備份"
fi

# 建立檔案系統備份
log_info "建立檔案系統備份..."
BACKUP_DIR="../backups"
FULL_BACKUP_PATH="$BACKUP_DIR/stock-portfolio-$BACKUP_NAME"

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

# 複製專案檔案（排除 node_modules 和其他不必要的檔案）
log_info "複製專案檔案到: $FULL_BACKUP_PATH"
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='dist' \
          --exclude='.vscode' \
          --exclude='*.log' \
          . "$FULL_BACKUP_PATH/"

# 建立備份資訊檔案
cat > "$FULL_BACKUP_PATH/.backup-info" << EOF
備份資訊
========
版本: v$VERSION_STRING
建立時間: $(date)
備份名稱: $BACKUP_NAME
原始路徑: $(pwd)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
EOF

log_info "檔案系統備份完成"

# 驗證備份
log_info "驗證備份完整性..."
if [ -f "$FULL_BACKUP_PATH/package.json" ] && [ -d "$FULL_BACKUP_PATH/src" ]; then
    log_info "備份驗證成功"
else
    log_error "備份驗證失敗"
    exit 1
fi

# 清理舊備份（保留最近 10 個）
log_info "清理舊備份..."
cd "$BACKUP_DIR"
ls -dt stock-portfolio-backup-* 2>/dev/null | tail -n +11 | xargs rm -rf 2>/dev/null || true
cd - > /dev/null

# 顯示備份資訊
log_info "備份完成！"
echo "備份名稱: $BACKUP_NAME"
echo "備份位置: $FULL_BACKUP_PATH"
echo "Git 標籤: $BACKUP_NAME"
echo ""
echo "復原指令:"
echo "  Git 復原: git reset --hard $BACKUP_NAME"
echo "  檔案復原: cp -r $FULL_BACKUP_PATH/* ."