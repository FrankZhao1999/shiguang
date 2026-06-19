import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootNav } from '../navigation';
import { getAllCards } from '../db';
import { getImages } from '../images';
import { Card } from '../types';
import { useColors, spacing, radius, useTabBarSpace } from '../theme';
import { shortDate } from '../date';
import { haptic } from '../haptics';
import { PressableScale } from '../components/PressableScale';

export default function HomeScreen() {
  const navigation = useNavigation<RootNav>();
  const c = useColors();
  const tabSpace = useTabBarSpace();
  const [cards, setCards] = useState<Card[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllCards().then(setCards);
    }, [])
  );

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      data={cards}
      keyExtractor={(item) => String(item.id)}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.list, { paddingBottom: tabSpace }]}
      ListHeaderComponent={
        <PressableScale
          style={[styles.reviewBtn, { backgroundColor: c.fill }]}
          onPress={() => {
            haptic.light();
            navigation.navigate('Review');
          }}
        >
          <Text style={[styles.reviewBtnText, { color: c.onFill }]}>拾起一条</Text>
        </PressableScale>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: c.tertiaryLabel }]}>
          还没有记录。{'\n'}下次有顿悟、有小确幸的瞬间，{'\n'}点右上角记下来吧。
        </Text>
      }
      renderItem={({ item }) => {
        const images = getImages(item);
        return (
        <PressableScale
          style={[styles.card, { backgroundColor: c.card }]}
          onPress={() => navigation.navigate('CardDetail', { id: item.id })}
        >
          <View style={styles.cardTop}>
            {item.tag ? (
              <Text style={[styles.tag, { color: c.accent, backgroundColor: c.accentSoft }]}>
                {item.tag}
              </Text>
            ) : (
              <View />
            )}
            <Text style={[styles.date, { color: c.tertiaryLabel }]}>
              {item.important ? '⭐️ ' : ''}
              {shortDate(item.createdAt)}
            </Text>
          </View>
          <Text style={[styles.cardText, { color: c.label }]} numberOfLines={3}>
            {item.text}
          </Text>
          {images.length > 0 ? (
            <View style={styles.thumbWrap}>
              <Image source={{ uri: images[0] }} style={styles.thumb} />
              {images.length > 1 ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>+{images.length - 1}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </PressableScale>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  reviewBtn: {
    borderRadius: radius.button,
    borderCurve: 'continuous',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  reviewBtnText: { fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 80, lineHeight: 24, fontSize: 15 },
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
  date: { fontSize: 12 },
  cardText: { fontSize: 16, lineHeight: 24 },
  thumbWrap: { position: 'relative', marginTop: spacing.md },
  thumb: {
    width: '100%',
    height: 140,
    borderRadius: radius.small,
    borderCurve: 'continuous',
  },
  countBadge: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
