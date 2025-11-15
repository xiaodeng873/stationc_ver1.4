import ExcelJS from '@zurmokeeper/exceljs';
import { saveAs } from 'file-saver';

interface AnnualHealthCheckupExportData {
  id: string;
  patient_id: number;
  last_doctor_signature_date?: string;
  next_due_date?: string;

  has_serious_illness: boolean;
  serious_illness_details?: string;
  has_allergy: boolean;
  allergy_details?: string;
  has_infectious_disease: boolean;
  infectious_disease_details?: string;
  needs_followup_treatment: boolean;
  followup_treatment_details?: string;
  has_swallowing_difficulty: boolean;
  swallowing_difficulty_details?: string;
  has_special_diet: boolean;
  special_diet_details?: string;
  mental_illness_record?: string;

  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse?: number;
  body_weight?: number;

  cardiovascular_notes?: string;
  respiratory_notes?: string;
  central_nervous_notes?: string;
  musculo_skeletal_notes?: string;
  abdomen_urogenital_notes?: string;
  lymphatic_notes?: string;
  thyroid_notes?: string;
  skin_condition_notes?: string;
  foot_notes?: string;
  eye_ear_nose_throat_notes?: string;
  oral_dental_notes?: string;
  physical_exam_others?: string;

  vision_assessment?: string;
  hearing_assessment?: string;
  speech_assessment?: string;
  mental_state_assessment?: string;
  mobility_assessment?: string;
  continence_assessment?: string;
  adl_assessment?: string;

  recommendation?: string;

  created_at: string;
  updated_at: string;
  院友: {
    床號: string;
    中文姓氏: string;
    中文名字: string;
    性別: string;
    出生日期: string;
  };
}

