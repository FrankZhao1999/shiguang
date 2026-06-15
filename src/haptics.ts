import * as Haptics from 'expo-haptics';

// 轻量触感反馈。全部 fire-and-forget，并吞掉不支持设备上的报错。
function safe(p: Promise<void>) {
  p.catch(() => {});
}

export const haptic = {
  light: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  selection: () => safe(Haptics.selectionAsync()),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
