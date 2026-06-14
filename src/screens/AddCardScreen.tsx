import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { addCard, updateCard, getCard } from '../db';
import { persistImage } from '../images';

type Props = NativeStackScreenProps<RootStackParamList, 'AddCard'>;

// 几个常用主题，点一下就填上；也可以自己输入。
const SUGGESTED_TAGS = ['接纳', '专注', '关系', '感恩', '放下', '勇气'];

export default function AddCardScreen({ navigation, route }: Props) {
  const editId = route.params?.id ?? null;
  const isEdit = editId !== null;
  // 补记某天：editId 为空、date 有值时生效。
  const backfillDate = !isEdit ? route.params?.date ?? null : null;
  const isBackfill = backfillDate !== null;

  const [text, setText] = useState('');
  const [tag, setTag] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // 编辑模式：载入原内容预填，并把标题改成「编辑」。
  useEffect(() => {
    if (isEdit) {
      navigation.setOptions({ title: '编辑' });
      getCard(editId!).then((c) => {
        if (c) {
          setText(c.text);
          setTag(c.tag ?? '');
          setImageUri(c.imageUri);
        }
      });
    } else if (isBackfill) {
      navigation.setOptions({ title: '补记' });
    }
  }, [isEdit, editId, isBackfill, navigation]);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!res.canceled) {
      // 选完立刻复制进 app 自己的目录，避免日后原图被系统清理而丢失。
      setImageUri(persistImage(res.assets[0].uri));
    }
  }

  async function save() {
    if (!text.trim()) {
      Alert.alert('写点什么吧', '哪怕一句话，记下当时的感觉。');
      return;
    }
    if (isEdit) {
      await updateCard(editId!, text.trim(), tag.trim() || null, imageUri);
    } else if (isBackfill) {
      // 补记：用那天的中午 12 点作为时间，避免显示成 00:00。
      const d = new Date(backfillDate!);
      d.setHours(12, 0, 0, 0);
      await addCard(text.trim(), tag.trim() || null, imageUri, d.getTime());
    } else {
      await addCard(text.trim(), tag.trim() || null, imageUri);
    }
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {isBackfill ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              补记 {new Date(backfillDate!).getMonth() + 1}月
              {new Date(backfillDate!).getDate()}日
            </Text>
          </View>
        ) : null}
        <Text style={styles.label}>此刻的顿悟 / 小确幸</Text>
        <TextInput
          style={styles.textArea}
          placeholder="刚刚想到什么、感受到什么？用你自己的话写下来…"
          placeholderTextColor="#bbb"
          multiline
          autoFocus={!isEdit}
          value={text}
          onChangeText={setText}
        />

        <Text style={styles.label}>主题（可选）</Text>
        <View style={styles.tagRow}>
          {SUGGESTED_TAGS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tagChip, tag === t && styles.tagChipActive]}
              onPress={() => setTag(tag === t ? '' : t)}
            >
              <Text style={[styles.tagChipText, tag === t && styles.tagChipTextActive]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.tagInput}
          placeholder="或自定义一个主题…"
          placeholderTextColor="#bbb"
          value={tag}
          onChangeText={setTag}
        />

        <Text style={styles.label}>配图（可选）</Text>
        {imageUri ? (
          <TouchableOpacity onPress={pickImage}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
            <Text style={styles.imageBtnText}>＋ 添加一张图</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>
            {isEdit ? '保存修改' : isBackfill ? '补记下来' : '记下来'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f4', padding: 16 },
  banner: {
    backgroundColor: '#f3ead7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  bannerText: { color: '#8a6d3b', fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, color: '#999', marginTop: 18, marginBottom: 8 },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    minHeight: 140,
    fontSize: 17,
    lineHeight: 26,
    color: '#333',
    textAlignVertical: 'top',
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eadfca',
  },
  tagChipActive: { backgroundColor: '#c8a45c', borderColor: '#c8a45c' },
  tagChipText: { color: '#8a6d3b', fontSize: 14 },
  tagChipTextActive: { color: '#fff' },
  tagInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    fontSize: 15,
    color: '#333',
  },
  imageBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ddd',
  },
  imageBtnText: { color: '#999', fontSize: 15 },
  preview: { width: '100%', height: 200, borderRadius: 12 },
  saveBtn: {
    backgroundColor: '#2c2c2c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 40,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
