import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { selectCardForReview, markReviewed, markInternalized } from '../db';
import { Card } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

export default function ReviewScreen({ navigation }: Props) {
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
    navigation.goBack();
  }

  async function onInternalized() {
    if (card) await markInternalized(card.id);
    navigation.goBack();
  }

  if (card === undefined) {
    return <View style={styles.container} />;
  }

  if (card === null) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.empty}>
          还没有可回味的记录。{'\n'}先去记下一个让你通透的瞬间吧。
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>你曾记下 ——</Text>
        {card.tag ? <Text style={styles.tag}>{card.tag}</Text> : null}
        <Text style={styles.text}>{card.text}</Text>
        {card.imageUri ? (
          <Image source={{ uri: card.imageUri }} style={styles.image} />
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} onPress={onReviewed}>
          <Text style={styles.primaryText}>再体会 🌱</Text>
        </TouchableOpacity>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => loadNext(card.id)}
          >
            <Text style={styles.secondaryText}>换一张</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={onInternalized}>
            <Text style={styles.secondaryText}>已做到 🌳</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f4' },
  center: { alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#999', lineHeight: 26, fontSize: 16 },
  content: { padding: 28, paddingTop: 60, flexGrow: 1, justifyContent: 'center' },
  hint: { fontSize: 14, color: '#bbb', marginBottom: 20 },
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
  text: { fontSize: 24, lineHeight: 38, color: '#2c2c2c' },
  image: { width: '100%', height: 220, borderRadius: 14, marginTop: 24 },
  actions: {
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  primary: {
    backgroundColor: '#2c2c2c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5ddcf',
  },
  secondaryText: { color: '#666', fontSize: 15 },
});
