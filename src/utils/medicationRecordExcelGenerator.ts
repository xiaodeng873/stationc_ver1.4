import ExcelJS from '@zurmokeeper/exceljs';
import { saveAs } from 'file-saver';

// 範本格式提取介面
interface ExtractedTemplate {
  columnWidths: number[];
  rowHeights: number[];
  mergedCells: string[];
  printSettings?: Partial<ExcelJS.PageSetup>;
  cellData: {
    [address: string]: {
      value?: any;
      font?: Partial<ExcelJS.Font>;
      alignment?: Partial<ExcelJS.Alignment>;
      border?: Partial<ExcelJS.Borders>;
      fill?: Partial<ExcelJS.Fill>;
      numFmt?: string;
    };
  };
  images: Array<{
    imageId: number;
    base64: string;
    extension: string;
    range: string;
  }>;
  pageBreaks?: {
    rowBreaks?: number[];
    colBreaks?: number[];
  };
}

// 多工作表範本格式
interface MedicationRecordTemplateFormat {
  oral: ExtractedTemplate;
  topical: ExtractedTemplate;
  injection: ExtractedTemplate;
}

// 工作表配置
interface SheetConfig {
  name: string;
  template: ExtractedTemplate;
  patient: any;
  prescriptions: any[];
  routeType: 'oral' | 'topical' | 'injection';
}

const extractSheetFormat = async (worksheet: ExcelJS.Worksheet): Promise<ExtractedTemplate> => {
  console.log('提取工作表格式:', worksheet.name);
  
  const extractedTemplate: ExtractedTemplate = {
    columnWidths: [],
    rowHeights: [],
    mergedCells: [],
    cellData: {},
    images: [],
    pageBreaks: {
      rowBreaks: [],
      colBreaks: []
    },
  };

  const actualMaxCol = 44;
  const actualMaxRow = 37;

  console.log('使用固定提取範圍: A1:AR37 (44 欄 x 37 行)');

  for (let col = 1; col <= actualMaxCol; col++) {
    let width = worksheet.getColumn(col).width;
    if (width === null || width === undefined) width = 8.43;
    extractedTemplate.columnWidths.push(Math.round(width * 100) / 100);
  }

  for (let row = 1; row <= actualMaxRow; row++) {
    let height = worksheet.getRow(row).height;
    if (height === null || height === undefined) height = 15;
    extractedTemplate.rowHeights.push(Math.round(height * 100) / 100);
  }

  if (worksheet.model && worksheet.model.merges) {
    worksheet.model.merges.forEach(merge => {
      extractedTemplate.mergedCells.push(merge);
    });
  }
  
  if (worksheet.pageSetup) {
    extractedTemplate.printSettings = { ...worksheet.pageSetup };
  }

  try {
    const rowBreaks: number[] = [];
    const colBreaks: number[] = [];
    
    if (worksheet.rowBreaks && Array.isArray(worksheet.rowBreaks)) {
      rowBreaks.push(...worksheet.rowBreaks);
    }
    
    if (worksheet.colBreaks && Array.isArray(worksheet.colBreaks)) {
      colBreaks.push(...worksheet.colBreaks);
    }
    
    if ((worksheet as any).model?.rowBreaks) {
      const modelRowBreaks = (worksheet as any).model.rowBreaks;
      if (Array.isArray(modelRowBreaks)) {
        rowBreaks.push(...modelRowBreaks);
      }
    }
    
    if ((worksheet as any).model?.colBreaks) {
      const modelColBreaks = (worksheet as any).model.colBreaks;
      if (Array.isArray(modelColBreaks)) {
        colBreaks.push(...modelColBreaks);
      }
    }
    
    extractedTemplate.pageBreaks!.rowBreaks = [...new Set(rowBreaks)];
    extractedTemplate.pageBreaks!.colBreaks = [...new Set(colBreaks)];
    
  } catch (error) {
    console.error('提取分頁符失敗:', error);
    extractedTemplate.pageBreaks = { rowBreaks: [], colBreaks: [] };
  }

  let extractedCellCount = 0;
  
  for (let row = 1; row <= actualMaxRow; row++) {
    for (let col = 1; col <= actualMaxCol; col++) {
      const cell = worksheet.getCell(row, col);
      const address = cell.address;
      
      const cellData: any = {};
      
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        cellData.value = cell.value;
      }
      
      if (cell.font) {
        cellData.font = { ...cell.font };
        if (cellData.font.name === 'Segoe UI Symbol' || cellData.font.name === 'Segoe UI Emoji') {
          cellData.font.name = 'Arial Unicode MS';
        }
      }
      
      if (cell.alignment) {
        cellData.alignment = { ...cell.alignment };
      }
      
      if (cell.border) {
        cellData.border = {
          top: cell.border.top ? { ...cell.border.top } : undefined,
          left: cell.border.left ? { ...cell.border.left } : undefined,
          bottom: cell.border.bottom ? { ...cell.border.bottom } : undefined,
          right: cell.border.right ? { ...cell.border.right } : undefined,
          diagonal: cell.border.diagonal ? { ...cell.border.diagonal } : undefined,
          diagonalUp: cell.border.diagonalUp,
          diagonalDown: cell.border.diagonalDown
        };
      }
      
      if (cell.fill) {
        cellData.fill = { ...cell.fill };
      }
      
      if (cell.numFmt) {
        cellData.numFmt = cell.numFmt;
      }
      
      if (Object.keys(cellData).length > 0) {
        extractedTemplate.cellData[address] = cellData;
        extractedCellCount++;
      }
    }
  }
  console.log('提取了', extractedCellCount, '個儲存格的格式');
  
  return extractedTemplate;
};

