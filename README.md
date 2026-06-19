# 拾光 · Lucid

> 拾起生活里一闪而过的光 —— 把顿悟、通透、小确幸记下来，再让它们时常回到你眼前。

「拾光」是一个以**人生顿悟 / 通透**为主题的记录类 App。生活里那些让你忽然通透的瞬间——读到的一句话、和朋友聊出的感悟、一个微小的幸福时刻——都可以随手记下。之后 App 会在合适的时机把它们重新推到你面前，陪你慢慢从「知道」走到「做到」。

## ✨ 核心理念

记录不难，难的是**内化**。所以「拾光」不只是日记本，它把记录和「重复唤起」结合起来：

- **极速记录** —— 灵感转瞬即逝，一打开就能写，最低摩擦。
- **时常唤起** —— 每日定点 + 偶发随机的推送，把旧感悟带回眼前。
- **服务于内化** —— 选哪条来唤起，背后是「成熟度加权」的间隔重复：越新、越没内化的，出现得越勤；你越熟悉的，间隔越拉长。

## 🧭 功能

- **记一笔**：文字 / **语音转文字**（设备端）/ 主题（感悟·备忘·行动）/ **多图**，一屏记完；配图复制进 App 目录，永不丢失。
- **卡片库**：按时间浏览，重要的卡显示 ⭐️。
- **拾起一条**：成熟度+重要度加权选卡，「再体会 / 换一张 / 已做到」给算法反馈。
- **每日**：记录热力图 + 统计 + 按天列表；点热力图格子可**补记过去某天**。
- **编辑与留痕**：历史记录可随时编辑，每次改动前的版本都会存档。
- **本地推送**：每日定点 + 偶发随机，时间可在设置里自定义，零后端、零账号。
- **导出**：可读文本（拷进备忘录）/ 完整 JSON 备份（存 iCloud）。
- **苹果美学**：语义色板 + 深浅色跟随系统、玻璃标签栏、触感反馈。
- **完全离线**：所有数据存在设备本地，不联网、不上传，隐私干净。

## 🛠 技术栈

- [Expo](https://expo.dev/) SDK 54（React Native）/ TypeScript
- `expo-sqlite` —— 本地数据库
- `expo-notifications` —— 本地推送调度
- `expo-image-picker` + `expo-file-system` —— 配图选择与持久化
- `expo-speech-recognition` —— 设备端语音转文字（不上云）
- `expo-blur` + `expo-haptics` —— 玻璃材质与触感
- `@react-navigation/native-stack` + `bottom-tabs` —— 导航与底部标签栏

## 🚀 本地开发

> ⚠️ 本项目已使用自定义原生模块（语音识别等），**不能再用 Expo Go 运行**，需用 **Dev Build**（在 iOS 模拟器或真机上跑）。

### 环境要求（macOS）

- Node.js
- Xcode（含 iOS 模拟器）—— 系统较旧可在 [developer.apple.com/download](https://developer.apple.com/download/all/?q=Xcode) 下兼容版本
- CocoaPods：`brew install cocoapods`

### 启动 / 继续开发

```bash
cd shiguang            # 进项目目录（本机为 /Users/zhaoyuqian/lucid-app）
npm install            # 首次或换机时
npx expo run:ios       # 编译并在 iOS 模拟器启动，自带 Metro 热更新
```

- 之后改 **JS/TS** 代码会**自动热更新**，无需重编译。
- 改了**原生依赖 / `app.json` 插件**后，需重新 `npx expo run:ios`；权限等没生效时用 `npx expo prebuild --clean -p ios` 再 `run`。
- **电脑重启后**：照上面 `cd` + `npx expo run:ios` 即可继续。Metro、模拟器、`ios/`（已 gitignore）都会按需重建，**代码不受影响**。

### 换电脑 / 重新克隆

```bash
git clone https://github.com/FrankZhao1999/shiguang.git
cd shiguang
npm install
npx expo run:ios
```

### 模拟器小贴士

- 切深浅色：`xcrun simctl ui booted appearance dark`（或 `light`），或模拟器菜单 Features → Toggle Appearance（⇧⌘A）。
- 模拟器对 **emoji 字体 / 中文语音模型 / 触感** 等系统资源有缺失，相关功能以**真机**为准。

## 📁 项目结构

```
App.tsx                  入口：玻璃标签栏 + 导航 + 启动初始化 + 推送跳转
src/
├── types.ts             数据结构（Card / CardEdit）
├── db.ts                本地 SQLite：增删改查 + 迁移 + 选卡算法
├── settings.ts          偏好读写（推送时间/随机开关）→ 应用到通知
├── notifications.ts     每日定点 + 随机推送的本地调度
├── export.ts            导出文本 / JSON 备份
├── images.ts            配图持久化 + 多图读取(getImages)
├── theme.ts             语义色板(浅/深) + 间距 + 圆角 + useColors()
├── haptics.ts           触感封装
├── date.ts              共享日期/时间格式化
├── navigation.ts        路由类型（RootStack + Tab）
├── components/
│   └── PressableScale.tsx  按压弹簧反馈
└── screens/
    ├── HomeScreen.tsx       记录库（首页）
    ├── AddCardScreen.tsx    记一笔 / 编辑 / 补记（含语音、多图）
    ├── CardDetailScreen.tsx 卡片详情 + 编辑历史 + 删除
    ├── ReviewScreen.tsx     拾起一条（回味/推送落地）
    ├── TimelineScreen.tsx   每日：热力图 + 统计 + 按天列表
    └── SettingsScreen.tsx   设置：推送时间 + 导出
```

## 🔒 数据与隐私

- 文字、主题、时间、编辑历史存在本地 SQLite；配图存在 App 文档目录。
- **不联网、不上传**，卸载 App 即清空（暂无云同步）。
- 后续若上架，计划走「本地优先 + 可选云同步（端到端加密）」的路线。

## 🌱 路线图

- [x] 语音转文字（设备端）
- [x] 多图
- [x] 数据导出（文本 / JSON 备份）
- [ ] 正式 App 图标 + 上架 App Store（TestFlight 真机验证语音转写）
- [ ] AI 提炼：把原始记录凝练成「核心金句 + 行动提示」
- [ ] 数据导入恢复 / iCloud 自动备份
- [ ] 多设备云同步（端到端加密）

---

*用代码拾起那些容易被遗忘的微光。*
