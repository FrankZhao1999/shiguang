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
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { getCard, deleteCard, getEdits } from '../db';
import { deleteImage } from '../images';
import { Card, CardEdit } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CardDetail'>;

function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

export default function CardDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [card, setCard] = useState<Card | null>(null);
  const [edits, setEdits] = useState<CardEdit[]>([]);

  useFocusEffect(
    useCallback(() => {
      getCard(id).then(setCard);
      getEdits(id).then(setEdits);
    }, [id])
  );

  // 右上角放「编辑」入口。
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate('AddCard', { id })}>
            <Text style={styles.editBtn}>编辑</Text>
          </TouchableOpacity>
        ),
      });
    }, [navigation, id])
  );

  function confirmDelete() {
    Alert.alert('删除这条记录？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          deleteImage(card?.imageUri ?? null); // 顺手删掉配图文件，不留垃圾
          await deleteCard(id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!card) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {card.tag ? <Text style={styles.tag}>{card.tag}</Text> : null}
      <Text style={styles.text}>{card.text}</Text>
      {card.imageUri ? (
        <Image source={{ uri: card.imageUri }} style={styles.image} />
      ) : null}

      <View style={styles.meta}>
        <Text style={styles.metaText}>记于 {formatDateTime(card.createdAt)}</Text>
        {card.updatedAt ? (
          <Text style={styles.metaText}>编辑于 {formatDateTime(card.updatedAt)}</Text>
        ) : null}
        <Text style={styles.metaText}>
          回味 {card.reviewCount} 次
          {card.internalized ? ' · 已内化 🌳' : ''}
        </Text>
      </View>

      {edits.length > 0 ? (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>编辑记录（{edits.length} 次）</Text>
          {edits.map((e) => (
            <View key={e.id} style={styles.historyItem}>
              <Text style={styles.historyTime}>
                {formatDateTime(e.editedAt)} 之前的版本
              </Text>
              {e.tag ? <Text style={styles.historyTag}>{e.tag}</Text> : null}
              <Text style={styles.historyText}>{e.text}</Text>
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
  container: { flex: 1, backgroundColor: '#faf8f4' },
  tag: {
    alignSelf: 'flex-start',
    fontSize: 13,
    color: '#8a6d3b',
    backgroundColor: '#f3ead7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  text: { fontSize: 20, lineHeight: 32, color: '#2c2c2c' },
  image: { width: '100%', height: 220, borderRadius: 14, marginTop: 20 },
  meta: { marginTop: 28, gap: 4 },
  metaText: { fontSize: 13, color: '#aaa' },
  editBtn: { fontSize: 15, color: '#c8a45c' },
  history: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 18,
  },
  historyTitle: { fontSize: 13, color: '#999', marginBottom: 12 },
  historyItem: {
    backgroundColor: '#f4f0e8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  historyTime: { fontSize: 11, color: '#b3a98f', marginBottom: 6 },
  historyTag: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: '#8a6d3b',
    marginBottom: 4,
  },
  historyText: { fontSize: 14, color: '#666', lineHeight: 21 },
  deleteBtn: { marginTop: 40, alignItems: 'center' },
  deleteText: { color: '#c0654f', fontSize: 15 },
});
