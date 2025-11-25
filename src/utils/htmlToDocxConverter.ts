import htmlDocx from 'html-docx-js';
import { saveAs } from 'file-saver';

/**
 * 將 HTML 內容轉換為 DOCX 文件並下載
 * @param htmlContent - HTML 內容字符串
 * @param fileName - 輸出文件名（不含副檔名）
 */
export const convertHtmlToDocx = (htmlContent: string, fileName: string = 'document'): void => {
  try {
    // 創建完整的 HTML 文檔結構
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Microsoft JhengHei', '微軟正黑體', Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.6;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 10px 0;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            h1 {
              font-size: 18pt;
              font-weight: bold;
              margin: 20px 0 10px 0;
            }
            h2 {
              font-size: 16pt;
              font-weight: bold;
              margin: 15px 0 8px 0;
            }
            h3 {
              font-size: 14pt;
              font-weight: bold;
              margin: 12px 0 6px 0;
            }
            p {
              margin: 5px 0;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .font-bold {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    // 轉換 HTML 為 DOCX
    const docxBlob = htmlDocx.asBlob(fullHtml);

    // 下載文件
    saveAs(docxBlob, `${fileName}.docx`);
  } catch (error) {
    console.error('HTML 轉換為 DOCX 失敗:', error);
    throw new Error('無法生成 Word 文件');
  }
};

/**
 * 創建包含表格的 HTML 內容
 * @param title - 文檔標題
 * @param data - 表格數據
 * @param headers - 表格標題
 * @returns HTML 字符串
 */
export const createTableHtml = (
  title: string,
  data: any[],
  headers: { key: string; label: string }[]
): string => {
  const tableRows = data.map(row => {
    const cells = headers.map(header => `<td>${row[header.key] ?? '-'}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const tableHeaders = headers.map(header => `<th>${header.label}</th>`).join('');

  return `
    <h1 class="text-center">${title}</h1>
    <table>
      <thead>
        <tr>${tableHeaders}</tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
};

/**
 * 創建帶有多個部分的 HTML 內容
 * @param sections - 文檔各部分的配置
 * @returns HTML 字符串
 */
export const createMultiSectionHtml = (
  sections: Array<{
    title?: string;
    content: string;
    type?: 'text' | 'table' | 'html';
  }>
): string => {
  return sections.map(section => {
    let sectionHtml = '';

    if (section.title) {
      sectionHtml += `<h2>${section.title}</h2>`;
    }

    if (section.type === 'text') {
      sectionHtml += `<p>${section.content}</p>`;
    } else {
      sectionHtml += section.content;
    }

    return sectionHtml;
  }).join('\n');
};

/**
 * 示例：生成事故報告 Word 文檔
 */
export const generateIncidentReportDocx = (reportData: {
  reportNumber: string;
  date: string;
  patientName: string;
  incidentType: string;
  description: string;
  actions: string;
  reporter: string;
}) => {
  const htmlContent = `
    <h1 class="text-center">事故報告</h1>

    <table>
      <tr>
        <th style="width: 30%;">報告編號</th>
        <td>${reportData.reportNumber}</td>
      </tr>
      <tr>
        <th>日期</th>
        <td>${reportData.date}</td>
      </tr>
      <tr>
        <th>院友姓名</th>
        <td>${reportData.patientName}</td>
      </tr>
      <tr>
        <th>事故類型</th>
        <td>${reportData.incidentType}</td>
      </tr>
    </table>

    <h2>事故描述</h2>
    <p>${reportData.description}</p>

    <h2>處理措施</h2>
    <p>${reportData.actions}</p>

    <p class="text-right font-bold">報告人：${reportData.reporter}</p>
  `;

  convertHtmlToDocx(htmlContent, `事故報告_${reportData.reportNumber}`);
};
