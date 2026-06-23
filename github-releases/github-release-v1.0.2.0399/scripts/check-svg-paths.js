#!/usr/bin/env node
/**
 * SVG Path 格式檢查腳本
 * 檢查所有 TSX 檔案中的 SVG path 是否符合標準（必須以 M 或 m 開頭）
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

// 遞迴搜尋所有 TSX 檔案
function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳過 node_modules 和 dist
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'github-releases') {
        findTsxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 檢查 SVG path 格式
function checkSvgPaths(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const errors = [];
  
  // 正則表達式：匹配 d="..." 但不以 M 或 m 開頭的 path
  // 排除 data-testid 等非 SVG 屬性
  const pathRegex = /\bd="([^"]+)"/g;
  
  lines.forEach((line, index) => {
    // 跳過包含 data-testid 的行（測試文件）
    if (line.includes('data-testid') || line.includes('currentAccountId')) {
      return;
    }
    
    // 只檢查包含 <path 或 <svg 的行
    if (!line.includes('<path') && !line.includes('strokeLinecap')) {
      return;
    }
    
    let match;
    while ((match = pathRegex.exec(line)) !== null) {
      const pathData = match[1].trim();
      
      // 檢查是否以 M 或 m 開頭
      if (pathData && !pathData.startsWith('M') && !pathData.startsWith('m')) {
        errors.push({
          line: index + 1,
          path: pathData,
          fullLine: line.trim()
        });
      }
    }
  });
  
  return errors;
}

// 主函數
function main() {
  console.log(`${colors.blue}🔍 開始檢查 SVG path 格式...${colors.reset}\n`);
  
  const srcDir = path.join(path.dirname(__dirname), 'src');
  const tsxFiles = findTsxFiles(srcDir);
  
  console.log(`找到 ${tsxFiles.length} 個檔案\n`);
  
  let totalErrors = 0;
  const filesWithErrors = [];
  
  tsxFiles.forEach(file => {
    const errors = checkSvgPaths(file);
    
    if (errors.length > 0) {
      totalErrors += errors.length;
      filesWithErrors.push({ file, errors });
    }
  });
  
  // 輸出結果
  if (totalErrors === 0) {
    console.log(`${colors.green}✅ 所有 SVG path 格式正確！${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}❌ 發現 ${totalErrors} 個 SVG path 格式錯誤：${colors.reset}\n`);
    
    filesWithErrors.forEach(({ file, errors }) => {
      console.log(`${colors.yellow}檔案: ${file}${colors.reset}`);
      errors.forEach(error => {
        console.log(`  第 ${error.line} 行: ${colors.red}${error.path}${colors.reset}`);
        console.log(`  ${error.fullLine}`);
        console.log(`  ${colors.blue}建議修復: d="M${error.path}"${colors.reset}\n`);
      });
    });
    
    process.exit(1);
  }
}

main();
