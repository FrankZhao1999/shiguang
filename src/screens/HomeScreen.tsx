import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { getAllCards } from '../db';
import { Card } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function HomeScreen({ navigation }: Props) {
  const [cards, setCards] = useState<Card[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllCards().then(setCards);
    }, [])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={cards}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => navigation.navigate('Review')}
          >
            <Text style={styles.reviewBtnText}>回味一张 ✨</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            还没有记录。{'\n'}下次有顿悟、有小确幸的瞬间，{'\n'}点右下角记下来吧。
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CardDetail', { id: item.id })}
          >
            <View style={styles.cardTop}>
              {item.tag ? <Text style={styles.tag}>{item.tag}</Text> : <View />}
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.cardText} numberOfLines={3}>
              {item.text}
            </Text>
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={styles.thumb} />
            ) : null}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCard')}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f4' },
  list: { padding: 16, paddingBottom: 96 },
  reviewBtn: {
    backgroundColor: '#2c2c2c',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 80,
    lineHeight: 24,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tag: {
    fontSize: 12,
    color: '#8a6d3b',
    backgroundColor: '#f3ead7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  date: { fontSize: 12, color: '#bbb' },
  cardText: { fontSize: 16, color: '#333', lineHeight: 24 },
  thumb: { width: '100%', height: 140, borderRadius: 10, marginTop: 10 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#c8a45c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36 },
});
