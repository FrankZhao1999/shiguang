import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { getDailyTime, setDailyTime, getRandomEnabled, setRandomEnabled } from '../settings';
import { ensurePermissions } from '../notifications';
import { exportAsText, exportAsBackupFile } from '../export';
import { useColors, spacing, radius, useTabBarSpace } from '../theme';
import { haptic } from '../haptics';

export default function SettingsScreen() {
  const c = useColors();
  const tabSpace = useTabBarSpace();
  const [time, setTime] = useState<Date>(new Date());
  const [randomOn, setRandomOn] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    getDailyTime().then(({ hour, minute }) => {
      const d = new Date();
      d.setHours(hour, minute, 0, 0);
      setTime(d);
    });
    getRandomEnabled().then(setRandomOn);
  }, []);

  function warnNoPermission() {
    Alert.alert(
      '未开启通知权限',
      '设置已保存，但需要在系统「设置 → 通知」里允许「拾光」发送通知，提醒才会生效。'
    );
  }

  async function persistTime(t: Date) {
    try {
      const ok = await ensurePermissions();
      await setDailyTime(t.getHours(), t.getMinutes());
      if (!ok) warnNoPermission();
    } catch {
      Alert.alert('提醒设置失败', '请稍后重试。');
    }
  }

  async function onChangeTime(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type !== 'set' || !picked) return;
      setTime(picked);
      await persistTime(picked);
    } else if (picked) {
      setTime(picked); // iOS 转盘滚动只更新显示，点「完成」才保存
    }
  }

  function closeIosPicker() {
    setShowPicker(false);
    haptic.light();
    persistTime(time);
  }

  async function onToggleRandom(value: boolean) {
    setRandomOn(value);
    try {
      if (value) {
        const ok = await ensurePermissions();
        await setRandomEnabled(true);
        if (!ok) warnNoPermission();
      } else {
        await setRandomEnabled(false);
      }
    } catch {
      setRandomOn(!value);
      Alert.alert('设置失败', '请稍后重试。');
    }
  }

  async function runExport(fn: () => Promise<void>, failMsg: string) {
    haptic.light();
    try {
      await fn();
    } catch {
      Alert.alert('导出失败', failMsg);
    }
  }

  const timeLabel = `${String(time.getHours()).padStart(2, '0')}:${String(
    time.getMinutes()
  ).padStart(2, '0')}`;

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabSpace }}
    >
      <Text style={[styles.section, { color: c.secondaryLabel }]}>推送</Text>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <TouchableOpacity style={styles.row} onPress={() => setShowPicker((s) => !s)}>
          <Text style={[styles.rowLabel, { color: c.label }]}>每日提醒时间</Text>
          <Text style={[styles.value, { color: c.accent }]}>{timeLabel}</Text>
        </TouchableOpacity>
        {showPicker ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={time}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeTime}
              themeVariant={c.scheme}
            />
            {Platform.OS === 'ios' ? (
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: c.fill }]}
                onPress={closeIosPicker}
              >
                <Text style={[styles.doneText, { color: c.onFill }]}>完成</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.divider, { backgroundColor: c.separator }]} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: c.label }]}>偶发随机提醒</Text>
            <Text style={[styles.hint, { color: c.tertiaryLabel }]}>
              白天不定时把旧感悟带回眼前
            </Text>
          </View>
          <Switch value={randomOn} onValueChange={onToggleRandom} trackColor={{ true: c.accent }} />
        </View>
      </View>

      <Text style={[styles.section, { color: c.secondaryLabel }]}>数据</Text>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <TouchableOpacity
          style={styles.action}
          onPress={() => runExport(exportAsText, '请稍后重试。')}
        >
          <Text style={[styles.actionTitle, { color: c.label }]}>导出为文本</Text>
          <Text style={[styles.hint, { color: c.tertiaryLabel }]}>
            好读的文字，可拷进备忘录、邮件等
          </Text>
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: c.separator }]} />
        <TouchableOpacity
          style={styles.action}
          onPress={() => runExport(exportAsBackupFile, '请稍后重试。')}
        >
          <Text style={[styles.actionTitle, { color: c.label }]}>导出完整备份（.json）</Text>
          <Text style={[styles.hint, { color: c.tertiaryLabel }]}>
            含全部字段，可「存储到文件」到 iCloud，将来可恢复
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: c.tertiaryLabel }]}>拾光 · 数据都存在你的设备上</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { borderRadius: radius.card, borderCurve: 'continuous', paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  rowLabel: { fontSize: 16 },
  value: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: spacing.xs },
  pickerWrap: { alignItems: 'center', paddingBottom: spacing.sm },
  doneBtn: {
    borderRadius: radius.button,
    borderCurve: 'continuous',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xs,
  },
  doneText: { fontSize: 15, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth },
  action: { paddingVertical: spacing.lg },
  actionTitle: { fontSize: 16 },
  footer: { textAlign: 'center', fontSize: 12, marginTop: spacing.xxl },
});
