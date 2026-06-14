import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { getAllCards } from '../db';
import { Card } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// 热力图：暖金色调，颜色越深当天记得越多。
const HEAT_COLORS = ['#efe9dd', '#e7d6a8', '#d9bb74', '#c8a45c', '#a9863f'];
const WEEKS_TO_SHOW = 20;
const CELL = 13;
const CELL_GAP = 3;

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayKeyOf(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayHeader(ms: number): string {
  const d = new Date(ms);
  const todayKey = dayKey(Date.now());
  const yestKey = dayKey(Date.now() - DAY);
  const k = dayKey(ms);
  const base = `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`;
  if (k === todayKey) return `今天 · ${base}`;
  if (k === yestKey) return `昨天 · ${base}`;
  return base;
}

function timeOf(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
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
  ms: number; // 当天 0 点的时间戳，补记时用
  count: number;
  future: boolean;
  firstOfMonth: number | null;
};

// 构建最近 WEEKS_TO_SHOW 周的网格：每列一周（周日~周六）。
function buildWeeks(counts: Record<string, number>): { weeks: HeatDay[][] } {
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
        // 用每周第一天（周日）判断是否进入新月份，给该列标月份。
        firstOfMonth: d === 0 ? cur.getMonth() : null,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(days);
  }
  return { weeks };
}

function Heatmap({
  counts,
  onPressDay,
}: {
  counts: Record<string, number>;
  onPressDay: (ms: number) => void;
}) {
  const { weeks } = useMemo(() => buildWeeks(counts), [counts]);

  // 每列上方的月份标签：月份变化时才显示，避免重复。
  let prevMonth = -1;
  const monthLabels = weeks.map((week) => {
    const m = week[0].firstOfMonth;
    if (m !== null && m !== prevMonth) {
      prevMonth = m;
      return MONTHS[m] + '月';
    }
    return '';
  });

  return (
    <View style={styles.heatCard}>
      <Text style={styles.heatTitle}>记录热力</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.monthRow}>
            {monthLabels.map((label, i) => (
              <Text key={i} style={styles.monthLabel}>
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
                      {
                        backgroundColor: day.future
                          ? 'transparent'
                          : HEAT_COLORS[heatLevel(day.count)],
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Text style={styles.legendText}>少</Text>
        {HEAT_COLORS.map((c, i) => (
          <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={styles.legendText}>多</Text>
        <Text style={styles.heatHint}>· 点格子可补记那天</Text>
      </View>
    </View>
  );
}

export default function TimelineScreen({ navigation }: Props) {
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

    for (const c of cards) {
      const k = dayKey(c.createdAt);
      days.add(k);
      countMap[k] = (countMap[k] || 0) + 1;
      if (indexByKey[k] === undefined) {
        indexByKey[k] = groups.length;
        groups.push({ title: dayHeader(c.createdAt), data: [] });
      }
      groups[indexByKey[k]].data.push(c);
    }

    return {
      sections: groups,
      counts: countMap,
      stats: { total: cards.length, days: days.size },
    };
  }, [cards]);

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            <Heatmap
              counts={counts}
              onPressDay={(ms) => navigation.navigate('AddCard', { date: ms })}
            />
            <View style={styles.statsBar}>
              <Stat value={stats.days} label="记录天数" />
              <View style={styles.divider} />
              <Stat value={stats.total} label="累计条数" />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>还没有记录。{'\n'}从今天开始，记下第一个瞬间吧。</Text>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length} 条</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('CardDetail', { id: item.id })}
          >
            <Text style={styles.time}>{timeOf(item.createdAt)}</Text>
            <View style={styles.rowBody}>
              {item.tag ? <Text style={styles.tag}>{item.tag}</Text> : null}
              <Text style={styles.rowText} numberOfLines={2}>
                {item.text}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f4' },
  list: { padding: 16, paddingBottom: 40 },

  heatCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  heatTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 12 },
  monthRow: { flexDirection: 'row', marginBottom: 4 },
  monthLabel: { width: CELL + CELL_GAP, fontSize: 9, color: '#bbb' },
  grid: { flexDirection: 'row' },
  weekCol: { marginRight: CELL_GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3, marginBottom: CELL_GAP },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 },
  legendText: { fontSize: 10, color: '#bbb' },
  legendCell: { width: 11, height: 11, borderRadius: 2 },
  heatHint: { fontSize: 10, color: '#c8a45c', marginLeft: 4 },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 4,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#c8a45c' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  divider: { width: 1, height: 28, backgroundColor: '#eee' },

  empty: { textAlign: 'center', color: '#999', marginTop: 60, lineHeight: 24, fontSize: 15 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#555' },
  sectionCount: { fontSize: 12, color: '#bbb' },
  row: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  time: { fontSize: 13, color: '#c8a45c', fontWeight: '600', width: 48, marginTop: 1 },
  rowBody: { flex: 1 },
  tag: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: '#8a6d3b',
    backgroundColor: '#f3ead7',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 5,
  },
  rowText: { fontSize: 15, color: '#333', lineHeight: 22 },
});
