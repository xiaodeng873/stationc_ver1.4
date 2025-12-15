import { supabase } from '../lib/supabase';

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
  const dateStr = targetDate.toISOString().split('T')[0];
  const startOfDay = `${dateStr}T00:00:00`;
  const endOfDay = `${dateStr}T23:59:59`;

  const { data: tasks, error } = await supabase
    .from('patient_health_tasks')
    .select(`
      *,
      patients!inner(床號, 中文姓氏, 中文名字)
    `)
    .gte('next_due_at', startOfDay)
    .lte('next_due_at', endOfDay)
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

  tasks?.forEach((task: any) => {
    const dueDate = new Date(task.next_due_at);
    const time = dueDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const timeSlot = getTimeSlot(time);

    if (timeSlot) {
      const taskType = task.health_record_type === '生命表徵' ? '生命表徵' :
                       task.health_record_type === '血糖控制' ? '血糖控制' : '體重控制';

      timeSlotTasks[timeSlot].push({
        床號: task.patients.床號,
        姓名: `${task.patients.中文姓氏}${task.patients.中文名字}`,
        任務類型: taskType,
        備註: task.notes || '',
        時間: time
      });
    }
  });

  return timeSlotTasks;
};

export const generateMonitoringTaskWorksheet = async (startDate: Date) => {
  const daysData: DayData[] = [];

  for (let i = 0; i < 4; i++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + i);

    const tasks = await fetchTasksForDate(targetDate);

    daysData.push({
      date: targetDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
      weekday: getWeekdayName(targetDate),
      tasks
    });
  }

  const html = generateHTML(daysData);
  openPrintWindow(html);
};

const generateHTML = (daysData: DayData[]): string => {
  const generateTimeSlotTable = (tasks: MonitoringTask[], showSlot: boolean) => {
    if (!showSlot || tasks.length === 0) return '';

    return `
      <table class="task-table">
        <thead>
          <tr>
            <th style="width: 8%">床號</th>
            <th style="width: 10%">姓名</th>
            <th style="width: 15%">任務</th>
            <th style="width: 12%">備註</th>
            <th style="width: 10%">時間</th>
            <th style="width: 45%">數值</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => `
            <tr>
              <td>${task.床號}</td>
              <td>${task.姓名}</td>
              <td>${task.任務類型}</td>
              <td>${task.備註}</td>
              <td>${task.時間}</td>
              <td class="value-cell"></td>
            </tr>
          `).join('')}
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
          margin: 10mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Microsoft JhengHei', 'Arial', sans-serif;
          font-size: 10pt;
          line-height: 1.3;
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
          gap: 15px;
          flex: 1;
        }

        .day-column {
          border: 1px solid #333;
          padding: 8px;
          display: flex;
          flex-direction: column;
        }

        .day-header {
          text-align: center;
          padding: 6px;
          background-color: #f0f0f0;
          border-bottom: 2px solid #333;
          margin-bottom: 8px;
        }

        .day-header h2 {
          font-size: 12pt;
          font-weight: bold;
        }

        .time-slot {
          margin-bottom: 10px;
        }

        .time-slot h3 {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 4px;
          padding: 3px 6px;
          background-color: #e8e8e8;
        }

        .task-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
        }

        .task-table th,
        .task-table td {
          border: 1px solid #666;
          padding: 4px;
          text-align: center;
          font-size: 9pt;
        }

        .task-table th {
          background-color: #d0d0d0;
          font-weight: bold;
        }

        .task-table td {
          min-height: 30px;
        }

        .value-cell {
          background-color: #f9f9f9;
        }

        .page-footer {
          text-align: center;
          padding: 8px;
          font-size: 9pt;
          color: #666;
          border-top: 1px solid #ccc;
          margin-top: auto;
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
        <div class="page-footer">第 1 頁 / 共 2 頁</div>
      </div>

      <div class="page">
        <div class="page-content">
          ${generateDayColumn(daysData[2])}
          ${generateDayColumn(daysData[3])}
        </div>
        <div class="page-footer">第 2 頁 / 共 2 頁</div>
      </div>
    </body>
    </html>
  `;
};

const openPrintWindow = (html: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
};
