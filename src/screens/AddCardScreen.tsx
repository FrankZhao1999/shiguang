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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootNav, RootStackParamList } from '../navigation';
import { addCard, updateCard, getCard } from '../db';
import { persistImage } from '../images';
import { useColors, spacing, radius } from '../theme';
import { haptic } from '../haptics';
import { PressableScale } from '../components/PressableScale';

const SUGGESTED_TAGS = ['接纳', '专注', '关系', '感恩', '放下', '勇气'];

export default function AddCardScreen() {
  const navigation = useNavigation<RootNav>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddCard'>>();
  const c = useColors();

  const editId = route.params?.id ?? null;
  const isEdit = editId !== null;
  const backfillDate = !isEdit ? route.params?.date ?? null : null;
  const isBackfill = backfillDate !== null;

  const [text, setText] = useState('');
  const [tag, setTag] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? '编辑' : isBackfill ? '补记' : '记一笔',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={{ fontSize: 16, color: c.accent }}>取消</Text>
        </TouchableOpacity>
      ),
    });
    if (isEdit) {
      getCard(editId!).then((card) => {
        if (card) {
          setText(card.text);
          setTag(card.tag ?? '');
          setImageUri(card.imageUri);
        }
      });
    }
  }, [isEdit, isBackfill, editId, navigation, c.accent]);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!res.canceled) setImageUri(persistImage(res.assets[0].uri));
  }

  async function save() {
    if (!text.trim()) {
      Alert.alert('写点什么吧', '哪怕一句话，记下当时的感觉。');
      return;
    }
    if (isEdit) {
      await updateCard(editId!, text.trim(), tag.trim() || null, imageUri);
    } else if (isBackfill) {
      const d = new Date(backfillDate!);
      d.setHours(12, 0, 0, 0);
      await addCard(text.trim(), tag.trim() || null, imageUri, d.getTime());
    } else {
      await addCard(text.trim(), tag.trim() || null, imageUri);
    }
    haptic.success();
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {isBackfill ? (
          <View style={[styles.banner, { backgroundColor: c.accentSoft }]}>
            <Text style={[styles.bannerText, { color: c.accent }]}>
              补记 {new Date(backfillDate!).getMonth() + 1}月
              {new Date(backfillDate!).getDate()}日
            </Text>
          </View>
        ) : null}

        <Text style={[styles.label, { color: c.secondaryLabel }]}>此刻的顿悟 / 小确幸</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: c.card, color: c.label }]}
          placeholder="刚刚想到什么、感受到什么？用你自己的话写下来…"
          placeholderTextColor={c.tertiaryLabel}
          multiline
          autoFocus={!isEdit}
          value={text}
          onChangeText={setText}
        />

        <Text style={[styles.label, { color: c.secondaryLabel }]}>主题（可选）</Text>
        <View style={styles.tagRow}>
          {SUGGESTED_TAGS.map((t) => {
            const active = tag === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  haptic.selection();
                  setTag(active ? '' : t);
                }}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: active ? c.accent : c.card,
                    borderColor: active ? c.accent : c.separator,
                  },
                ]}
              >
                <Text style={{ color: active ? c.onFill : c.secondaryLabel, fontSize: 14 }}>
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          style={[styles.tagInput, { backgroundColor: c.card, color: c.label }]}
          placeholder="或自定义一个主题…"
          placeholderTextColor={c.tertiaryLabel}
          value={tag}
          onChangeText={setTag}
        />

        <Text style={[styles.label, { color: c.secondaryLabel }]}>配图（可选）</Text>
        {imageUri ? (
          <TouchableOpacity onPress={pickImage}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.imageBtn, { borderColor: c.separator }]}
            onPress={pickImage}
          >
            <Text style={{ color: c.tertiaryLabel, fontSize: 15 }}>＋ 添加一张图</Text>
          </TouchableOpacity>
        )}

        <PressableScale style={[styles.saveBtn, { backgroundColor: c.fill }]} onPress={save}>
          <Text style={[styles.saveBtnText, { color: c.onFill }]}>
            {isEdit ? '保存修改' : isBackfill ? '补记下来' : '记下来'}
          </Text>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    borderRadius: radius.small,
    borderCurve: 'continuous',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bannerText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, marginTop: spacing.lg, marginBottom: spacing.sm },
  textArea: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    minHeight: 140,
    fontSize: 17,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  tagInput: {
    borderRadius: radius.small,
    borderCurve: 'continuous',
    padding: spacing.md,
    marginTop: spacing.sm,
    fontSize: 15,
  },
  imageBtn: {
    borderRadius: radius.small,
    borderCurve: 'continuous',
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  preview: { width: '100%', height: 200, borderRadius: radius.card, borderCurve: 'continuous' },
  saveBtn: {
    borderRadius: radius.button,
    borderCurve: 'continuous',
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
});