export const categorizePrescriptionsByRoute = (prescriptions: any[]) => {
  const oral: any[] = [];
  const injection: any[] = [];
  const topical: any[] = [];
  const noRoute: any[] = [];

  prescriptions.forEach(prescription => {
    const route = prescription.administration_route?.trim();

    if (!route) {
      noRoute.push(prescription);
    } else if (route === '口服') {
      oral.push(prescription);
    } else if (route === '注射') {
      injection.push(prescription);
    } else {
      topical.push(prescription);
    }
  });

  return { oral, injection, topical, noRoute };
};

export const extractMedicationRecordTemplateFormat = async (templateFile: File): Promise<MedicationRecordTemplateFormat> => {
  console.log('開始提取個人備藥及給藥記錄範本格式...');
  
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await templateFile.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  console.log('工作簿包含', workbook.worksheets.length, '個工作表');

  if (workbook.worksheets.length < 3) {
    throw new Error('範本格式錯誤：需要至少3個工作表（口服、外用、注射），但只找到 ' + workbook.worksheets.length + ' 個');
  }

  const oralSheet = workbook.worksheets[0];
  const topicalSheet = workbook.worksheets[1];
  const injectionSheet = workbook.worksheets[2];

  console.log('工作表名稱:');
  console.log('  1.', oralSheet.name, '(口服)');
  console.log('  2.', topicalSheet.name, '(外用)');
  console.log('  3.', injectionSheet.name, '(注射)');

  const oralFormat = await extractSheetFormat(oralSheet);
  const topicalFormat = await extractSheetFormat(topicalSheet);
  const injectionFormat = await extractSheetFormat(injectionSheet);

  console.log('個人備藥及給藥記錄範本格式提取完成！');

  return {
    oral: oralFormat,
    topical: topicalFormat,
    injection: injectionFormat
  };
};

