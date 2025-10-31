import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Prescription {
  id: string;
  patient_id: number;
  medication_name: string;
  frequency_type: string;
  frequency_value: number;
  specific_weekdays: number[];
  is_odd_even_day: string;
  medication_time_slots: string[];
  start_date: string;
  end_date?: string;
  status: string;
}

interface WorkflowRecord {
  patient_id: number;
  prescription_id: string;
  scheduled_date: string;
  scheduled_time: string;
  preparation_status: 'pending';
  verification_status: 'pending';
  dispensing_status: 'pending';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 獲取請求參數
    const url = new URL(req.url);
    const targetDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const patientId = url.searchParams.get('patient_id');

    console.log(`生成日期 ${targetDate} 的藥物工作流程記錄${patientId ? ` (院友ID: ${patientId})` : ''}`);

    // 查詢所有在服處方
    let prescriptionQuery = supabase
      .from('new_medication_prescriptions')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', targetDate);

    // 如果指定了院友ID，只查詢該院友的處方
    if (patientId) {
      prescriptionQuery = prescriptionQuery.eq('patient_id', parseInt(patientId));
    }

    const { data: prescriptions, error: prescriptionError } = await prescriptionQuery;

    if (prescriptionError) {
      throw new Error(`查詢處方失敗: ${prescriptionError.message}`);
    }

    console.log(`找到 ${prescriptions?.length || 0} 個在服處方`);

    const workflowRecords: WorkflowRecord[] = [];
    const targetDateObj = new Date(targetDate);

    // 為每個處方生成工作流程記錄
    for (const prescription of prescriptions || []) {
      // 檢查處方是否在目標日期有效
      const startDate = new Date(prescription.start_date);
      const endDate = prescription.end_date ? new Date(prescription.end_date) : null;
      
      // 檢查是否在開始日期之前
      if (targetDateObj < startDate) {
        console.log(`處方 ${prescription.medication_name} 尚未開始 (開始日期: ${prescription.start_date})`);
        continue;
      }
      
      // 檢查是否在結束日期之後
      if (endDate && targetDateObj > endDate) {
        console.log(`處方 ${prescription.medication_name} 已結束 (結束日期: ${prescription.end_date})`);
        continue;
      }

      // 根據頻率類型判斷是否需要在目標日期服藥
      const shouldTakeMedication = checkMedicationSchedule(prescription, targetDateObj);
      
      if (!shouldTakeMedication) {
        continue;
      }

      // 為每個服用時間點生成記錄
      const timeSlots = prescription.medication_time_slots || [];
      
      for (const timeSlot of timeSlots) {
        // 檢查是否已存在記錄
        const { data: existingRecord } = await supabase
          .from('medication_workflow_records')
          .select('id')
          .eq('prescription_id', prescription.id)
          .eq('scheduled_date', targetDate)
          .eq('scheduled_time', timeSlot)
          .single();

        if (!existingRecord) {
          workflowRecords.push({
            patient_id: prescription.patient_id,
            prescription_id: prescription.id,
            scheduled_date: targetDate,
            scheduled_time: timeSlot,
            preparation_status: 'pending',
            verification_status: 'pending',
            dispensing_status: 'pending'
          });
        }
      }
    }

    console.log(`準備插入 ${workflowRecords.length} 筆工作流程記錄`);

    // 批量插入工作流程記錄
    if (workflowRecords.length > 0) {
      const { data: insertedRecords, error: insertError } = await supabase
        .from('medication_workflow_records')
        .insert(workflowRecords)
        .select();

      if (insertError) {
        throw new Error(`插入工作流程記錄失敗: ${insertError.message}`);
      }

      console.log(`成功插入 ${insertedRecords?.length || 0} 筆工作流程記錄`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `成功為 ${targetDate} 生成 ${workflowRecords.length} 筆藥物工作流程記錄`,
        date: targetDate,
        recordsGenerated: workflowRecords.length,
        prescriptionsProcessed: prescriptions?.length || 0
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );

  } catch (error) {
    console.error('生成藥物工作流程記錄失敗:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      },
    );
  }
});

// 檢查藥物是否需要在指定日期服用
function checkMedicationSchedule(prescription: Prescription, targetDate: Date): boolean {
  const { frequency_type, frequency_value, specific_weekdays, is_odd_even_day } = prescription;
  const startDate = new Date(prescription.start_date);

  // 注意：日期有效性檢查已在主函數中完成，這裡只檢查頻率邏輯

  switch (frequency_type) {
    case 'daily':
      return true; // 每日服

    case 'every_x_days':
      // 隔X日服
      const daysDiff = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff % (frequency_value || 1) === 0;

    case 'weekly_days':
      // 逢星期X服
      const dayOfWeek = targetDate.getDay(); // 0=週日, 1=週一, ..., 6=週六
      const targetDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 轉換為 1-7 格式
      return specific_weekdays?.includes(targetDay) || false;

    case 'odd_even_days':
      // 單日/雙日服
      const dateNumber = targetDate.getDate();
      if (is_odd_even_day === 'odd') {
        return dateNumber % 2 === 1; // 單日
      } else if (is_odd_even_day === 'even') {
        return dateNumber % 2 === 0; // 雙日
      }
      return false;

    case 'every_x_months':
      // 隔X月服
      const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (targetDate.getMonth() - startDate.getMonth());
      return monthsDiff % (frequency_value || 1) === 0 && 
             targetDate.getDate() === startDate.getDate();

    default:
      return true; // 預設為需要服藥
  }
}