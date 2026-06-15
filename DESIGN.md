# 拾光 · 设计说明书

一份「产品 + 功能 + 数据结构 + 视觉风格」合一的开发准绳。

---

## 一、产品

「拾光」记录人生中那些让你忽然通透的瞬间——顿悟、小确幸、读到的一句话、聊出的感悟——并在合适的时机把它们重新带回你眼前，陪你从「知道」走到「做到」。

核心循环：**即时记 / 补记 → 卡片库 + 每日热力时间线 → 定时&随机推送 → 回味反馈（喂给内化算法）**。

定位：私密、本地、安静。数据只存在用户设备上，不联网、不上传。

---

## 二、功能

| 模块 | 说明 |
|------|------|
| 记一笔 | 文字 + 主题标签 + 配图；配图复制进 app 目录持久化 |
| 补记 | 在「每日」热力图点任意过去的格子，补记那一天 |
| 卡片库 | 按时间浏览，重要的卡显示 ⭐️ |
| 卡片详情 | 查看 / 编辑（保留编辑历史）/ 标记重要 / 删除 |
| 每日 | 记录热力图 + 统计（记录天数、累计条数）+ 按天列表 |
| 回味 | 成熟度+重要度加权选卡，「再体会 / 换一张 / 已做到」反馈 |
| 推送 | 每日定点 + 偶发随机，本地调度；时间可在设置里自定义 |
| 导出 | 文本（拷进备忘录）/ 完整 JSON 备份（存 iCloud） |

**内化算法**：每张卡有「成熟度」，回味一次成熟度 +1、下次出现间隔拉长（间隔重复）。选卡权重 = `(1/(成熟度+1)) × (重要?4:1)`，让越新、越没内化、越被标重要的卡更常回到眼前。

---

## 三、数据结构（本地 SQLite）

`cards` 表 → `Card`（见 `src/types.ts`）：
- 内容：`text` `tag` `imageUri` `createdAt` `updatedAt`
- 算法：`important` `maturity` `reviewCount` `lastShownAt` `nextEligibleAt` `internalized`
- 预留：`distilled`（将来 AI 提炼）`audioUri`（将来语音）

`card_edits` 表 → `CardEdit`：每次编辑前的快照（`cardId` `text` `tag` `editedAt`）。

`settings` 表：键值对（每日提醒时间、随机提醒开关等）。

数据访问层全部在 `src/db.ts`；偏好读写在 `src/settings.ts`；导出在 `src/export.ts`；配图持久化在 `src/images.ts`。

---

## 四、视觉风格

> 一句话基调：让「字」成为主角，界面往后退；玻璃只点缀在边框，不铺满内容。

气质贴近 Apple 原生、符合 2026 年 iOS 设计语言——**安静、克制、内容优先**，参照「日记 Journal」与「备忘录 Notes」。

**设计系统**：遵循 Apple HIG，采用 iOS 26 Liquid Glass 语言但克制使用——玻璃/半透明只用在**导航栏、底部悬浮标签栏、弹出层**；正文卡片保持不透明、安静、易读。

**字体**：系统字体（RN 的 System 即 SF Pro）。靠**字号字重**区分层级，而不是颜色。支持 Dynamic Type（不禁用字体缩放）。

**配色**：以中性语义色为主（background / label / secondaryLabel / separator…），只保留**一个低饱和度金色强调色**（呼应「拾光」），仅用于激活标签、链接、重要星标、选中主题。完整支持浅/深色，跟随系统。色板见 `src/theme.ts`。

**布局**：大量留白，8pt 间距网格（`spacing`）；连续圆角 squircle（`borderCurve: 'continuous'` + `radius`）；尊重安全区；列表用 inset grouped 风格。

**材质与动效**：玻璃用 `expo-blur`；过渡用柔和弹簧（`PressableScale` 的按压缩放，RN Animated）；记录/保存/删除/标记等关键操作加轻量触感（`expo-haptics`，见 `src/haptics.ts`）。

**卡片**：像一张安静的纸，正文是主角，留足内边距，极轻描边/阴影，不花哨。

**无障碍**：正文与背景对比度 ≥ 4.5:1，绝不为玻璃效果牺牲可读性。

### 技术映射
- 玻璃模糊：`expo-blur`（标签栏背景、native-stack 的 `headerBlurEffect` 模糊大标题导航）
- 触感：`expo-haptics`（`src/haptics.ts`）
- 动效：RN 内置 `Animated`（`src/components/PressableScale.tsx`）——刻意不引入 reanimated，避免 babel/worklets 风险
- 字体：系统默认（SF）
- 颜色：语义化、跟随深浅色（`src/theme.ts` 的 `useColors()`）
- 导航：底部玻璃标签栏（`@react-navigation/bottom-tabs`）+ 每个 tab 内嵌 native-stack 取原生大标题

### 将来「原汁原味」升级
`expo-glass-effect`（iOS 26 原生 Liquid Glass）在 SDK 54 已有版本，但需**开发版构建**（Expo Go 跑不了）且仅 iOS 26 真机出真玻璃。届时可把 `expo-blur` 的玻璃层替换为原生 `GlassView`，数据/结构无需改动。

---

## 五、技术栈与结构

Expo（React Native）/ TypeScript · expo-sqlite · expo-notifications · expo-image-picker + expo-file-system · expo-blur · expo-haptics · @react-navigation（native-stack + bottom-tabs）

```
App.tsx                  导航容器：玻璃标签栏 + 模糊大标题栈 + 主题接线 + 通知
src/
├── theme.ts             语义色板(浅/深) + spacing + radius + useColors()
├── haptics.ts           触感封装
├── date.ts              共享日期/时间格式化
├── navigation.ts        路由类型（RootStack + Tab + RootNav）
├── db.ts                SQLite：增删改查 + 选卡算法
├── settings.ts          偏好读写 + 应用到通知
├── notifications.ts     本地推送调度
├── images.ts            配图持久化
├── export.ts            导出文本 / JSON 备份
├── types.ts             Card / CardEdit
├── components/
│   └── PressableScale.tsx  按压弹簧反馈
└── screens/             Home / AddCard / CardDetail / Review / Timeline / Settings
```
