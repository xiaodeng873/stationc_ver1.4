import { supabase } from '../lib/supabase';
import { isTaskScheduledForDate } from './taskScheduler';

interface MonitoringTask {
  床號: string;
  姓名: string;
  任務類型: string;
  備註: string;
  時間: string;
}

interface TimeSlotTasks {
  早餐: MonitoringTask[];
  午餐: MonitoringTask[];
  晚餐: MonitoringTask[];
  宵夜: MonitoringTask[];
}

interface DayData {
  date: string;
  weekday: string;
  tasks: TimeSlotTasks;
}

const getWeekdayName = (date: Date): string => {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return days[date.getDay()];
};

const getTimeSlot = (time: string): '早餐' | '午餐' | '晚餐' | '宵夜' | null => {
  const hour = parseInt(time.split(':')[0]);
  const minute = parseInt(time.split(':')[1]);
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes >= 7 * 60 && totalMinutes < 10 * 60) return '早餐';
  if (totalMinutes >= 10 * 60 && totalMinutes < 13 * 60) return '午餐';
  if (totalMinutes >= 13 * 60 && totalMinutes < 18 * 60) return '晚餐';
  if (totalMinutes >= 18 * 60 && totalMinutes <= 20 * 60) return '宵夜';

  return null;
};

const fetchTasksForDate = async (targetDate: Date): Promise<TimeSlotTasks> => {
  const { data: allTasks, error } = await supabase
    .from('patient_health_tasks')
    .select(`
      *,
      院友主表!inner(床號, 中文姓名, 在住狀態)
    `)
    .in('health_record_type', ['生命表徵', '血糖控制', '體重控制'])
    .order('next_due_at', { ascending: true });

  if (error) {
    console.error('獲取任務失敗:', error);
    return { 早餐: [], 午餐: [], 晚餐: [], 宵夜: [] };
  }

  const timeSlotTasks: TimeSlotTasks = {
    早餐: [],
    午餐: [],
    晚餐: [],
    宵夜: []
  };

  const targetDateCopy = new Date(targetDate);
  targetDateCopy.setHours(0, 0, 0, 0);

  allTasks?.forEach((task: any) => {
    if (task.院友主表.在住狀態 !== '在住') return;

    const isScheduled = isTaskScheduledForDate(task, targetDateCopy);
    if (!isScheduled) return;

    const taskType = task.health_record_type === '生命表徵' ? '生命表徵' :
                     task.health_record_type === '血糖控制' ? '血糖控制' : '體重控制';

    const specificTimes = task.specific_times || [];

    if (specificTimes.length > 0) {
      specificTimes.forEach((timeStr: string) => {
        const timeSlot = getTimeSlot(timeStr);
        if (timeSlot) {
          timeSlotTasks[timeSlot].push({
            床號: task.院友主表.床號,
            姓名: task.院友主表.中文姓名,
            任務類型: taskType,
            備註: task.notes || '',
            時間: timeStr
          });
        }
      });
    } else {
      const dueDate = new Date(task.next_due_at);
      const time = dueDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const timeSlot = getTimeSlot(time);

      if (timeSlot) {
        timeSlotTasks[timeSlot].push({
          床號: task.院友主表.床號,
          姓名: task.院友主表.中文姓名,
          任務類型: taskType,
          備註: task.notes || '',
          時間: time
        });
      }
    }
  });

  const getNotePriority = (note: string): number => {
    if (note.includes('注射前')) return 1;
    if (note.includes('服藥前')) return 2;
    if (note.includes('特別關顧')) return 3;
    if (note.includes('定期')) return 4;
    return 5;
  };

  Object.keys(timeSlotTasks).forEach(slot => {
    const tasks = timeSlotTasks[slot as keyof TimeSlotTasks];
    tasks.sort((a, b) => {
      if (a.時間 !== b.時間) return a.時間.localeCompare(b.時間);
      const priorityA = getNotePriority(a.備註);
      const priorityB = getNotePriority(b.備註);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.床號.localeCompare(b.床號);
    });
  });

  return timeSlotTasks;
};

export const generateMonitoringTaskWorksheet = async (startDate: Date) => {
  console.log('開始生成工作紙，起始日期:', startDate);
  const daysData: DayData[] = [];

  for (let i = 0; i < 4; i++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + i);

    console.log(`正在獲取第 ${i + 1} 天的任務:`, targetDate);
    const tasks = await fetchTasksForDate(targetDate);
    console.log(`第 ${i + 1} 天任務數量:`, {
      早餐: tasks.早餐.length,
      午餐: tasks.午餐.length,
      晚餐: tasks.晚餐.length,
      宵夜: tasks.宵夜.length
    });

    daysData.push({
      date: targetDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
      weekday: getWeekdayName(targetDate),
      tasks
    });
  }

  console.log('生成 HTML...');
  const html = generateHTML(daysData);
  console.log('HTML 長度:', html.length);
  console.log('開啟打印窗口...');
  openPrintWindow(html);
};

