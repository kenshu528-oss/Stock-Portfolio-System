@echo off
chcp 65001 >nul
echo ========================================
echo KIRO Project Shared Standards Setup
echo ========================================
echo.

REM Check if target project path is provided
if "%1"=="" (
    echo Usage: setup-shared-standards.bat [target-project-path]
    echo Example: setup-shared-standards.bat C:\Projects\MyKiroProject
    echo.
    pause
    exit /b 1
)

set TARGET_PROJECT=%1

REM Check if target project exists
if not exist "%TARGET_PROJECT%" (
    echo Error: Target project path does not exist: %TARGET_PROJECT%
    pause
    exit /b 1
)

echo Target project: %TARGET_PROJECT%
echo.

REM Create .kiro/steering directory
echo Creating STEERING directory...
if not exist "%TARGET_PROJECT%\.kiro" mkdir "%TARGET_PROJECT%\.kiro"
if not exist "%TARGET_PROJECT%\.kiro\steering" mkdir "%TARGET_PROJECT%\.kiro\steering"

REM Copy universal standards files
echo Copying universal standards files...

REM Copy universal STEERING rules
copy "UNIVERSAL_CLOUD_SYNC_STANDARDS.md" "%TARGET_PROJECT%\.kiro\steering\cloud-sync-development.md" >nul
if %errorlevel% equ 0 echo [OK] Cloud sync development standards

copy ".kiro\steering\safe-development.md" "%TARGET_PROJECT%\.kiro\steering\safe-development.md" >nul
if %errorlevel% equ 0 echo [OK] Safe development rules

copy ".kiro\steering\api-data-integrity.md" "%TARGET_PROJECT%\.kiro\steering\api-data-integrity.md" >nul
if %errorlevel% equ 0 echo [OK] API data integrity rules

copy ".kiro\steering\backup-recovery.md" "%TARGET_PROJECT%\.kiro\steering\backup-recovery.md" >nul
if %errorlevel% equ 0 echo [OK] Backup and recovery mechanisms

REM Copy reference documentation
echo.
echo Copying reference documentation...
copy "CLOUD_SYNC_TROUBLESHOOTING_GUIDE.md" "%TARGET_PROJECT%\CLOUD_SYNC_TROUBLESHOOTING_GUIDE.md" >nul
if %errorlevel% equ 0 echo [OK] Cloud sync troubleshooting guide

copy "SHARING_GUIDE.md" "%TARGET_PROJECT%\SHARING_GUIDE.md" >nul
if %errorlevel% equ 0 echo [OK] Sharing guide

REM Create project-specific configuration template
echo.
echo Creating project-specific configuration template...

REM Create README documentation
echo # KIRO Shared Standards Documentation > "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo. >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo This project has applied KIRO shared development standards, including: >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo. >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo ## STEERING Rules >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo - `cloud-sync-development.md` - Cloud sync development standards >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo - `safe-development.md` - Safe development rules >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo - `api-data-integrity.md` - API data integrity rules >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo - `backup-recovery.md` - Backup and recovery mechanisms >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo. >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo ## Reference Documentation >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo - `CLOUD_SYNC_TROUBLESHOOTING_GUIDE.md` - Troubleshooting guide >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo - `SHARING_GUIDE.md` - Standards sharing guide >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo. >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo ## Usage Recommendations >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo 1. Read each STEERING rule to understand development standards >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo 2. Refer to troubleshooting guide when developing cloud sync features >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo 3. Adjust rule content based on project requirements >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"
echo 4. Continuously update and improve standards >> "%TARGET_PROJECT%\KIRO_STANDARDS_README.md"

echo [OK] Project documentation

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Successfully applied KIRO shared standards to target project:
echo %TARGET_PROJECT%
echo.
echo Next steps:
echo 1. Check rule files in .kiro/steering/ directory
echo 2. Read KIRO_STANDARDS_README.md for usage instructions
echo 3. Adjust rule content based on project requirements
echo 4. Test if rules work properly in KIRO
echo.
pause