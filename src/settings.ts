import { getSetting, setSetting } from './db';
import { scheduleDaily, topUpRandom, clearRandom } from './notifications';

const DEFAULT_HOUR = 21;
const DEFAULT_MINUTE = 0;
const RANDOM_COUNT = 3;

export async function getDailyTime(): Promise<{ hour: number; minute: number }> {
  const h = await getSetting('dailyHour');
  const m = await getSetting('dailyMinute');
  return {
    hour: h != null ? parseInt(h, 10) : DEFAULT_HOUR,
    minute: m != null ? parseInt(m, 10) : DEFAULT_MINUTE,
  };
}

export async function setDailyTime(hour: number, minute: number): Promise<void> {
  await setSetting('dailyHour', String(hour));
  await setSetting('dailyMinute', String(minute));
  await scheduleDaily(hour, minute);
}

export async function getRandomEnabled(): Promise<boolean> {
  const v = await getSetting('randomEnabled');
  return v == null ? true : v === '1'; // 默认开启
}

export async function setRandomEnabled(enabled: boolean): Promise<void> {
  await setSetting('randomEnabled', enabled ? '1' : '0');
  if (enabled) await topUpRandom(RANDOM_COUNT);
  else await clearRandom();
}

// 启动时按存储的偏好把通知调度好（需已获得通知权限）。
export async function applyNotificationPrefs(): Promise<void> {
  const { hour, minute } = await getDailyTime();
  await scheduleDaily(hour, minute);
  if (await getRandomEnabled()) await topUpRandom(RANDOM_COUNT);
  else await clearRandom();
}
