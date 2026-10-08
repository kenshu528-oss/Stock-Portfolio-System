#!/usr/bin/env node
/**
 * 版本號一致性檢查腳本
 * 檢查 package.json、version.ts、changelog.ts 的版本號是否一致
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// 讀取 package.json 版本
function getPackageVersion() {
  const packagePath = path.join(path.dirname(__dirname), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  return packageJson.version;
}

// 讀取 version.ts 版本
function getVersionTsVersion() {
  const versionPath = path.join(path.dirname(__dirname), 'src/constants/version.ts');
  const content = fs.readFileSync(versionPath, 'utf-8');
  
  // 提取 MAJOR, MINOR, RELEASE, PATCH
  const majorMatch = content.match(/MAJOR:\s*(\d+)/);
  const minorMatch = content.match(/MINOR:\s*(\d+)/);
  const releaseMatch = content.match(/RELEASE:\s*(\d+)/);
  const patchMatch = content.match(/PATCH:\s*(\d+)/);
  
  if (!majorMatch || !minorMatch || !releaseMatch || !patchMatch) {
    throw new Error('無法從 version.ts 解析版本號');
  }
  
  const major = majorMatch[1];
  const minor = minorMatch[1];
  const release = releaseMatch[1];
  const patch = patchMatch[1].padStart(4, '0');
  
  return `${major}.${minor}.${release}.${patch}`;
}

// 讀取 changelog.ts 最新版本
function getChangelogVersion() {
  const changelogPath = path.join(path.dirname(__dirname), 'src/constants/changelog.ts');
  const content = fs.readFileSync(changelogPath, 'utf-8');
  
  // 提取第一個 version
  const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);
  
  if (!versionMatch) {
    throw new Error('無法從 changelog.ts 解析版本號');
  }
  
  return versionMatch[1];
}

// 主函數
function main() {
  console.log(`${colors.blue}🔍 檢查版本號一致性...${colors.reset}\n`);
  
  try {
    const packageVersion = getPackageVersion();
    const versionTsVersion = getVersionTsVersion();
    const changelogVersion = getChangelogVersion();
    
    console.log(`package.json:  ${colors.yellow}${packageVersion}${colors.reset}`);
    console.log(`version.ts:    ${colors.yellow}${versionTsVersion}${colors.reset}`);
    console.log(`changelog.ts:  ${colors.yellow}${changelogVersion}${colors.reset}\n`);
    
    // 檢查一致性
    if (packageVersion === versionTsVersion && versionTsVersion === changelogVersion) {
      console.log(`${colors.green}✅ 版本號一致！${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`${colors.red}❌ 版本號不一致！${colors.reset}\n`);
      
      if (packageVersion !== versionTsVersion) {
        console.log(`${colors.red}package.json 與 version.ts 不一致${colors.reset}`);
      }
      if (versionTsVersion !== changelogVersion) {
        console.log(`${colors.red}version.ts 與 changelog.ts 不一致${colors.reset}`);
      }
      if (packageVersion !== changelogVersion) {
        console.log(`${colors.red}package.json 與 changelog.ts 不一致${colors.reset}`);
      }
      
      console.log(`\n${colors.yellow}請確保以下文件的版本號一致：${colors.reset}`);
      console.log(`1. package.json: "version": "${packageVersion}"`);
      console.log(`2. src/constants/version.ts: PATCH: ${parseInt(packageVersion.split('.')[3])}`);
      console.log(`3. src/constants/changelog.ts: version: '${packageVersion}'`);
      
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}❌ 錯誤: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
