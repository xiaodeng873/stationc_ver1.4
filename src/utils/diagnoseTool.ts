import { supabase } from '../lib/supabase';

/**
 * 診斷11月2-8日週期內工作流程記錄顯示問題
 */
export async function diagnoseWorkflowDisplayIssue(
  patientId?: number,
  startDate: string = '2025-11-02',
  endDate: string = '2025-11-08'
) {
  console.log('\n========== 診斷工作流程顯示問題 ==========\n');
  console.log(`檢查期間: ${startDate} 至 ${endDate}`);
  if (patientId) {
    console.log(`指定院友ID: ${patientId}`);
  }

  // 第1步：檢查處方數據（包含在服和停用處方）
  console.log('\n===== 第1步：檢查處方（包含在服和停用） =====');

  // 先查詢在服處方
  let activePrescQuery = supabase
    .from('new_medication_prescriptions')
    .select('*')
    .eq('status', 'active')
    .lte('start_date', endDate);

  if (patientId) {
    activePrescQuery = activePrescQuery.eq('patient_id', patientId);
  }

  const { data: activePrescriptions, error: activePrescError } = await activePrescQuery;

  if (activePrescError) {
    console.error('❌ 查詢在服處方失敗:', activePrescError);
    return;
  }

  console.log(`✅ 找到 ${activePrescriptions?.length || 0} 個在服處方`);

  // 查詢停用處方（可能在該週期內仍有記錄）
  let inactivePrescQuery = supabase
    .from('new_medication_prescriptions')
    .select('*')
    .eq('status', 'inactive');

  if (patientId) {
    inactivePrescQuery = inactivePrescQuery.eq('patient_id', patientId);
  }

  const { data: inactivePrescriptions, error: inactivePrescError } = await inactivePrescQuery;

  if (inactivePrescError) {
    console.error('❌ 查詢停用處方失敗:', inactivePrescError);
  } else {
    console.log(`✅ 找到 ${inactivePrescriptions?.length || 0} 個停用處方`);
  }

  // 合併處方列表
  const prescriptions = [...(activePrescriptions || []), ...(inactivePrescriptions || [])];

  // 分析每個處方的頻率設定
  prescriptions.forEach((p: any) => {
    console.log(`\n處方: ${p.medication_name} (ID: ${p.id})`);
    console.log(`  院友ID: ${p.patient_id}`);
    console.log(`  處方狀態: ${p.status === 'active' ? '✅ 在服' : p.status === 'inactive' ? '🛑 停用' : p.status}`);
    console.log(`  頻率類型: ${p.frequency_type}`);
    console.log(`  頻率值: ${p.frequency_value}`);
    console.log(`  特定星期: ${JSON.stringify(p.specific_weekdays)}`);
    console.log(`  單雙日: ${p.is_odd_even_day}`);
    console.log(`  時間槽: ${JSON.stringify(p.medication_time_slots)} (${p.medication_time_slots?.length || 0}個)`);
    console.log(`  開始日期: ${p.start_date}`);
    console.log(`  結束日期: ${p.end_date || '無'}`);

    // 檢查處方在查詢期間是否有效
    const start = new Date(p.start_date);
    const end = p.end_date ? new Date(p.end_date) : null;
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);

    const isValid = start <= periodEnd && (!end || end >= periodStart);
    console.log(`  期間有效性: ${isValid ? '✅ 有效' : '❌ 無效'}`);

    // 對於停用處方，額外說明
    if (p.status === 'inactive') {
      console.log(`  ⚠️ 注意: 此為停用處方，但在該期間可能仍有已生成的工作流程記錄`);
    }

    // 檢查每一天是否應該服藥（僅對在服處方或期間內有效的停用處方進行判斷）
    if (p.status === 'active' || isValid) {
      const dates = [];
      let currentDate = new Date(startDate);
      while (currentDate <= new Date(endDate)) {
        const dateStr = currentDate.toISOString().split('T')[0];

        // 檢查日期是否在處方有效期內
        const dateInRange = currentDate >= start && (!end || currentDate <= end);
        const shouldTake = dateInRange ? shouldTakeMedicationOnDate(p, currentDate) : false;

        dates.push({ date: dateStr, shouldTake, dateInRange });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`  各日期服藥判斷:`);
      dates.forEach(d => {
        if (!d.dateInRange) {
          console.log(`    ${d.date}: ⏭️ 不在處方有效期內`);
        } else {
          console.log(`    ${d.date}: ${d.shouldTake ? '✅ 需要服藥' : '❌ 不需服藥'}`);
        }
      });
    } else {
      console.log(`  ⏭️ 跳過日期判斷（處方不在該期間內）`);
    }
  });

  // 第2步：檢查工作流程記錄
  console.log('\n\n===== 第2步：檢查工作流程記錄 =====');
  let recordQuery = supabase
    .from('medication_workflow_records')
    .select('*')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date')
    .order('scheduled_time');

  if (patientId) {
    recordQuery = recordQuery.eq('patient_id', patientId);
  }

  const { data: records, error: recordError } = await recordQuery;

  if (recordError) {
    console.error('❌ 查詢記錄失敗:', recordError);
    return;
  }

  console.log(`✅ 找到 ${records.length} 筆工作流程記錄`);

  // 按日期分組統計
  const dateStats: Record<string, any[]> = {};
  records.forEach((record: any) => {
    if (!dateStats[record.scheduled_date]) {
      dateStats[record.scheduled_date] = [];
    }
    dateStats[record.scheduled_date].push(record);
  });

  console.log('\n每日記錄統計:');
  const allDates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= new Date(endDate)) {
    allDates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  allDates.forEach(date => {
    const dayRecords = dateStats[date] || [];
    if (dayRecords.length > 0) {
      const times = [...new Set(dayRecords.map((r: any) => r.scheduled_time))].sort();
      const prescIds = [...new Set(dayRecords.map((r: any) => r.prescription_id))];
      console.log(`  ${date}: ${dayRecords.length} 筆記錄, ${prescIds.length} 個處方`);
      console.log(`    時間: ${times.join(', ')}`);
    } else {
      console.log(`  ${date}: ⚠️ 無記錄`);
    }
  });

  // 第3步：檢查記錄與處方的匹配關係
  console.log('\n\n===== 第3步：檢查記錄與處方的匹配 =====');
  prescriptions.forEach((p: any) => {
    const prescRecords = records.filter((r: any) => r.prescription_id === p.id);
    console.log(`\n處方: ${p.medication_name} (ID: ${p.id})`);
    console.log(`  關聯記錄數: ${prescRecords.length}`);

    if (prescRecords.length === 0) {
      console.log(`  ⚠️ 警告: 此處方沒有任何工作流程記錄！`);
    } else {
      // 按日期分組
      const byDate: Record<string, any[]> = {};
      prescRecords.forEach(r => {
        if (!byDate[r.scheduled_date]) byDate[r.scheduled_date] = [];
        byDate[r.scheduled_date].push(r);
      });

      Object.keys(byDate).sort().forEach(date => {
        const times = byDate[date].map(r => r.scheduled_time).sort().join(', ');
        console.log(`  ${date}: ${byDate[date].length} 筆 (時間: ${times})`);
      });
    }
  });

  // 第4步：計算預期記錄數
  console.log('\n\n===== 第4步：計算預期記錄數 =====');
  let expectedTotal = 0;
  prescriptions.forEach((p: any) => {
    let prescExpected = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= new Date(endDate)) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const start = new Date(p.start_date);
      const end = p.end_date ? new Date(p.end_date) : null;

      // 檢查日期是否在處方有效期內
      if (currentDate >= start && (!end || currentDate <= end)) {
        // 檢查是否根據頻率規則需要服藥
        if (shouldTakeMedicationOnDate(p, currentDate)) {
          const timeSlots = p.medication_time_slots?.length || 0;
          prescExpected += timeSlots;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const actualCount = records.filter((r: any) => r.prescription_id === p.id).length;
    const match = actualCount === prescExpected ? '✅' : '❌';

    const statusLabel = p.status === 'active' ? '在服' : p.status === 'inactive' ? '停用' : p.status;
    console.log(`處方 ${p.medication_name} (${statusLabel}):`);
    console.log(`  預期: ${prescExpected} 筆, 實際: ${actualCount} 筆 ${match}`);

    // 對停用處方，如果有實際記錄但預期為0，特別說明
    if (p.status === 'inactive' && prescExpected === 0 && actualCount > 0) {
      console.log(`  ℹ️ 說明: 此停用處方在查詢期間不應有新記錄，但有${actualCount}筆已存在的記錄（可能是停用前生成的）`);
    }

    expectedTotal += prescExpected;
  });

  console.log(`\n總計:`);
  console.log(`  預期總記錄數: ${expectedTotal} (僅計算在服處方及期間內有效的停用處方)`);
  console.log(`  實際總記錄數: ${records.length}`);

  // 更精確的匹配判斷
  const activePrescCount = prescriptions.filter((p: any) => p.status === 'active').length;
  const inactivePrescCount = prescriptions.filter((p: any) => p.status === 'inactive').length;

  if (expectedTotal === records.length) {
    console.log(`  匹配狀態: ✅ 完全匹配`);
  } else if (records.length > expectedTotal) {
    console.log(`  匹配狀態: ⚠️ 記錄數多於預期`);
    console.log(`  ℹ️ 可能原因: 包含停用處方在停用前生成的記錄`);
  } else {
    console.log(`  匹配狀態: ❌ 記錄數少於預期`);
    console.log(`  ℹ️ 可能原因: 工作流程記錄尚未生成或已被刪除`);
  }

  console.log(`\n處方摘要:`);
  console.log(`  在服處方: ${activePrescCount} 個`);
  console.log(`  停用處方: ${inactivePrescCount} 個`);

  console.log('\n========== 診斷完成 ==========\n');

  return {
    prescriptions,
    records,
    expectedTotal,
    actualTotal: records.length,
    isMatched: expectedTotal === records.length,
    activePrescCount,
    inactivePrescCount
  };
}

/**
 * 檢查處方在指定日期是否需要服藥（與 Edge Function 邏輯一致）
 */
function shouldTakeMedicationOnDate(prescription: any, targetDate: Date): boolean {
  const { frequency_type, frequency_value, specific_weekdays, is_odd_even_day } = prescription;
  const startDate = new Date(prescription.start_date);

  switch (frequency_type) {
    case 'daily':
      return true;

    case 'every_x_days':
      const targetDateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const daysDiff = Math.floor((targetDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
      const interval = frequency_value || 1;
      return daysDiff % interval === 0;

    case 'weekly_days':
      const dayOfWeek = targetDate.getDay();
      const targetDay = dayOfWeek === 0 ? 7 : dayOfWeek;
      return specific_weekdays?.includes(targetDay) || false;

    case 'odd_even_days':
      const dateNumber = targetDate.getDate();
      if (is_odd_even_day === 'odd') {
        return dateNumber % 2 === 1;
      } else if (is_odd_even_day === 'even') {
        return dateNumber % 2 === 0;
      }
      return false;

    case 'every_x_months':
      const monthsDiff = (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
                        (targetDate.getMonth() - startDate.getMonth());
      const monthInterval = frequency_value || 1;
      return monthsDiff % monthInterval === 0 &&
             targetDate.getDate() === startDate.getDate();

    default:
      return true;
  }
}

// 保留原有的診斷函數以向後兼容
export async function diagnoseMedicationWorkflow() {
  return diagnoseWorkflowDisplayIssue();
}
