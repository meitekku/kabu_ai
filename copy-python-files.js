#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// standalone build ディレクトリに Python ファイルをコピー
const sourceDir = path.join(__dirname, 'python');
const targetDir = path.join(__dirname, '.next', 'standalone', 'python');

if (fs.existsSync(sourceDir)) {
  console.log('Copying Python files to standalone build...');
  copyRecursiveSync(sourceDir, targetDir);
  console.log('Python files copied successfully!');
} else {
  console.log('Python directory not found, skipping copy.');
}