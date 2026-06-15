import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 推送点开后直接进入「回味」页，由 App 里的监听器负责跳转。
// 这里只负责调度「什么时候响」，响的时候现场选卡（见 ReviewScreen）。

const DAILY_ID_KEY = 'lucid-daily'; // 用 identifier 方便覆盖更新
const RANDOM_TAG = 'lucid-random';

// 一组温柔的文案，随机选一条当推送标题。
const PROMPTS = [
  '有一条感悟想和你重逢 🌱',
  '停一下，回味一个曾让你通透的瞬间',
  '你记下过的某个领悟，现在想见见你',
  '一个小小的顿悟，正在等你重温 ✨',
  '把心放慢一拍，有句话想对你说',
];

function randomPrompt(): string {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

// 前台收到通知时也弹出来。
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '默认',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return granted;
}

// 每日固定时间推送一条。hour/minute 可由用户设置，默认晚上 9 点。
export async function scheduleDaily(hour = 21, minute = 0): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID_KEY).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID_KEY,
    content: { title: randomPrompt(), data: { kind: 'review' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// 偶发随机推送：在未来几天里排几条随机时间的通知。
// 每次进 App 时补足，保证「惊喜」不断档。
export async function topUpRandom(count = 3): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.filter(
    (n) => (n.content.data as any)?.tag === RANDOM_TAG
  ).length;

  const DAY = 24 * 60 * 60;
  for (let i = existing; i < count; i++) {
    // 未来 1~5 天内的随机一刻，且落在 9:00~22:00 之间更不打扰。
    const daysAhead = 1 + Math.random() * 4;
    let seconds = Math.floor(daysAhead * DAY);
    seconds = clampToDaytime(seconds);
    await Notifications.scheduleNotificationAsync({
      content: { title: randomPrompt(), data: { kind: 'review', tag: RANDOM_TAG } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  }
}

// 关闭随机推送：取消所有已排的随机通知（每日定点不受影响）。
export async function clearRandom(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as any)?.tag === RANDOM_TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

// 关闭每日定点推送。
export async function clearDaily(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID_KEY).catch(() => {});
}

// 把触发时刻挪到当天 9:00~22:00 这个白天区间，避免半夜弹。
function clampToDaytime(seconds: number): number {
  const fireAt = new Date(Date.now() + seconds * 1000);
  const h = fireAt.getHours();
  if (h < 9) fireAt.setHours(9, Math.floor(Math.random() * 60), 0, 0);
  else if (h >= 22) fireAt.setHours(21, Math.floor(Math.random() * 60), 0, 0);
  return Math.max(60, Math.floor((fireAt.getTime() - Date.now()) / 1000));
}
