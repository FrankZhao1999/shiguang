import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SEEDS, Seed } from '../seeds';
import { addSeedCards, getAddedSeedKeys } from '../db';
import { useColors, spacing, radius, useTabBarSpace } from '../theme';
import { haptic } from '../haptics';
import { PressableScale } from '../components/PressableScale';

// 灵感库：浏览一批普适的道理，挑喜欢的单条加入自己的记录库。
// 已加入过的会显示「已加入」，避免重复。去重以 seed.key 为准（见 db.addSeedCards）。
export default function SeedLibraryScreen() {
  const c = useColors();
  const tabSpace = useTabBarSpace();
  const [added, setAdded] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      getAddedSeedKeys().then((keys) => setAdded(new Set(keys)));
    }, [])
  );

  const sections = useMemo(() => {
    const map = new Map<string, Seed[]>();
    for (const s of SEEDS) {
      if (!map.has(s.theme)) map.set(s.theme, []);
      map.get(s.theme)!.push(s);
    }
    return Array.from(map, ([title, data]) => ({ title, data }));
  }, []);

  const add = useCallback(
    async (seed: Seed) => {
      if (added.has(seed.key)) return;
      haptic.light();
      await addSeedCards([seed]);
      setAdded((prev) => new Set(prev).add(seed.key));
    },
    [added]
  );

  return (
    <SectionList
      style={{ backgroundColor: c.background }}
      sections={sections}
      keyExtractor={(item) => item.key}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.list, { paddingBottom: tabSpace }]}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <Text style={[styles.intro, { color: c.secondaryLabel }]}>
          一些普适的道理。挑你有共鸣的加入自己的记录库，之后可自由编辑或删除。
        </Text>
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionTitle, { color: c.secondaryLabel }]}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => {
        const isAdded = added.has(item.key);
        return (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <View style={styles.cardTop}>
              <Text
                style={[styles.tag, { color: c.accent, backgroundColor: c.accentSoft }]}
              >
                {item.tag}
              </Text>
              <PressableScale
                style={[
                  styles.addBtn,
                  { backgroundColor: isAdded ? c.cardPressed : c.accentSoft },
                ]}
                onPress={() => add(item)}
              >
                <Text
                  style={[
                    styles.addBtnText,
                    { color: isAdded ? c.secondaryLabel : c.accent },
                  ]}
                >
                  {isAdded ? '✓ 已加入' : '＋ 加入'}
                </Text>
              </PressableScale>
            </View>
            <Text style={[styles.cardText, { color: c.label }]}>{item.text}</Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  intro: { fontSize: 14, lineHeight: 22, marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tag: {
    fontSize: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  addBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderCurve: 'continuous',
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },
  cardText: { fontSize: 16, lineHeight: 24 },
});