// 計算年齡
const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// 獲取服用頻率描述
const getFrequencyDescription = (prescription: any): string => {
  const { frequency_type, frequency_value, specific_weekdays, is_odd_even_day, medication_time_slots } = prescription;
  
  const getFrequencyAbbreviation = (count: number): string => {
    switch (count) {
      case 1: return 'QD';
      case 2: return 'BD';
      case 3: return 'TDS';
      case 4: return 'QID';
      default: return count + '次/日';
    }
  };
  
  const timeSlotsCount = medication_time_slots?.length || 0;
  
  switch (frequency_type) {
    case 'daily':
      return getFrequencyAbbreviation(timeSlotsCount);
    case 'every_x_days':
      return '隔' + frequency_value + '日服';
    case 'every_x_months':
      return '隔' + frequency_value + '月服';
    case 'weekly_days':
      const dayNames = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
      const days = specific_weekdays?.map((day: number) => dayNames[day === 7 ? 0 : day]).join('、') || '';
      return '逢' + days + '服';
    case 'odd_even_days':
      return is_odd_even_day === 'odd' ? '單日服' : is_odd_even_day === 'even' ? '雙日服' : '單雙日服';
    case 'hourly':
      return '每' + frequency_value + '小時服用';
    default:
      return getFrequencyAbbreviation(timeSlotsCount);
  }
};

// 深層複製範圍內的所有格式和內容
const deepCopyRange = (
  worksheet: ExcelJS.Worksheet,
  template: ExtractedTemplate,
  startRow: number,
  endRow: number,
  targetStartRow: number
) => {
  console.log('深層複製範圍: 第', startRow, '-', endRow, '列到第', targetStartRow, '列');
  
  const rowCount = endRow - startRow + 1;
  
  // 複製列高
  for (let i = 0; i < rowCount; i++) {
    const sourceRowIndex = startRow + i - 1;
    const targetRowIndex = targetStartRow + i - 1;
    if (sourceRowIndex < template.rowHeights.length) {
      worksheet.getRow(targetRowIndex + 1).height = template.rowHeights[sourceRowIndex];
    }
  }
  
  // 複製儲存格內容和格式
  Object.entries(template.cellData).forEach(([address, cellData]) => {
    const cell = worksheet.getCell(address);
    const rowNum = cell.row;
    
    if (rowNum >= startRow && rowNum <= endRow) {
      const offset = targetStartRow - startRow;
      const targetRow = rowNum + offset;
      const targetAddress = cell.address.replace(/\d+/, targetRow.toString());
      const targetCell = worksheet.getCell(targetAddress);
      
      if (cellData.value !== undefined) {
        targetCell.value = cellData.value;
      }
      if (cellData.font) {
        targetCell.font = cellData.font;
      }
      if (cellData.alignment) {
        targetCell.alignment = cellData.alignment;
      }
      if (cellData.border) {
        targetCell.border = cellData.border;
      }
      if (cellData.fill) {
        targetCell.fill = cellData.fill;
      }
      if (cellData.numFmt) {
        targetCell.numFmt = cellData.numFmt;
      }
    }
  });
  
  // 複製合併儲存格
  template.mergedCells.forEach(merge => {
    const match = merge.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (match) {
      const startCol = match[1];
      const startRowNum = parseInt(match[2]);
      const endCol = match[3];
      const endRowNum = parseInt(match[4]);
      
      if (startRowNum >= startRow && endRowNum <= endRow) {
        const offset = targetStartRow - startRow;
        const targetMerge = startCol + (startRowNum + offset) + ':' + endCol + (endRowNum + offset);
        try {
          worksheet.mergeCells(targetMerge);
        } catch (e) {
          console.warn('合併儲存格失敗:', targetMerge);
        }
      }
    }
  });
};