const generateHTML = (daysData: DayData[]): string => {
  const generateTimeSlotTable = (tasks: MonitoringTask[], showSlot: boolean) => {
    if (!showSlot) return '';

    if (tasks.length === 0) {
      return `
        <table class="task-table">
          <thead>
            <tr>
              <th style="width: 8%" rowspan="2">床號</th>
              <th style="width: 10%" rowspan="2">姓名</th>
              <th style="width: 12%" rowspan="2">任務</th>
              <th style="width: 10%" rowspan="2">備註</th>
              <th style="width: 8%" rowspan="2">時間</th>
              <th style="width: 52%" colspan="4">數值</th>
            </tr>
            <tr>
              <th style="width: 13%">上壓</th>
              <th style="width: 13%">下壓</th>
              <th style="width: 13%">脈搏</th>
              <th style="width: 13%">血糖</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="9" style="text-align: center; color: #999; padding: 8px;">此時段無任務</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    return `
      <table class="task-table">
        <thead>
          <tr>
            <th style="width: 8%" rowspan="2">床號</th>
            <th style="width: 10%" rowspan="2">姓名</th>
            <th style="width: 12%" rowspan="2">任務</th>
            <th style="width: 10%" rowspan="2">備註</th>
            <th style="width: 8%" rowspan="2">時間</th>
            <th style="width: 52%" colspan="4">數值</th>
          </tr>
          <tr>
            <th style="width: 13%">上壓</th>
            <th style="width: 13%">下壓</th>
            <th style="width: 13%">脈搏</th>
            <th style="width: 13%">血糖</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => {
            const isVitalSigns = task.任務類型 === '生命表徵';
            const isBloodSugar = task.任務類型 === '血糖控制';

            return `
              <tr>
                <td>${task.床號}</td>
                <td>${task.姓名}</td>
                <td>${task.任務類型}</td>
                <td>${task.備註}</td>
                <td>${task.時間}</td>
                <td class="${isBloodSugar ? 'disabled-cell' : 'value-cell'}"></td>
                <td class="${isBloodSugar ? 'disabled-cell' : 'value-cell'}"></td>
                <td class="${isBloodSugar ? 'disabled-cell' : 'value-cell'}"></td>
                <td class="${isVitalSigns ? 'disabled-cell' : 'value-cell'}"></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };

  const generateDayColumn = (day: DayData) => {
    const hasSupper = day.tasks.宵夜.length > 0;

    return `
      <div class="day-column">
        <div class="day-header">
          <h2>${day.date}（${day.weekday}）</h2>
        </div>

        <div class="time-slot">
          <h3>早餐 (07:00-09:59)</h3>
          ${generateTimeSlotTable(day.tasks.早餐, true)}
        </div>

        <div class="time-slot">
          <h3>午餐 (10:00-12:59)</h3>
          ${generateTimeSlotTable(day.tasks.午餐, true)}
        </div>

        <div class="time-slot">
          <h3>晚餐 (13:00-17:59)</h3>
          ${generateTimeSlotTable(day.tasks.晚餐, true)}
        </div>

        ${hasSupper ? `
        <div class="time-slot">
          <h3>宵夜 (18:00-20:00)</h3>
          ${generateTimeSlotTable(day.tasks.宵夜, true)}
        </div>
        ` : ''}
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>監測任務工作紙</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 8mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Microsoft JhengHei', 'Arial', sans-serif;
          font-size: 7pt;
          line-height: 1.2;
        }

        .page {
          page-break-after: always;
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .page:last-child {
          page-break-after: auto;
        }

        .page-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          flex: 1;
        }

        .day-column {
          border: 1px solid #333;
          padding: 5px;
          display: flex;
          flex-direction: column;
        }

        .day-header {
          text-align: center;
          padding: 4px;
          background-color: #f0f0f0;
          border-bottom: 2px solid #333;
          margin-bottom: 5px;
        }

        .day-header h2 {
          font-size: 9pt;
          font-weight: bold;
        }

        .time-slot {
          margin-bottom: 5px;
        }

        .time-slot h3 {
          font-size: 8pt;
          font-weight: bold;
          margin-bottom: 2px;
          padding: 2px 4px;
          background-color: #e8e8e8;
        }

        .task-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 3px;
        }

        .task-table th,
        .task-table td {
          border: 1px solid #666;
          padding: 2px 3px;
          text-align: center;
          font-size: 7pt;
        }

        .task-table th {
          background-color: #d0d0d0;
          font-weight: bold;
        }

        .task-table td {
          min-height: 20px;
        }

        .value-cell {
          background-color: #f9f9f9;
        }

        .disabled-cell {
          background-color: #d0d0d0;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="page-content">
          ${generateDayColumn(daysData[0])}
          ${generateDayColumn(daysData[1])}
        </div>
      </div>

      <div class="page">
        <div class="page-content">
          ${generateDayColumn(daysData[2])}
          ${generateDayColumn(daysData[3])}
        </div>
      </div>
    </body>
    </html>
  `;
};

const openPrintWindow = (html: string) => {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  try {
    const printWindow = window.open(url, '_blank');

    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();

          printWindow.addEventListener('afterprint', () => {
            URL.revokeObjectURL(url);
          });
        }, 500);
      });

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 5000);
    } else {
      URL.revokeObjectURL(url);
      console.warn('打印視窗被瀏覽器阻擋，請檢查彈出視窗設定');
    }
  } catch (error) {
    URL.revokeObjectURL(url);
    console.error('開啟打印視窗失敗:', error);
  }
};
