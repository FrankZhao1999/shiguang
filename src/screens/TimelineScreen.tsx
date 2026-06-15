import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootNav } from '../navigation';
import { getAllCards } from '../db';
import { Card } from '../types';
import { useColors, spacing, radius, TAB_BAR_INSET, Palette } from '../theme';
import { dayKey, dayKeyOf, dayHeader, timeOf } from '../date';

const WEEKS_TO_SHOW = 20;
const CELL = 13;
const CELL_GAP = 3;

// 暖金色热力梯度，浅/深色各一套；index 0 为「当天无记录」的底色。
function heatColors(c: Palette): string[] {
  return c.scheme === 'dark'
    ? ['#2C2C2E', '#5C4E2E', '#867039', '#B59A4E', '#D9BD7C']
    : ['#EAE4D6', '#E0C98B', '#CFAE63', '#B8923F', '#8A6D3B'];
}

function heatLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

type HeatDay = {
  key: string;
  ms: number;
  count: number;
  future: boolean;
  firstOfMonth: number | null;
};

function buildWeeks(counts: Record<string, number>): HeatDay[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - (WEEKS_TO_SHOW - 1) * 7);

  const weeks: HeatDay[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < WEEKS_TO_SHOW; w++) {
    const days: HeatDay[] = [];
    for (let d = 0; d < 7; d++) {
      const k = dayKeyOf(cur);
      days.push({
        key: k,
        ms: cur.getTime(),
        count: counts[k] || 0,
        future: cur.getTime() > today.getTime(),
        firstOfMonth: d === 0 ? cur.getMonth() : null,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
}

function Heatmap({
  counts,
  c,
  onPressDay,
}: {
  counts: Record<string, number>;
  c: Palette;
  onPressDay: (ms: number) => void;
}) {
  const weeks = useMemo(() => buildWeeks(counts), [counts]);
  const colors = heatColors(c);

  let prevMonth = -1;
  const monthLabels = weeks.map((week) => {
    const m = week[0].firstOfMonth;
    if (m !== null && m !== prevMonth) {
      prevMonth = m;
      return `${m + 1}月`;
    }
    return '';
  });

  return (
    <View style={[styles.heatCard, { backgroundColor: c.card }]}>
      <Text style={[styles.heatTitle, { color: c.secondaryLabel }]}>记录热力</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.monthRow}>
            {monthLabels.map((label, i) => (
              <Text key={i} style={[styles.monthLabel, { color: c.tertiaryLabel }]}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekCol}>
                {week.map((day) => (
                  <TouchableOpacity
                    key={day.key}
                    disabled={day.future}
                    onPress={() => onPressDay(day.ms)}
                    style={[
                      styles.cell,
                      { backgroundColor: day.future ? 'transparent' : colors[heatLevel(day.count)] },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: c.tertiaryLabel }]}>少</Text>
        {colors.map((col, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: col }]} />
        ))}
        <Text style={[styles.legendText, { color: c.tertiaryLabel }]}>多</Text>
        <Text style={[styles.heatHint, { color: c.accent }]}>· 点格子可补记那天</Text>
      </View>
    </View>
  );
}

export default function TimelineScreen() {
  const navigation = useNavigation<RootNav>();
  const c = useColors();
  const [cards, setCards] = useState<Card[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllCards().then(setCards);
    }, [])
  );

  const { sections, stats, counts } = useMemo(() => {
    const groups: { title: string; data: Card[] }[] = [];
    const indexByKey: Record<string, number> = {};
    const days = new Set<string>();
    const countMap: Record<string, number> = {};

    for (const card of cards) {
      const k = dayKey(card.createdAt);
      days.add(k);
      countMap[k] = (countMap[k] || 0) + 1;
      if (indexByKey[k] === undefined) {
        indexByKey[k] = groups.length;
        groups.push({ title: dayHeader(card.createdAt), data: [] });
      }
      groups[indexByKey[k]].data.push(card);
    }

    return {
      sections: groups,
      counts: countMap,
      stats: { total: cards.length, days: days.size },
    };
  }, [cards]);

  return (
    <SectionList
      style={{ backgroundColor: c.background }}
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_INSET }]}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View>
          <Heatmap
            counts={counts}
            c={c}
            onPressDay={(ms) => navigation.navigate('AddCard', { date: ms })}
          />
          <View style={[styles.statsBar, { backgroundColor: c.card }]}>
            <Stat value={stats.days} label="记录天数" c={c} />
            <View style={[styles.divider, { backgroundColor: c.separator }]} />
            <Stat value={stats.total} label="累计条数" c={c} />
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: c.tertiaryLabel }]}>
          还没有记录。{'\n'}从今天开始，记下第一个瞬间吧。
        </Text>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.secondaryLabel }]}>{section.title}</Text>
          <Text style={[styles.sectionCount, { color: c.tertiaryLabel }]}>
            {section.data.length} 条
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.row, { backgroundColor: c.card }]}
          onPress={() => navigation.navigate('CardDetail', { id: item.id })}
        >
          <Text style={[styles.time, { color: c.accent }]}>{timeOf(item.createdAt)}</Text>
          <View style={styles.rowBody}>
            {item.tag ? (
              <Text style={[styles.tag, { color: c.accent, backgroundColor: c.accentSoft }]}>
                {item.tag}
              </Text>
            ) : null}
            <Text style={[styles.rowText, { color: c.label }]} numberOfLines={2}>
              {item.important ? '⭐️ ' : ''}
              {item.text}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

function Stat({ value, label, c }: { value: number; label: string; c: Palette }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: c.accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.tertiaryLabel }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  heatCard: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heatTitle: { fontSize: 14, fontWeight: '600', marginBottom: spacing.md },
  monthRow: { flexDirection: 'row', marginBottom: spacing.xs },
  monthLabel: { width: CELL + CELL_GAP, fontSize: 9 },
  grid: { flexDirection: 'row' },
  weekCol: { marginRight: CELL_GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3, marginBottom: CELL_GAP },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.xs },
  legendText: { fontSize: 10 },
  legendCell: { width: 11, height: 11, borderRadius: 2 },
  heatHint: { fontSize: 10, marginLeft: spacing.xs },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xs,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: spacing.xs },
  divider: { width: StyleSheet.hairlineWidth, height: 28 },
  empty: { textAlign: 'center', marginTop: 60, lineHeight: 24, fontSize: 15 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  sectionCount: { fontSize: 12 },
  row: {
    flexDirection: 'row',
    borderRadius: radius.small,
    borderCurve: 'continuous',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  time: { fontSize: 13, fontWeight: '600', width: 48, marginTop: 1 },
  rowBody: { flex: 1 },
  tag: {
    alignSelf: 'flex-start',
    fontSize: 11,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 7,
    borderCurve: 'continuous',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  rowText: { fontSize: 15, lineHeight: 22 },
});