// 應用範本格式並填入資料
const applyMedicationRecordTemplate = (
  worksheet: ExcelJS.Worksheet,
  template: ExtractedTemplate,
  patient: any,
  prescriptions: any[],
  selectedMonth: string
): void => {
  console.log('開始應用個人備藥及給藥記錄範本: ', patient.中文姓氏 + patient.中文名字);
  
  // 設定欄寬
  template.columnWidths.forEach((width, idx) => {
    worksheet.getColumn(idx + 1).width = width;
  });
  
  // 設定列高
  template.rowHeights.forEach((height, idx) => {
    worksheet.getRow(idx + 1).height = height;
  });
  
  // 應用所有儲存格格式
  Object.entries(template.cellData).forEach(([address, cellData]) => {
    const cell = worksheet.getCell(address);
    
    if (cellData.value !== undefined) {
      cell.value = cellData.value;
    }
    if (cellData.font) {
      cell.font = cellData.font;
    }
    if (cellData.alignment) {
      cell.alignment = cellData.alignment;
    }
    if (cellData.border) {
      cell.border = cellData.border;
    }
    if (cellData.fill) {
      cell.fill = cellData.fill;
    }
    if (cellData.numFmt) {
      cell.numFmt = cellData.numFmt;
    }
  });
  
  // 合併儲存格
  template.mergedCells.forEach(merge => {
    try {
      worksheet.mergeCells(merge);
    } catch (e) {
      console.warn('合併儲存格失敗:', merge);
    }
  });
  
  // 填入院友基本資訊（第1-6列）
  worksheet.getCell('B1').value = patient.藥物敏感 && patient.藥物敏感.length > 0
    ? patient.藥物敏感.join('、')
    : 'NKDA';

  worksheet.getCell('B3').value = patient.不良藥物反應 && patient.不良藥物反應.length > 0
    ? patient.不良藥物反應.join('、')
    : 'NKADR';

  // K3：填入匯出月份（格式：XXXX年XX月）
  const [year, month] = selectedMonth.split('-');
  worksheet.getCell('K3').value = year + '年' + month + '月';

  worksheet.getCell('AF1').value = patient.中文姓氏 + patient.中文名字;

  const age = calculateAge(patient.出生日期);
  worksheet.getCell('AF2').value = patient.性別 + '/' + age;

  worksheet.getCell('AO1').value = patient.床號;

  worksheet.getCell('AO2').value = patient.出生日期
    ? new Date(patient.出生日期).toLocaleDateString('zh-TW')
    : '';
  
  // 填入處方資料
  let currentPage = 1;
  let prescriptionIndex = 0;
  
  while (prescriptionIndex < prescriptions.length) {
    const prescriptionsPerPage = 5;
    const startRow = currentPage === 1 ? 7 : ((currentPage - 1) * 31) + 7;
    
    // 如果是第二頁或之後，需要深層複製第7-37列
    if (currentPage > 1) {
      const targetStartRow = (currentPage - 1) * 31 + 7;
      deepCopyRange(worksheet, template, 7, 37, targetStartRow);
    }
    
    // 收集這一頁的所有服用時間點
    const pageTimeSlots: string[] = [];

    // 填入這一頁的處方（最多5個）
    for (let i = 0; i < prescriptionsPerPage && prescriptionIndex < prescriptions.length; i++) {
      const prescription = prescriptions[prescriptionIndex];
      const groupStartRow = startRow + (i * 5);

      // 填入處方資訊並收集時間點
      const timeSlots = fillPrescriptionData(worksheet, prescription, groupStartRow);
      pageTimeSlots.push(...timeSlots);

      prescriptionIndex++;
    }

    // 填入頁面時間點總結 (L32-L37)
    fillPageTimeSummary(worksheet, pageTimeSlots, startRow);

    // 修復該頁的邊框
    fixCellBorders(worksheet, startRow);

    currentPage++;
  }
  
  // 設定列印設定
  if (template.printSettings) {
    worksheet.pageSetup = {
      ...template.printSettings,
      printTitlesRow: '1:6'  // 設定第1-6列為列印標題
    };
  }
  
  console.log('個人備藥及給藥記錄範本應用完成');
};

