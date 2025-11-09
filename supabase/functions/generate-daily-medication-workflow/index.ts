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

    // 查詢所有處方（不限狀態）
    // 只要處方開始日期在目標日期之前或等於目標日期即可
    let prescriptionQuery = supabase
      .from('new_medication_prescriptions')
      .select('*')
      .lte('start_date', targetDate);

    // 如果指定了院友ID，只查詢該院友的處方
    if (patientId) {
      prescriptionQuery = prescriptionQuery.eq('patient_id', parseInt(patientId));
    }

    const { data: prescriptions, error: prescriptionError } = await prescriptionQuery;

    if (prescriptionError) {
      throw new Error(`查詢處方失敗: ${prescriptionError.message}`);
    }

    console.log(`找到 ${prescriptions?.length || 0} 個處方（包含在服和停用）`);

    const workflowRecords: WorkflowRecord[] = [];
    // 修正：使用本地日期避免時區問題
    const [year, month, day] = targetDate.split('-').map(Number);
    const targetDateObj = new Date(year, month - 1, day);

    console.log(`目標日期字串: ${targetDate}`);
    console.log(`目標日期物件: ${targetDateObj.toISOString()}`);
    console.log(`目標日期本地: ${targetDateObj.getFullYear()}-${(targetDateObj.getMonth() + 1).toString().padStart(2, '0')}-${targetDateObj.getDate().toString().padStart(2, '0')}`);

    // 為每個處方生成工作流程記錄
    for (const prescription of prescriptions || []) {
      console.log(`\n========== 處理處方: ${prescription.medication_name} (ID: ${prescription.id}) ==========`);
      console.log(`院友ID: ${prescription.patient_id}`);
      console.log(`處方狀態: ${prescription.status === 'active' ? '在服' : prescription.status === 'inactive' ? '停用' : prescription.status}`);
      console.log(`頻率類型: ${prescription.frequency_type}`);
      console.log(`頻率值: ${prescription.frequency_value}`);
      console.log(`特定星期: ${JSON.stringify(prescription.specific_weekdays)}`);
      console.log(`單雙日: ${prescription.is_odd_even_day}`);
      console.log(`時間槽: ${JSON.stringify(prescription.medication_time_slots)}`);
      console.log(`開始日期: ${prescription.start_date}`);
      console.log(`結束日期: ${prescription.end_date || '無'}`);

      // 檢查處方是否在目標日期有效
      // 修正：解析日期字串為本地日期，避免時區問題
      const [startYear, startMonth, startDay] = prescription.start_date.split('-').map(Number);
      const startDate = new Date(startYear, startMonth - 1, startDay);

      let endDate: Date | null = null;
      if (prescription.end_date) {
        const [endYear, endMonth, endDay] = prescription.end_date.split('-').map(Number);
        endDate = new Date(endYear, endMonth - 1, endDay);
      }

      console.log(`開始日期物件: ${startDate.toISOString()}`);
      console.log(`結束日期物件: ${endDate ? endDate.toISOString() : '無'}`);

      // 使用日期字串比較，更準確
      const targetDateStr = targetDate;
      const startDateStr = prescription.start_date;
      const endDateStr = prescription.end_date;

      console.log(`日期比較 (字串): 目標=${targetDateStr}, 開始=${startDateStr}, 結束=${endDateStr || '無'}`);

      // 檢查是否在開始日期之前
      if (targetDateStr < startDateStr) {
        console.log(`❌ 跳過：處方尚未開始 (${targetDateStr} < ${startDateStr})`);
        continue;
      }

      // 檢查是否超過結束日期
      if (endDateStr && targetDateStr > endDateStr) {
        console.log(`❌ 跳過：目標日期超出處方有效期 (${targetDateStr} > ${endDateStr})`);
        continue;
      }

      console.log(`✓ 日期有效性檢查通過（在處方有效期內）`);

      // 根據頻率類型判斷是否需要在目標日期服藥
      const shouldTakeMedication = checkMedicationSchedule(prescription, targetDateObj);
      console.log(`頻率判斷結果: ${shouldTakeMedication ? '✓ 需要服藥' : '❌ 不需要服藥'}`);

      if (!shouldTakeMedication) {
        console.log(`❌ 跳過：根據頻率判斷，今日不需要服藥`);
        continue;
      }

      // 為每個服用時間點生成記錄
      const timeSlots = prescription.medication_time_slots || [];
      console.log(`時間槽數量: ${timeSlots.length}`);

      if (timeSlots.length === 0) {
        console.log(`⚠️ 警告：此處方沒有設定時間槽！`);
        continue;
      }

      for (const timeSlot of timeSlots) {
        console.log(`  處理時間槽: ${timeSlot}`);

        // 檢查是否已存在記錄
        const { data: existingRecord, error: checkError } = await supabase
          .from('medication_workflow_records')
          .select('id')
          .eq('prescription_id', prescription.id)
          .eq('scheduled_date', targetDate)
          .eq('scheduled_time', timeSlot)
          .maybeSingle();

        if (checkError) {
          console.log(`  ⚠️ 檢查現有記錄時發生錯誤: ${checkError.message}`);
        }

        if (existingRecord) {
          console.log(`  ⏭️  跳過：記錄已存在 (ID: ${existingRecord.id})`);
        } else {
          console.log(`  ✓ 準備生成新記錄`);
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
      console.log(`========== 完成處理: ${prescription.medication_name} ==========\n`);
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

  console.log(`  [頻率檢查] 類型: ${frequency_type}`);

  // 注意：日期有效性檢查已在主函數中完成，這裡只檢查頻率邏輯

  switch (frequency_type) {
    case 'daily':
      console.log(`  [頻率檢查] 每日服 -> 返回 true`);
      return true; // 每日服

    case 'every_x_days':
      // 隔X日服 - 修正：使用UTC日期避免時區問題
      const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const daysDiff = Math.floor((targetDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
      const interval = frequency_value || 1;
      const shouldTake = daysDiff % interval === 0;
      console.log(`  [頻率檢查] 隔${interval}日服 - 日期差: ${daysDiff}, 應服藥: ${shouldTake}`);
      return shouldTake;

    case 'weekly_days':
      // 逢星期X服
      const dayOfWeek = targetDate.getDay(); // 0=週日, 1=週一, ..., 6=週六
      const targetDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 轉換為 1-7 格式
      const result = specific_weekdays?.includes(targetDay) || false;
      console.log(`  [頻率檢查] 逢星期${targetDay}服 - 指定星期: ${JSON.stringify(specific_weekdays)}, 結果: ${result}`);
      return result;

    case 'odd_even_days':
      // 單日/雙日服
      const dateNumber = targetDate.getDate();
      let oddEvenResult = false;
      if (is_odd_even_day === 'odd') {
        oddEvenResult = dateNumber % 2 === 1; // 單日
        console.log(`  [頻率檢查] 單日服 - 日期: ${dateNumber}, 結果: ${oddEvenResult}`);
      } else if (is_odd_even_day === 'even') {
        oddEvenResult = dateNumber % 2 === 0; // 雙日
        console.log(`  [頻率檢查] 雙日服 - 日期: ${dateNumber}, 結果: ${oddEvenResult}`);
      } else {
        console.log(`  [頻率檢查] 單雙日服設定錯誤: ${is_odd_even_day}`);
      }
      return oddEvenResult;

    case 'every_x_months':
      // 隔X月服
      const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
                        (targetDate.getMonth() - startDate.getMonth());
      const monthInterval = frequency_value || 1;
      const monthResult = monthsDiff % monthInterval === 0 &&
             targetDate.getDate() === startDate.getDate();
      console.log(`  [頻率檢查] 隔${monthInterval}月服 - 月份差: ${monthsDiff}, 日期匹配: ${targetDate.getDate() === startDate.getDate()}, 結果: ${monthResult}`);
      return monthResult;

    default:
      console.log(`  [頻率檢查] 未知類型或無設定 -> 返回 true (預設需要服藥)`);
      return true; // 預設為需要服藥
  }
}