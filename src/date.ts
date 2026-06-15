// 共享的日期/时间格式化工具，避免在多个屏幕里各写一份。
const DAY = 24 * 60 * 60 * 1000;
export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function timeOf(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 6月13日
export function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 今天 / 昨天 / 6月13日 周五
export function dayHeader(ms: number): string {
  const d = new Date(ms);
  const todayKey = dayKey(Date.now());
  const yestKey = dayKey(Date.now() - DAY);
  const k = dayKey(ms);
  const base = `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
  if (k === todayKey) return `今天 · ${base}`;
  if (k === yestKey) return `昨天 · ${base}`;
  return base;
}

// 2026年6月13日 周五（含星期）
export function longDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
}

// 2026年6月13日 14:30
export function dateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${timeOf(ms)}`;
}