// 填入頁面時間點總結 (L32-L37)
const fillPageTimeSummary = (worksheet: ExcelJS.Worksheet, timeSlots: string[], startRow: number): void => {
  // 去重並排序時間點
  const uniqueTimeSlots = [...new Set(timeSlots)].sort((a, b) => {
    return parseTimeToMinutes(a) - parseTimeToMinutes(b);
  });

  // 按時間範圍分組
  const morningSlots: string[] = []; // 07:00-11:59 -> L32-L34
  const afternoonEveningSlots: string[] = []; // 12:00-22:00 -> L35-L37

  uniqueTimeSlots.forEach(timeSlot => {
    const minutes = parseTimeToMinutes(timeSlot);
    if (minutes >= 7 * 60 && minutes < 12 * 60) {
      morningSlots.push(timeSlot);
    } else if (minutes >= 12 * 60 && minutes <= 22 * 60) {
      afternoonEveningSlots.push(timeSlot);
    }
  });

  // 計算 L32-L37 的實際列號
  const summaryStartRow = startRow + 25; // 32 - 7 = 25

  // 清空 L32-L37
  for (let i = 0; i < 6; i++) {
    worksheet.getCell('L' + (summaryStartRow + i)).value = '';
  }

  // 填入早上時段 (L32-L34)
  for (let i = 0; i < Math.min(morningSlots.length, 3); i++) {
    worksheet.getCell('L' + (summaryStartRow + i)).value = morningSlots[i];
  }

  // 填入下午晚上時段 (L35-L37)
  for (let i = 0; i < Math.min(afternoonEveningSlots.length, 3); i++) {
    worksheet.getCell('L' + (summaryStartRow + 3 + i)).value = afternoonEveningSlots[i];
  }
};

// 修復特定儲存格的邊框
const fixCellBorders = (worksheet: ExcelJS.Worksheet, startRow: number): void => {
  const thinBorder = { style: 'thin' as const, color: { argb: '00000000' } };

  // 修復 B1 的右邊框（只在第一頁）
  if (startRow === 7) {
    const b1 = worksheet.getCell('B1');
    b1.border = {
      ...b1.border,
      right: thinBorder
    };
  }

  // 修復 J9, J14, J19, J24, J29 的右邊框（每個處方組的J列第二個儲存格，即服用頻率那一格）
  // startRow 是該頁第一個處方組的起始列，每組間隔5列，服用頻率在 startRow + 1
  for (let i = 0; i < 5; i++) {
    const jRow = startRow + (i * 5) + 1; // +1 是服用頻率那一格
    const jCell = worksheet.getCell('J' + jRow);
    jCell.border = {
      ...jCell.border,
      right: thinBorder
    };
  }

  // 修復 A32 的下邊框（只在第一頁）
  if (startRow === 7) {
    const a32 = worksheet.getCell('A32');
    a32.border = {
      ...a32.border,
      bottom: thinBorder
    };
  } else {
    // 後續頁的 A32 對應位置
    const a32Row = startRow + 25; // 32 - 7 = 25
    const a32Cell = worksheet.getCell('A' + a32Row);
    a32Cell.border = {
      ...a32Cell.border,
      bottom: thinBorder
    };
  }

  // 修復 H32:K37 (給藥簽署組) 的右邊框和下邊框
  // 該區域在第一頁是 H32:K37，在後續頁需要根據 startRow 計算
  const signatureBlockStartRow = startRow + 25; // 32 - 7 = 25
  const signatureBlockEndRow = startRow + 30;   // 37 - 7 = 30

  // 修復右邊框 (K列)
  for (let row = signatureBlockStartRow; row <= signatureBlockEndRow; row++) {
    const kCell = worksheet.getCell('K' + row);
    kCell.border = {
      ...kCell.border,
      right: thinBorder
    };
  }

  // 修復下邊框 (H, I, J, K 列的最後一行)
  for (const col of ['H', 'I', 'J', 'K']) {
    const cell = worksheet.getCell(col + signatureBlockEndRow);
    cell.border = {
      ...cell.border,
      bottom: thinBorder
    };
  }
};

// 解析時間字串為分鐘數（方便比較）
const parseTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return -1;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
};

// 根據時間範圍決定放置的列偏移
const getTimeSlotRowOffset = (timeStr: string): number => {
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes < 0) return 1; // 無效時間，預設第一列

  if (minutes >= 7 * 60 && minutes < 12 * 60) {
    return 1; // 07:00-11:59 -> L8 (startRow + 1)
  } else if (minutes >= 12 * 60 && minutes < 16 * 60) {
    return 2; // 12:00-15:59 -> L9 (startRow + 2)
  } else if (minutes >= 16 * 60 && minutes < 20 * 60) {
    return 3; // 16:00-19:59 -> L10 (startRow + 3)
  } else if (minutes >= 20 * 60 && minutes <= 22 * 60) {
    return 4; // 20:00-22:00 -> L11 (startRow + 4)
  }
  return 1; // 其他時間預設第一列
};

