import fs from 'fs';
import path from 'path';

function cleanupLogs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const result = [];
  let inCatchBlock = false;
  let catchBlockDepth = 0;
  let bracketDepth = 0;
  let skipNextLine = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (skipNextLine && trimmed === '') {
      skipNextLine = false;
      continue;
    }
    skipNextLine = false;

    if (trimmed.startsWith('} catch')) {
      inCatchBlock = true;
      catchBlockDepth = bracketDepth;
    }

    const openBrackets = (line.match(/{/g) || []).length;
    const closeBrackets = (line.match(/}/g) || []).length;
    bracketDepth += openBrackets - closeBrackets;

    if (inCatchBlock && bracketDepth <= catchBlockDepth) {
      inCatchBlock = false;
    }

    const isConsoleLog = trimmed.startsWith('console.log(');
    const isConsoleSeparator = trimmed === 'console.log();' ||
                                 /^console\.log\(['"]={3,}/.test(trimmed) ||
                                 /^console\.log\(['"]🔍/.test(trimmed) ||
                                 /^console\.log\(['"]✅/.test(trimmed) ||
                                 /^console\.log\(['"]❌/.test(trimmed);

    if (isConsoleLog && !inCatchBlock) {
      skipNextLine = true;
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide a file path');
  process.exit(1);
}

const cleaned = cleanupLogs(filePath);
fs.writeFileSync(filePath, cleaned, 'utf8');
console.log(`Cleaned: ${filePath}`);
