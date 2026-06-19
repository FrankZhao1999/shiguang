// 一张「感悟卡」：记录一个顿悟 / 通透 / 小确幸的瞬间。
// 字段里特意预留了 distilled（将来给 AI 提炼）和 audioUri（将来给语音），
// 现在先空着 —— 这样以后加功能不用改数据结构。
export interface Card {
  id: number;
  text: string; // 你的原话，保住当时最真实的味道
  tag: string | null; // 主题标签，如「感悟」「备忘」「行动」
  imageUri: string | null; // 旧版单图字段（保留以兼容老数据）
  imageUris: string | null; // 多图：JSON 字符串数组；新数据写这里
  createdAt: number; // 记录时间，epoch 毫秒

  // —— 内化算法用 ——
  updatedAt: number | null; // 最近一次编辑时间；从未编辑则为 null

  important: number; // 0/1，手动标记「重要」后被推送的权重更高
  maturity: number; // 成熟度 0..N，越高代表越内化，被推送的几率越低
  reviewCount: number; // 被回味过几次
  lastShownAt: number | null; // 上次出现时间
  nextEligibleAt: number; // 下次可被选中的最早时间
  internalized: number; // 0/1，标记「已做到」后基本不再打扰

  // —— 预留字段，先空着 ——
  distilled: string | null; // 将来 AI 提炼出的核心金句
  audioUri: string | null; // 将来的语音记录
}

// 一次编辑前的「快照」：保留改动前的原文与主题，便于回看历史。
export interface CardEdit {
  id: number;
  cardId: number;
  text: string; // 编辑前的内容
  tag: string | null; // 编辑前的主题
  editedAt: number; // 这次编辑发生的时间
}
