import * as SQLite from 'expo-sqlite';
import { Card, CardEdit } from './types';

const DAY = 24 * 60 * 60 * 1000;

// 成熟度 -> 下次出现的间隔（天）。像背单词：越内化，间隔越长。
const INTERVALS_DAYS = [1, 3, 7, 16, 35, 75];

function intervalFor(maturity: number): number {
  const i = Math.min(maturity, INTERVALS_DAYS.length - 1);
  return INTERVALS_DAYS[i] * DAY;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('lucid.db');
  }
  return dbPromise;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      tag TEXT,
      imageUri TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER,
      important INTEGER NOT NULL DEFAULT 0,
      maturity INTEGER NOT NULL DEFAULT 0,
      reviewCount INTEGER NOT NULL DEFAULT 0,
      lastShownAt INTEGER,
      nextEligibleAt INTEGER NOT NULL,
      internalized INTEGER NOT NULL DEFAULT 0,
      distilled TEXT,
      audioUri TEXT
    );
    CREATE TABLE IF NOT EXISTS card_edits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cardId INTEGER NOT NULL,
      text TEXT NOT NULL,
      tag TEXT,
      editedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  // 平滑迁移：老库可能缺这些列，缺了就补上（已存在会抛错，忽略即可）。
  await db.execAsync('ALTER TABLE cards ADD COLUMN updatedAt INTEGER').catch(() => {});
  await db
    .execAsync('ALTER TABLE cards ADD COLUMN important INTEGER NOT NULL DEFAULT 0')
    .catch(() => {});
}

// —— 偏好设置（键值对，存在本地）——
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row ? row.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    key,
    value,
    value
  );
}

export async function addCard(
  text: string,
  tag: string | null,
  imageUri: string | null,
  createdAt?: number // 补记过去某天时传入；不传则用当前时间
): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO cards (text, tag, imageUri, createdAt, nextEligibleAt)
     VALUES (?, ?, ?, ?, ?)`,
    text,
    tag,
    imageUri,
    createdAt ?? now,
    now // 不论记于哪天，从现在起就有资格被推送回味
  );
}

export async function getAllCards(): Promise<Card[]> {
  const db = await getDb();
  return db.getAllAsync<Card>('SELECT * FROM cards ORDER BY createdAt DESC');
}

export async function getCard(id: number): Promise<Card | null> {
  const db = await getDb();
  return db.getFirstAsync<Card>('SELECT * FROM cards WHERE id = ?', id);
}

export async function deleteCard(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM card_edits WHERE cardId = ?', id);
  await db.runAsync('DELETE FROM cards WHERE id = ?', id);
}

// 编辑一张已有的卡：先把「改动前」的内容存进历史表，再覆盖新内容。
// 这样每次编辑都留痕，可随时回看原来写了什么。
export async function updateCard(
  id: number,
  text: string,
  tag: string | null,
  imageUri: string | null
): Promise<void> {
  const db = await getDb();
  const card = await getCard(id);
  if (!card) return;
  const now = Date.now();
  // 只有内容或主题真的变了才记一条历史，避免无谓留痕。
  if (card.text !== text || card.tag !== tag) {
    await db.runAsync(
      'INSERT INTO card_edits (cardId, text, tag, editedAt) VALUES (?, ?, ?, ?)',
      id,
      card.text,
      card.tag,
      now
    );
  }
  await db.runAsync(
    'UPDATE cards SET text = ?, tag = ?, imageUri = ?, updatedAt = ? WHERE id = ?',
    text,
    tag,
    imageUri,
    now,
    id
  );
}

// 取某张卡的编辑历史，最近的在前。
export async function getEdits(cardId: number): Promise<CardEdit[]> {
  const db = await getDb();
  return db.getAllAsync<CardEdit>(
    'SELECT * FROM card_edits WHERE cardId = ? ORDER BY editedAt DESC',
    cardId
  );
}

// 标记/取消「重要」。重要的卡在回味推送里权重更高。
export async function setImportant(id: number, important: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE cards SET important = ? WHERE id = ?', important ? 1 : 0, id);
}

const IMPORTANT_BOOST = 4; // 标了「重要」的卡，被选中的权重放大 4 倍

// 按成熟度加权随机挑一张：成熟度越低（越新、越没内化）权重越高；
// 标了「重要」的再额外加权，让你更在意的感悟更常回到眼前。
function weightedPick(pool: Card[]): Card {
  const weights = pool.map(
    (c) => (1 / (c.maturity + 1)) * (c.important ? IMPORTANT_BOOST : 1)
  );
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// 选卡算法：优先「到期 + 未内化」，逐级放宽。
// 传入 excludeId（点「换一张」）时，优先翻出任何一张别的卡 —— 哪怕它还没到期，
// 也好过死守规则、反复显示同一张；只有全库就这一张时才退回它自己。
export async function selectCardForReview(excludeId?: number): Promise<Card | null> {
  const db = await getDb();
  const now = Date.now();

  const stages: (() => Promise<Card[]>)[] = [
    () =>
      db.getAllAsync<Card>(
        'SELECT * FROM cards WHERE internalized = 0 AND nextEligibleAt <= ?',
        now
      ),
    () => db.getAllAsync<Card>('SELECT * FROM cards WHERE internalized = 0'),
    () => db.getAllAsync<Card>('SELECT * FROM cards'),
  ];

  for (const run of stages) {
    let pool = await run();
    if (excludeId != null) pool = pool.filter((c) => c.id !== excludeId);
    if (pool.length > 0) return weightedPick(pool);
  }

  // 各级都没有「别的」卡了，说明全库就这一张，那就还显示它。
  if (excludeId != null) return selectCardForReview();
  return null;
}

// 「回味了」：成熟度 +1，把下次出现时间往后推。
export async function markReviewed(id: number): Promise<void> {
  const db = await getDb();
  const card = await getCard(id);
  if (!card) return;
  const now = Date.now();
  const maturity = card.maturity + 1;
  await db.runAsync(
    `UPDATE cards
     SET maturity = ?, reviewCount = reviewCount + 1, lastShownAt = ?, nextEligibleAt = ?
     WHERE id = ?`,
    maturity,
    now,
    now + intervalFor(maturity),
    id
  );
}

// 「已内化」：基本不再打扰。
export async function markInternalized(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE cards SET internalized = 1, lastShownAt = ? WHERE id = ?',
    Date.now(),
    id
  );
}
