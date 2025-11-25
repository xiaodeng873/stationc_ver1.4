# HTML to DOCX 轉換功能使用指南

## 概述

已成功安裝並配置 `html-docx-js` 庫,用於將 HTML 內容轉換為 Microsoft Word DOCX 格式文件。這是一個開源的替代方案,無需購買付費的 Docxtemplater HTML Module。

## 已安裝的套件

- **html-docx-js** (v0.3.1) - 將 HTML 轉換為 DOCX 的核心庫
- **@types/html-docx-js** (v0.3.4) - TypeScript 類型定義

## 工具函數位置

`src/utils/htmlToDocxConverter.ts`

## 主要功能

### 1. 基本 HTML 轉 DOCX

```typescript
import { convertHtmlToDocx } from '../utils/htmlToDocxConverter';

// 簡單的 HTML 內容
const htmlContent = `
  <h1>標題</h1>
  <p>這是一段文字內容。</p>
  <table>
    <tr>
      <th>欄位1</th>
      <th>欄位2</th>
    </tr>
    <tr>
      <td>數據1</td>
      <td>數據2</td>
    </tr>
  </table>
`;

// 轉換並下載
convertHtmlToDocx(htmlContent, '我的文檔');
```

### 2. 創建表格 HTML

```typescript
import { createTableHtml, convertHtmlToDocx } from '../utils/htmlToDocxConverter';

// 定義數據
const data = [
  { name: '張三', age: 30, department: '護理部' },
  { name: '李四', age: 25, department: '行政部' },
];

const headers = [
  { key: 'name', label: '姓名' },
  { key: 'age', label: '年齡' },
  { key: 'department', label: '部門' },
];

// 生成表格 HTML
const tableHtml = createTableHtml('員工列表', data, headers);

// 轉換為 DOCX
convertHtmlToDocx(tableHtml, '員工列表');
```

### 3. 多部分文檔

```typescript
import { createMultiSectionHtml, convertHtmlToDocx } from '../utils/htmlToDocxConverter';

const sections = [
  {
    title: '第一部分',
    content: '<p>這是第一部分的內容。</p>',
    type: 'html' as const
  },
  {
    title: '第二部分',
    content: '這是純文字內容',
    type: 'text' as const
  },
  {
    content: '<table><tr><th>標題</th></tr><tr><td>數據</td></tr></table>',
    type: 'html' as const
  }
];

const fullHtml = createMultiSectionHtml(sections);
convertHtmlToDocx(fullHtml, '多部分文檔');
```

### 4. 事故報告示例

```typescript
import { generateIncidentReportDocx } from '../utils/htmlToDocxConverter';

// 使用預設的事故報告生成器
generateIncidentReportDocx({
  reportNumber: 'IR-2025-001',
  date: '2025-11-25',
  patientName: '張三',
  incidentType: '跌倒',
  description: '院友在走廊行走時不慎跌倒',
  actions: '立即協助院友起身,檢查傷勢,通知醫生',
  reporter: '李護士'
});
```

## 支持的 HTML 樣式

工具函數內建以下樣式支持:

- **字體**: 微軟正黑體 (Microsoft JhengHei)
- **標題**: h1 (18pt), h2 (16pt), h3 (14pt)
- **表格**: 帶邊框,自動調整寬度
- **文字對齊**: `.text-center`, `.text-right`
- **粗體**: `.font-bold`

## 自定義樣式

可以在 HTML 中添加內聯樣式:

```typescript
const htmlContent = `
  <p style="color: red; font-weight: bold;">紅色粗體文字</p>
  <table style="width: 80%;">
    <tr>
      <td style="background-color: #f0f0f0;">灰色背景</td>
    </tr>
  </table>
`;

convertHtmlToDocx(htmlContent, '自定義樣式文檔');
```

## 與現有 Docxtemplater 的比較

### Docxtemplater (現有方式)
- ✅ 使用 Word 範本文件
- ✅ 精確控制文檔格式
- ✅ 支援複雜的條件邏輯
- ❌ 需要預先準備範本文件
- ❌ 範本維護較複雜

### html-docx-js (新方式)
- ✅ 純代碼生成,無需範本文件
- ✅ 靈活的內容生成
- ✅ 易於維護和修改
- ✅ 完全開源免費
- ❌ 樣式控制相對簡單
- ❌ 不支援某些高級 Word 功能

## 建議使用場景

### 使用 html-docx-js 的場景:
1. **簡單表格報告** - 數據列表、統計報告
2. **動態內容文檔** - 根據數據生成的文檔
3. **快速原型開發** - 不需要複雜格式的報告
4. **標準化報告** - 格式統一的重複性文檔

### 繼續使用 Docxtemplater 的場景:
1. **複雜格式文檔** - 需要精確控制字體、間距、頁首頁尾
2. **官方正式文檔** - 使用現有範本的官方報告
3. **特殊格式要求** - 需要 Word 特定功能的文檔
4. **現有範本維護** - 已有的範本文件系統

## 注意事項

1. **中文字體**: 已配置微軟正黑體,確保中文顯示正確
2. **表格邊框**: 默認啟用表格邊框
3. **文件大小**: HTML 轉換的文件通常比範本生成的稍大
4. **兼容性**: 生成的 DOCX 文件兼容 Word 2007+

## 錯誤處理

```typescript
try {
  convertHtmlToDocx(htmlContent, '文檔名稱');
} catch (error) {
  console.error('生成 Word 文件失敗:', error);
  alert('無法生成 Word 文件,請聯繫技術支援');
}
```

## 進一步擴展

如需更多功能,可以考慮:
1. 添加頁首頁尾支援
2. 自定義頁面大小和邊距
3. 添加圖片支援
4. 實現更複雜的樣式系統

參考 `html-docx-js` 官方文檔: https://github.com/evidenceprime/html-docx-js
