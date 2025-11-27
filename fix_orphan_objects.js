import fs from 'fs';

function fixOrphanObjects(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let fixed = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 檢查是否是孤立對象的開始（只有屬性名，沒有開始的對象字面量或函數調用）
    if (trimmed &&
        /^[a-zA-Z_\u4e00-\u9fa5][a-zA-Z0-9_\u4e00-\u9fa5]*:\s/.test(trimmed) &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*')) {

      // 向上查找，確認沒有開始的括號
      let hasOpening = false;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevLine = lines[j].trim();
        if (prevLine.includes('({') || prevLine.includes('console.log({') || prevLine.endsWith('{')) {
          hasOpening = true;
          break;
        }
      }

      if (!hasOpening) {
        // 找到孤立對象的結束（下一個 }); 或 }）
        let endLine = i;
        while (endLine < lines.length && !lines[endLine].trim().match(/^\}\);?$/)) {
          endLine++;
        }

        // 跳過整個孤立對象
        i = endLine + 1;
        continue;
      }
    }

    fixed.push(line);
    i++;
  }

  const fixedContent = fixed.join('\n');
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log(`Fixed: ${filePath}`);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a file path');
  process.exit(1);
}

fixOrphanObjects(filePath);