export const exportAnnualHealthCheckupsToExcel = async (
  checkups: AnnualHealthCheckupExportData[]
): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('年度體檢記錄');

    worksheet.columns = [
      { header: '床號', key: '床號', width: 10 },
      { header: '姓名', key: '姓名', width: 12 },
      { header: '性別', key: '性別', width: 8 },
      { header: '出生日期', key: '出生日期', width: 12 },
      { header: '上次簽署日期', key: '上次簽署日期', width: 12 },
      { header: '下次到期日', key: '下次到期日', width: 12 },

      { header: '嚴重疾病', key: '嚴重疾病', width: 15 },
      { header: '過敏', key: '過敏', width: 15 },
      { header: '傳染病', key: '傳染病', width: 15 },
      { header: '跟進治療', key: '跟進治療', width: 15 },
      { header: '吞嚥困難', key: '吞嚥困難', width: 15 },
      { header: '特別膳食', key: '特別膳食', width: 15 },
      { header: '精神病紀錄', key: '精神病紀錄', width: 20 },

      { header: '血壓', key: '血壓', width: 12 },
      { header: '脈搏', key: '脈搏', width: 10 },
      { header: '體重', key: '體重', width: 10 },

      { header: '循環系統', key: '循環系統', width: 20 },
      { header: '呼吸系統', key: '呼吸系統', width: 20 },
      { header: '中樞神經系統', key: '中樞神經系統', width: 20 },
      { header: '肌骨', key: '肌骨', width: 20 },
      { header: '腹部/泌尿生殖', key: '腹部/泌尿生殖', width: 20 },
      { header: '淋巴系統', key: '淋巴系統', width: 20 },
      { header: '甲狀腺', key: '甲狀腺', width: 20 },
      { header: '皮膚狀況', key: '皮膚狀況', width: 20 },
      { header: '足部', key: '足部', width: 20 },
      { header: '眼耳鼻喉', key: '眼耳鼻喉', width: 20 },
      { header: '口腔牙齒', key: '口腔牙齒', width: 20 },
      { header: '其他', key: '其他', width: 20 },

      { header: '視力評估', key: '視力評估', width: 15 },
      { header: '聽力評估', key: '聽力評估', width: 15 },
      { header: '語言能力', key: '語言能力', width: 15 },
      { header: '精神狀況', key: '精神狀況', width: 15 },
      { header: '活動能力', key: '活動能力', width: 15 },
      { header: '禁制能力', key: '禁制能力', width: 15 },
      { header: '自我照顧能力', key: '自我照顧能力', width: 20 },

      { header: '建議', key: '建議', width: 30 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    checkups
      .sort((a, b) => {
        const bedA = a.院友?.床號 || '';
        const bedB = b.院友?.床號 || '';
        return bedA.localeCompare(bedB, 'zh-TW');
      })
      .forEach(checkup => {
        const row = worksheet.addRow({
          '床號': checkup.院友?.床號 || '',
          '姓名': `${checkup.院友?.中文姓氏 || ''}${checkup.院友?.中文名字 || ''}`,
          '性別': checkup.院友?.性別 || '',
          '出生日期': checkup.院友?.出生日期 ? new Date(checkup.院友.出生日期).toLocaleDateString('zh-TW') : '',
          '上次簽署日期': checkup.last_doctor_signature_date ? new Date(checkup.last_doctor_signature_date).toLocaleDateString('zh-TW') : '',
          '下次到期日': checkup.next_due_date ? new Date(checkup.next_due_date).toLocaleDateString('zh-TW') : '',

          '嚴重疾病': checkup.has_serious_illness ? (checkup.serious_illness_details || '有') : '無',
          '過敏': checkup.has_allergy ? (checkup.allergy_details || '有') : '無',
          '傳染病': checkup.has_infectious_disease ? (checkup.infectious_disease_details || '有') : '無',
          '跟進治療': checkup.needs_followup_treatment ? (checkup.followup_treatment_details || '有') : '無',
          '吞嚥困難': checkup.has_swallowing_difficulty ? (checkup.swallowing_difficulty_details || '有') : '無',
          '特別膳食': checkup.has_special_diet ? (checkup.special_diet_details || '有') : '無',
          '精神病紀錄': checkup.mental_illness_record || '',

          '血壓': (checkup.blood_pressure_systolic && checkup.blood_pressure_diastolic)
            ? `${checkup.blood_pressure_systolic}/${checkup.blood_pressure_diastolic}`
            : '',
          '脈搏': checkup.pulse || '',
          '體重': checkup.body_weight || '',

          '循環系統': checkup.cardiovascular_notes || '',
          '呼吸系統': checkup.respiratory_notes || '',
          '中樞神經系統': checkup.central_nervous_notes || '',
          '肌骨': checkup.musculo_skeletal_notes || '',
          '腹部/泌尿生殖': checkup.abdomen_urogenital_notes || '',
          '淋巴系統': checkup.lymphatic_notes || '',
          '甲狀腺': checkup.thyroid_notes || '',
          '皮膚狀況': checkup.skin_condition_notes || '',
          '足部': checkup.foot_notes || '',
          '眼耳鼻喉': checkup.eye_ear_nose_throat_notes || '',
          '口腔牙齒': checkup.oral_dental_notes || '',
          '其他': checkup.physical_exam_others || '',

          '視力評估': checkup.vision_assessment || '',
          '聽力評估': checkup.hearing_assessment || '',
          '語言能力': checkup.speech_assessment || '',
          '精神狀況': checkup.mental_state_assessment || '',
          '活動能力': checkup.mobility_assessment || '',
          '禁制能力': checkup.continence_assessment || '',
          '自我照顧能力': checkup.adl_assessment || '',

          '建議': checkup.recommendation || ''
        });

        row.alignment = { vertical: 'middle', wrapText: true };
      });

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const today = new Date().toISOString().split('T')[0];
    saveAs(blob, `年度體檢記錄_${today}.xlsx`);

  } catch (error) {
    console.error('匯出年度體檢記錄失敗:', error);
    throw error;
  }
};
