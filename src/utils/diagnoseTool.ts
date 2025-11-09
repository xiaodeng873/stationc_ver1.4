import { supabase } from '../lib/supabase';

export async function diagnoseMedicationWorkflow() {
  console.log('\n========== 診斷開始 ==========\n');

  const prescResult = await supabase
    .from('new_medication_prescriptions')
    .select('*')
    .ilike('medication_name', '%Ciprofloxacin%')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  console.log('===== 第1步：Ciprofloxacin 處方記錄 =====');
  if (prescResult.error) {
    console.error('查詢處方錯誤:', prescResult.error);
    return;
  }

  console.log('找到處方數:', prescResult.data.length);
  prescResult.data.forEach((p: any) => {
    console.log('\n處方 ID:', p.id);
    console.log('  院友ID:', p.patient_id);
    console.log('  藥名:', p.medication_name);
    console.log('  頻率類型:', p.frequency_type);
    console.log('  時間槽:', p.medication_time_slots);
    console.log('  時間槽類型:', typeof p.medication_time_slots);
    console.log('  時間槽是否為陣列:', Array.isArray(p.medication_time_slots));
    if (Array.isArray(p.medication_time_slots)) {
      console.log('  時間槽長度:', p.medication_time_slots.length);
      console.log('  時間槽內容:', p.medication_time_slots.join(', '));
    }
    console.log('  開始日期:', p.start_date);
    console.log('  結束日期:', p.end_date || '無');
    console.log('  狀態:', p.status);
  });

  const recordsResult = await supabase
    .from('medication_workflow_records')
    .select('*')
    .gte('scheduled_date', '2025-11-02')
    .lte('scheduled_date', '2025-11-08');

  console.log('\n\n===== 第2步：11月2-8日工作流程記錄 =====');
  if (recordsResult.error) {
    console.error('查詢記錄錯誤:', recordsResult.error);
  } else {
    console.log('總記錄數:', recordsResult.data.length);
    
    const dateStats: Record<string, number> = {};
    recordsResult.data.forEach((record: any) => {
      dateStats[record.scheduled_date] = (dateStats[record.scheduled_date] || 0) + 1;
    });
    
    console.log('\n每日記錄統計:');
    Object.keys(dateStats).sort().forEach(date => {
      const dayRecords = recordsResult.data.filter((r: any) => r.scheduled_date === date);
      const times = [...new Set(dayRecords.map((r: any) => r.scheduled_time))].sort();
      console.log('  ' + date + ':', dateStats[date], '筆, 時間:', times.join(', '));
    });
  }

  if (prescResult.data.length > 0) {
    console.log('\n\n===== 第3步：Ciprofloxacin 工作流程記錄 =====');
    const prescriptionIds = prescResult.data.map((p: any) => p.id);
    
    const ciproResult = await supabase
      .from('medication_workflow_records')
      .select('*')
      .in('prescription_id', prescriptionIds)
      .gte('scheduled_date', '2025-11-02')
      .lte('scheduled_date', '2025-11-08')
      .order('scheduled_date')
      .order('scheduled_time');

    if (ciproResult.error) {
      console.error('查詢錯誤:', ciproResult.error);
    } else {
      console.log('Ciprofloxacin 記錄數:', ciproResult.data.length);
      
      if (ciproResult.data.length === 0) {
        console.log('⚠️ 沒有找到任何 Ciprofloxacin 的工作流程記錄！');
        console.log('⚠️ 這表示 Edge Function 沒有成功生成記錄');
      } else {
        console.log('\n記錄詳情:');
        ciproResult.data.forEach((record: any) => {
          console.log('  ' + record.scheduled_date, record.scheduled_time, '- 準備:', record.preparation_status);
        });
      }
    }
  }

  console.log('\n\n========== 診斷完成 ==========\n');
  
  return {
    prescriptions: prescResult.data,
    allRecords: recordsResult.data,
  };
}
