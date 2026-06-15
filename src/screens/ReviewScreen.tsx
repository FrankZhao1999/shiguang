import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootNav } from '../navigation';
import { selectCardForReview, markReviewed, markInternalized } from '../db';
import { Card } from '../types';
import { useColors, spacing, radius } from '../theme';
import { haptic } from '../haptics';
import { PressableScale } from '../components/PressableScale';

export default function ReviewScreen() {
  const navigation = useNavigation<RootNav>();
  const c = useColors();
  const [card, setCard] = useState<Card | null | undefined>(undefined); // undefined=加载中

  const loadNext = useCallback((excludeId?: number) => {
    selectCardForReview(excludeId).then(setCard);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNext();
    }, [loadNext])
  );

  async function onReviewed() {
    if (card) await markReviewed(card.id);
    haptic.success();
    navigation.goBack();
  }

  async function onInternalized() {
    if (card) await markInternalized(card.id);
    haptic.success();
    navigation.goBack();
  }

  if (card === undefined) {
    return <View style={[styles.container, { backgroundColor: c.background }]} />;
  }

  if (card === null) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.empty, { color: c.tertiaryLabel }]}>
          还没有可回味的记录。{'\n'}先去记下一个让你通透的瞬间吧。
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.hint, { color: c.tertiaryLabel }]}>你曾记下 ——</Text>
        {card.tag ? (
          <Text style={[styles.tag, { color: c.accent, backgroundColor: c.accentSoft }]}>
            {card.tag}
          </Text>
        ) : null}
        <Text style={[styles.text, { color: c.label }]}>{card.text}</Text>
        {card.imageUri ? (
          <Image source={{ uri: card.imageUri }} style={styles.image} />
        ) : null}
      </ScrollView>

      <View style={[styles.actions, { borderTopColor: c.separator }]}>
        <PressableScale style={[styles.primary, { backgroundColor: c.fill }]} onPress={onReviewed}>
          <Text style={[styles.primaryText, { color: c.onFill }]}>再体会 🌱</Text>
        </PressableScale>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondary, { backgroundColor: c.card, borderColor: c.separator }]}
            onPress={() => {
              haptic.selection();
              loadNext(card.id);
            }}
          >
            <Text style={[styles.secondaryText, { color: c.secondaryLabel }]}>换一张</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondary, { backgroundColor: c.card, borderColor: c.separator }]}
            onPress={onInternalized}
          >
            <Text style={[styles.secondaryText, { color: c.secondaryLabel }]}>已做到 🌳</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', lineHeight: 26, fontSize: 16 },
  content: { padding: spacing.xxl, paddingTop: 40, flexGrow: 1, justifyContent: 'center' },
  hint: { fontSize: 14, marginBottom: spacing.xl },
  tag: {
    alignSelf: 'flex-start',
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.small,
    borderCurve: 'continuous',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  text: { fontSize: 24, lineHeight: 38 },
  image: {
    width: '100%',
    height: 220,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    marginTop: spacing.xxl,
  },
  actions: { padding: spacing.lg, gap: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  primary: {
    borderRadius: radius.button,
    borderCurve: 'continuous',
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  primaryText: { fontSize: 16, fontWeight: '600' },
  secondary: {
    flex: 1,
    borderRadius: radius.button,
    borderCurve: 'continuous',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryText: { fontSize: 15 },
});
