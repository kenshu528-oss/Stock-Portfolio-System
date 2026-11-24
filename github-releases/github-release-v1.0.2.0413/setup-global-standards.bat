@echo off
chcp 65001 >nul
echo ========================================
echo KIRO Global Standards Setup Script
echo ========================================
echo.

echo This script will setup global KIRO STEERING rules.
echo These rules will be automatically applied to all KIRO projects.
echo.

REM Check user confirmation
set /p confirm="Continue with global setup? (y/N): "
if /i not "%confirm%"=="y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Setting up global STEERING rules...

REM Create user-level KIRO settings directory
set KIRO_USER_DIR=%USERPROFILE%\.kiro\settings\steering

if not exist "%USERPROFILE%\.kiro" mkdir "%USERPROFILE%\.kiro"
if not exist "%USERPROFILE%\.kiro\settings" mkdir "%USERPROFILE%\.kiro\settings"
if not exist "%KIRO_USER_DIR%" mkdir "%KIRO_USER_DIR%"

echo [OK] Created user settings directory: %KIRO_USER_DIR%

REM Copy universal standards to global location
echo.
echo Copying universal standards...

copy "UNIVERSAL_CLOUD_SYNC_STANDARDS.md" "%KIRO_USER_DIR%\cloud-sync-development.md" >nul
if %errorlevel% equ 0 echo [OK] Cloud sync development standards (global)

copy ".kiro\steering\safe-development.md" "%KIRO_USER_DIR%\safe-development.md" >nul
if %errorlevel% equ 0 echo [OK] Safe development rules (global)

copy ".kiro\steering\api-data-integrity.md" "%KIRO_USER_DIR%\api-data-integrity.md" >nul
if %errorlevel% equ 0 echo [OK] API data integrity rules (global)

REM Create global standards documentation
echo.
echo Creating global standards documentation...

echo # KIRO Global Development Standards > "%USERPROFILE%\.kiro\settings\README.md"
echo. >> "%USERPROFILE%\.kiro\settings\README.md"
echo This directory contains global development standards for all KIRO projects. >> "%USERPROFILE%\.kiro\settings\README.md"
echo. >> "%USERPROFILE%\.kiro\settings\README.md"
echo ## Directory Structure >> "%USERPROFILE%\.kiro\settings\README.md"
echo ``` >> "%USERPROFILE%\.kiro\settings\README.md"
echo ~/.kiro/settings/ >> "%USERPROFILE%\.kiro\settings\README.md"
echo ├── steering/                    # Global STEERING rules >> "%USERPROFILE%\.kiro\settings\README.md"
echo │   ├── cloud-sync-development.md >> "%USERPROFILE%\.kiro\settings\README.md"
echo │   ├── safe-development.md >> "%USERPROFILE%\.kiro\settings\README.md"
echo │   └── api-data-integrity.md >> "%USERPROFILE%\.kiro\settings\README.md"
echo └── README.md                    # This documentation >> "%USERPROFILE%\.kiro\settings\README.md"
echo ``` >> "%USERPROFILE%\.kiro\settings\README.md"
echo. >> "%USERPROFILE%\.kiro\settings\README.md"
echo ## Rule Priority >> "%USERPROFILE%\.kiro\settings\README.md"
echo KIRO applies rules in the following priority: >> "%USERPROFILE%\.kiro\settings\README.md"
echo 1. Project-level rules (.kiro/steering/) - Highest priority >> "%USERPROFILE%\.kiro\settings\README.md"
echo 2. Global rules (~/.kiro/settings/steering/) - Secondary priority >> "%USERPROFILE%\.kiro\settings\README.md"
echo. >> "%USERPROFILE%\.kiro\settings\README.md"
echo ## Maintenance >> "%USERPROFILE%\.kiro\settings\README.md"
echo - Regularly review and update rule content >> "%USERPROFILE%\.kiro\settings\README.md"
echo - Improve standards based on actual usage experience >> "%USERPROFILE%\.kiro\settings\README.md"
echo - Test rule applicability in new projects >> "%USERPROFILE%\.kiro\settings\README.md"
echo. >> "%USERPROFILE%\.kiro\settings\README.md"
echo **Setup time**: %date% %time% >> "%USERPROFILE%\.kiro\settings\README.md"

echo [OK] Global standards documentation

echo.
echo ========================================
echo Global Setup Complete!
echo ========================================
echo.
echo Global KIRO standards have been set up at:
echo %KIRO_USER_DIR%
echo.
echo These rules will now be automatically applied to all KIRO projects.
echo.
echo Next steps:
echo 1. Test the rules in a new KIRO project
echo 2. Adjust rule content based on project needs
echo 3. Regularly update and maintain global standards
echo.
echo To remove global standards, delete the directory:
echo %USERPROFILE%\.kiro\settings\
echo.
pause