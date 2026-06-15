import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Card } from './types';
import { getAllCards } from './db';
import { dayKey, longDate, timeOf } from './date';

// 拼成一份好读的文本，按天分组，适合拷进备忘录或存成文件。
function buildExportText(cards: Card[]): string {
  const now = new Date();
  const header =
    `拾光 · 我的记录\n` +
    `导出于 ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ` +
    `${timeOf(now.getTime())} · 共 ${cards.length} 条\n`;

  // cards 已按时间倒序，按天分组。
  const lines: string[] = [header];
  let lastDay = '';
  for (const c of cards) {
    const k = dayKey(c.createdAt);
    if (k !== lastDay) {
      lastDay = k;
      lines.push(`\n── ${longDate(c.createdAt)} ──`);
    }
    const star = c.important ? '⭐️ ' : '';
    const tag = c.tag ? `【${c.tag}】` : '';
    lines.push(`\n${timeOf(c.createdAt)} ${star}${tag}\n${c.text}`);
  }
  return lines.join('\n');
}

// 完整备份：保留所有字段，将来可原样恢复。
function buildExportJson(cards: Card[]): string {
  return JSON.stringify(
    { app: 'lucid-shiguang', version: 1, exportedAt: Date.now(), cards },
    null,
    2
  );
}

// 导出为可读文本：走系统分享，可选「备忘录 / 拷贝 / 邮件…」。
export async function exportAsText(): Promise<void> {
  const cards = await getAllCards();
  const text = buildExportText(cards);
  await Share.share({ message: text, title: '拾光 · 我的记录' });
}

// 导出完整备份文件（.json）：写到缓存目录再走系统分享，可「存储到文件」到 iCloud。
export async function exportAsBackupFile(): Promise<void> {
  const cards = await getAllCards();
  const json = buildExportJson(cards);

  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `shiguang-backup-${stamp}.json`);
  file.create({ overwrite: true });
  file.write(json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: '保存拾光备份',
      UTI: 'public.json',
    });
  } else {
    // 极少数不支持系统分享的情况，退回文本分享。
    await Share.share({ message: json, title: '拾光备份' });
  }
}