// 填入單個處方資料
const fillPrescriptionData = (
  worksheet: ExcelJS.Worksheet,
  prescription: any,
  startRow: number
): string[] => {
  // B列：藥物名稱 (第1行)
  worksheet.getCell('B' + startRow).value = prescription.medication_name || '';

  // B列：藥物來源 (第5行)
  worksheet.getCell('B' + (startRow + 4)).value = prescription.medication_source
    ? '藥物來源: ' + prescription.medication_source
    : '';

  // A列：處方日期
  worksheet.getCell('A' + startRow).value = prescription.prescription_date
    ? new Date(prescription.prescription_date).toLocaleDateString('zh-TW')
    : '';

  // J列：途徑
  worksheet.getCell('J' + startRow).value = prescription.administration_route || '';

  // J列：服用頻率+服用次數 (第2行)
  const frequencyDesc = getFrequencyDescription(prescription);
  worksheet.getCell('J' + (startRow + 1)).value = frequencyDesc;

  // J列：服用份量 (第3行)
  let dosageText = '';
  if (prescription.special_dosage_instruction) {
    dosageText = prescription.special_dosage_instruction;
  } else if (prescription.dosage_amount) {
    dosageText = '每次' + prescription.dosage_amount + (prescription.dosage_unit || '');
  }
  worksheet.getCell('J' + (startRow + 2)).value = dosageText;

  // J列：需要時 (第4行)
  worksheet.getCell('J' + (startRow + 3)).value = prescription.is_prn ? '需要時' : '';

  // L列：服用時間，根據時間範圍放置在不同列
  const timeSlots = prescription.medication_time_slots || [];
  const timeSlotsMap: { [key: number]: string[] } = {};

  timeSlots.forEach((timeSlot: string) => {
    const rowOffset = getTimeSlotRowOffset(timeSlot);
    if (!timeSlotsMap[rowOffset]) {
      timeSlotsMap[rowOffset] = [];
    }
    timeSlotsMap[rowOffset].push(timeSlot);
  });

  // 清空 L8-L11 (startRow + 1 到 startRow + 4)
  for (let i = 1; i <= 4; i++) {
    worksheet.getCell('L' + (startRow + i)).value = '';
  }

  // 填入分組後的時間點
  Object.entries(timeSlotsMap).forEach(([rowOffset, slots]) => {
    const cell = worksheet.getCell('L' + (startRow + parseInt(rowOffset)));
    cell.value = slots.join(', ');
  });

  // 返回所有時間點供頁面總結使用
  return timeSlots;
};

