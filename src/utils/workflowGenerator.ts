import { supabase } from '../lib/supabase';
import { getSupabaseUrl, getSupabaseAnonKey } from '../config/supabase.config';

/**
 * 為指定日期和院友生成藥物工作流程記錄
 */
export async function generateDailyWorkflowRecords(
  targetDate: string,
  patientId?: number
): Promise<{ success: boolean; message: string; recordsGenerated: number }> {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      message: 'Supabase 環境變數未設定',
      recordsGenerated: 0
    };
  }

  try {
    const functionUrl = `${supabaseUrl}/functions/v1/generate-daily-medication-workflow`;
    
    const params = new URLSearchParams();
    params.append('date', targetDate);
    if (patientId) {
      params.append('patient_id', patientId.toString());
    }

    console.log('發送請求到:', `${functionUrl}?${params.toString()}`);
    
    const response = await fetch(`${functionUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    }).catch(fetchError => {
      console.error('Fetch 請求失敗:', fetchError);
      throw new Error(`網路請求失敗: ${fetchError.message}`);
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP 錯誤回應:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '生成工作流程記錄失敗');
    }

    return {
      success: true,
      message: result.message,
      recordsGenerated: result.recordsGenerated || 0
    };

  } catch (error) {
    console.error('生成每日工作流程記錄失敗:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '網路連線或伺服器錯誤',
      recordsGenerated: 0
    };
  }
}

/**
 * 為未來幾天批量生成工作流程記錄
 */
export async function generateBatchWorkflowRecords(
  startDate: string,
  endDate: string,
  patientId?: number
): Promise<{ success: boolean; message: string; totalRecords: number }> {
  try {
    let totalRecords = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 逐日生成記錄
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0];
      const result = await generateDailyWorkflowRecords(dateString, patientId);
      
      if (result.success) {
        totalRecords += result.recordsGenerated;
      } else {
        console.warn(`生成 ${dateString} 的記錄失敗:`, result.message);
      }
    }

    return {
      success: true,
      message: `成功為 ${startDate} 至 ${endDate} 生成 ${totalRecords} 筆工作流程記錄`,
      totalRecords
    };

  } catch (error) {
    console.error('批量生成工作流程記錄失敗:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '網路連線或伺服器錯誤',
      totalRecords: 0
    };
  }
}