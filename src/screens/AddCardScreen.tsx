import React, { useEffect, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootNav, RootStackParamList } from '../navigation';
import { addCard, updateCard, getCard } from '../db';
import { persistImage, getImages } from '../images';
import { useColors, spacing, radius } from '../theme';
import { haptic } from '../haptics';
import { PressableScale } from '../components/PressableScale';

const SUGGESTED_TAGS = ['感悟', '备忘', '行动'];

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
  const [images, setImages] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const baseTextRef = useRef(''); // 开始语音前的已有文字，识别结果接在它后面

  // —— 语音识别事件 ——
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript ?? '';
    const base = baseTextRef.current;
    setText(base ? `${base} ${transcript}` : transcript);
  });
  useSpeechRecognitionEvent('end', () => setRecording(false));
  useSpeechRecognitionEvent('error', (event) => {
    setRecording(false);
    if (event.error !== 'aborted') {
      Alert.alert('语音识别中断', '请重试，或在系统设置里检查麦克风/语音识别权限。');
    }
  });

  // 离开页面时停止识别，避免后台还在录。
  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {}
    };
  }, []);

  async function toggleVoice() {
    if (recording) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('需要权限', '请在系统「设置」里允许「拾光」使用麦克风与语音识别。');
      return;
    }
    baseTextRef.current = text.trim();
    setRecording(true);
    haptic.light();
    ExpoSpeechRecognitionModule.start({
      lang: 'zh-CN',
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: true, // 设备端识别，不上云
    });
  }

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
          setImages(getImages(card));
        }
      });
    }
  }, [isEdit, isBackfill, editId, navigation, c.accent]);

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 9,
      quality: 0.6,
    });
    if (!res.canceled) {
      const added = res.assets.map((a) => persistImage(a.uri));
      setImages((prev) => [...prev, ...added]);
    }
  }

  function removeImage(uri: string) {
    setImages((prev) => prev.filter((u) => u !== uri));
  }

  async function save() {
    if (!text.trim()) {
      Alert.alert('写点什么吧', '哪怕一句话，记下当时的感觉。');
      return;
    }
    if (isEdit) {
      await updateCard(editId!, text.trim(), tag.trim() || null, images);
    } else if (isBackfill) {
      const d = new Date(backfillDate!);
      d.setHours(12, 0, 0, 0);
      await addCard(text.trim(), tag.trim() || null, images, d.getTime());
    } else {
      await addCard(text.trim(), tag.trim() || null, images);
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

        <TouchableOpacity
          style={[
            styles.voiceBtn,
            { borderColor: recording ? '#FF453A' : c.separator, backgroundColor: c.card },
          ]}
          onPress={toggleVoice}
        >
          <Ionicons
            name={recording ? 'stop-circle' : 'mic-outline'}
            size={18}
            color={recording ? '#FF453A' : c.accent}
          />
          <Text
            style={{
              color: recording ? '#FF453A' : c.secondaryLabel,
              fontSize: 14,
              marginLeft: 6,
            }}
          >
            {recording ? '正在听… 点此停止' : '语音输入'}
          </Text>
        </TouchableOpacity>

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

        <Text style={[styles.label, { color: c.secondaryLabel }]}>配图（可选，可多张）</Text>
        <View style={styles.imageRow}>
          {images.map((uri) => (
            <View key={uri} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} />
              <TouchableOpacity
                style={[styles.removeBtn, { backgroundColor: c.fill }]}
                onPress={() => removeImage(uri)}
                hitSlop={8}
              >
                <Text style={{ color: c.onFill, fontSize: 13, lineHeight: 15 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addTile, { borderColor: c.separator }]}
            onPress={pickImage}
          >
            <Text style={{ color: c.tertiaryLabel, fontSize: 28 }}>＋</Text>
          </TouchableOpacity>
        </View>

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
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    marginTop: spacing.md,
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
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { position: 'relative' },
  thumb: { width: 84, height: 84, borderRadius: radius.small, borderCurve: 'continuous' },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: 84,
    height: 84,
    borderRadius: radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