// 匯出個人備藥及給藥記錄
export const exportMedicationRecordToExcel = async (
  selectedPatients: any[],
  template: any,
  selectedMonth: string,
  filename?: string
): Promise<void> => {
  try {
    console.log('開始匯出個人備藥及給藥記錄...');
    console.log('選擇的院友數量:', selectedPatients.length);

    if (!template.extracted_format) {
      throw new Error('範本格式無效');
    }

    const templateFormat = template.extracted_format as MedicationRecordTemplateFormat;

    if (!templateFormat.oral || !templateFormat.topical || !templateFormat.injection) {
      const missingSheets = [];
      if (!templateFormat.oral) missingSheets.push('口服');
      if (!templateFormat.topical) missingSheets.push('外用');
      if (!templateFormat.injection) missingSheets.push('注射');
      throw new Error('範本格式不完整：缺少 ' + missingSheets.join('、') + ' 工作表格式。請確保範本檔案包含三個工作表：「個人備藥及給藥記錄 (口服)」、「個人備藥及給藥記錄 (外用)」、「個人備藥及給藥記錄 (注射)」');
    }

    console.log('範本格式驗證通過，包含三種途徑的工作表格式');

    const workbook = new ExcelJS.Workbook();
    let totalOral = 0;
    let totalInjection = 0;
    let totalTopical = 0;
    let totalNoRoute = 0;
    let totalSheets = 0;

    // 為每位院友創建工作表
    for (const patient of selectedPatients) {
      console.log(`\n處理院友: ${patient.床號} ${patient.中文姓氏}${patient.中文名字}`);

      // 獲取該院友的所有處方
      const allPrescriptions = patient.prescriptions || [];
      console.log(`  總處方數: ${allPrescriptions.length}`);

      // 按途徑分類處方
      const categorized = categorizePrescriptionsByRoute(allPrescriptions);

      console.log(`  途徑分類結果:`);
      console.log(`    口服: ${categorized.oral.length} 個`);
      console.log(`    注射: ${categorized.injection.length} 個`);
      console.log(`    外用: ${categorized.topical.length} 個`);
      console.log(`    缺少途徑: ${categorized.noRoute.length} 個`);

      totalOral += categorized.oral.length;
      totalInjection += categorized.injection.length;
      totalTopical += categorized.topical.length;
      totalNoRoute += categorized.noRoute.length;

      if (categorized.noRoute.length > 0) {
        console.warn(`  警告: 以下處方缺少途徑資訊，將不會被匯出:`);
        categorized.noRoute.forEach((p: any) => {
          console.warn(`    - ${p.medication_name}`);
        });
      }

      // 創建口服工作表
      if (categorized.oral.length > 0) {
        const sheetName = patient.床號 + patient.中文姓氏 + patient.中文名字 + '(口服)';
        console.log(`  創建工作表: ${sheetName}`);
        const worksheet = workbook.addWorksheet(sheetName.substring(0, 31));
        applyMedicationRecordTemplate(worksheet, templateFormat.oral, patient, categorized.oral, selectedMonth);
        totalSheets++;
      }

      // 創建注射工作表
      if (categorized.injection.length > 0) {
        const sheetName = patient.床號 + patient.中文姓氏 + patient.中文名字 + '(注射)';
        console.log(`  創建工作表: ${sheetName}`);
        const worksheet = workbook.addWorksheet(sheetName.substring(0, 31));
        applyMedicationRecordTemplate(worksheet, templateFormat.injection, patient, categorized.injection, selectedMonth);
        totalSheets++;
      }

      // 創建外用工作表
      if (categorized.topical.length > 0) {
        const sheetName = patient.床號 + patient.中文姓氏 + patient.中文名字 + '(外用)';
        console.log(`  創建工作表: ${sheetName}`);
        const worksheet = workbook.addWorksheet(sheetName.substring(0, 31));
        applyMedicationRecordTemplate(worksheet, templateFormat.topical, patient, categorized.topical, selectedMonth);
        totalSheets++;
      }
    }

    if (workbook.worksheets.length === 0) {
      throw new Error('沒有可匯出的處方資料。所有處方可能都缺少途徑資訊或不符合匯出條件。');
    }

    console.log('\n匯出統計:');
    console.log(`  總共創建 ${totalSheets} 個工作表`);
    console.log(`  口服處方: ${totalOral} 個`);
    console.log(`  注射處方: ${totalInjection} 個`);
    console.log(`  外用處方: ${totalTopical} 個`);
    if (totalNoRoute > 0) {
      console.log(`  ⚠️ 警告: ${totalNoRoute} 個處方因缺少途徑資訊而未被匯出`);
    }

    // 生成檔案名稱
    const templateBaseName = template.original_name.replace(/\.(xlsx|xls)$/i, '');
    const finalFilename = filename ||
      (selectedPatients.length === 1
        ? selectedPatients[0].床號 + '_' + selectedPatients[0].中文姓氏 + selectedPatients[0].中文名字 + '_' + templateBaseName + '.xlsx'
        : templateBaseName + '_' + selectedPatients.length + '名院友.xlsx');

    // 儲存檔案
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, finalFilename);

    console.log('個人備藥及給藥記錄匯出完成:', finalFilename);

  } catch (error: any) {
    console.error('匯出個人備藥及給藥記錄失敗:', error);
    throw error;
  }
};
