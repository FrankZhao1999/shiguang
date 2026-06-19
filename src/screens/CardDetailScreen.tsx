import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { RootNav, RootStackParamList } from '../navigation';
import { getCard, deleteCard, getEdits, setImportant } from '../db';
import { deleteImage, getImages } from '../images';
import { Card, CardEdit } from '../types';
import { useColors, spacing, radius } from '../theme';
import { haptic } from '../haptics';
import { dateTime } from '../date';

export default function CardDetailScreen() {
  const navigation = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, 'CardDetail'>>();
  const c = useColors();
  const { id } = route.params;

  const [card, setCard] = useState<Card | null>(null);
  const [edits, setEdits] = useState<CardEdit[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCard(id).then(setCard);
      getEdits(id).then(setEdits);
    }, [id])
  );

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('AddCard', { id })}
            hitSlop={10}
          >
            <Text style={{ fontSize: 16, color: c.accent }}>编辑</Text>
          </TouchableOpacity>
        ),
      });
    }, [navigation, id, c.accent])
  );

  function confirmDelete() {
    Alert.alert('删除这条记录？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          haptic.warning();
          if (card) getImages(card).forEach((u) => deleteImage(u)); // 删掉所有配图文件
          await deleteCard(id);
          navigation.goBack();
        },
      },
    ]);
  }

  async function toggleImportant() {
    if (!card) return;
    const next = card.important ? 0 : 1;
    setCard({ ...card, important: next });
    haptic.selection();
    await setImportant(card.id, next === 1);
  }

  if (!card) return <View style={[styles.container, { backgroundColor: c.background }]} />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.xl }}
    >
      {card.tag ? (
        <Text style={[styles.tag, { color: c.accent, backgroundColor: c.accentSoft }]}>
          {card.tag}
        </Text>
      ) : null}
      <Text style={[styles.text, { color: c.label }]}>{card.text}</Text>
      {getImages(card).map((uri, i) => (
        <Image key={uri + i} source={{ uri }} style={styles.image} />
      ))}

      <TouchableOpacity
        style={[styles.starBtn, { borderColor: c.separator, backgroundColor: c.card }]}
        onPress={toggleImportant}
      >
        <Text style={{ fontSize: 14, color: card.important ? c.accent : c.secondaryLabel }}>
          {card.important ? '⭐️ 已标为重要' : '☆ 标为重要'}
        </Text>
      </TouchableOpacity>

      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: c.tertiaryLabel }]}>
          记于 {dateTime(card.createdAt)}
        </Text>
        {card.updatedAt ? (
          <Text style={[styles.metaText, { color: c.tertiaryLabel }]}>
            编辑于 {dateTime(card.updatedAt)}
          </Text>
        ) : null}
        <Text style={[styles.metaText, { color: c.tertiaryLabel }]}>
          回味 {card.reviewCount} 次{card.internalized ? ' · 已内化 🌳' : ''}
        </Text>
      </View>

      {edits.length > 0 ? (
        <View style={[styles.history, { borderTopColor: c.separator }]}>
          <Text style={[styles.historyTitle, { color: c.secondaryLabel }]}>
            编辑记录（{edits.length} 次）
          </Text>
          {edits.map((e) => (
            <View key={e.id} style={[styles.historyItem, { backgroundColor: c.card }]}>
              <Text style={[styles.historyTime, { color: c.tertiaryLabel }]}>
                {dateTime(e.editedAt)} 之前的版本
              </Text>
              {e.tag ? (
                <Text style={[styles.historyTag, { color: c.accent }]}>{e.tag}</Text>
              ) : null}
              <Text style={[styles.historyText, { color: c.secondaryLabel }]}>{e.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
        <Text style={styles.deleteText}>删除</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  text: { fontSize: 20, lineHeight: 32 },
  image: {
    width: '100%',
    height: 220,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    marginTop: spacing.xl,
  },
  starBtn: {
    marginTop: spacing.xxl,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  meta: { marginTop: spacing.xxl, gap: spacing.xs },
  metaText: { fontSize: 13 },
  history: { marginTop: spacing.xxl, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.lg },
  historyTitle: { fontSize: 13, marginBottom: spacing.md },
  historyItem: {
    borderRadius: radius.small,
    borderCurve: 'continuous',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyTime: { fontSize: 11, marginBottom: spacing.sm },
  historyTag: { alignSelf: 'flex-start', fontSize: 11, marginBottom: spacing.xs },
  historyText: { fontSize: 14, lineHeight: 21 },
  deleteBtn: { marginTop: spacing.xxxl, alignItems: 'center' },
  deleteText: { color: '#FF453A', fontSize: 15 },
});
