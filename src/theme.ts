import { useColorScheme } from 'react-native';

// iOS 风格的语义化色板。以中性色为主，只保留一个低饱和度的金色强调色（呼应「拾光」）。
// 强调色只用于：激活的标签、链接、重要星标、选中的主题；正文与卡片保持安静。
export interface Palette {
  scheme: 'light' | 'dark';
  background: string; // 整屏分组背景
  card: string; // 卡片/抬升表面
  cardPressed: string; // 卡片按下态
  label: string; // 主文字
  secondaryLabel: string; // 次级文字
  tertiaryLabel: string; // 更弱的文字
  separator: string; // 分隔线
  accent: string; // 金色强调（克制使用）
  accentSoft: string; // 金色淡背景（标签底）
  fill: string; // 主操作按钮填充（高对比）
  onFill: string; // 填充上的文字
  blurTint: 'light' | 'dark'; // 玻璃材质色调
}

const light: Palette = {
  scheme: 'light',
  background: '#F2F2F7',
  card: '#FFFFFF',
  cardPressed: '#ECECEF',
  label: '#1C1C1E',
  secondaryLabel: 'rgba(60,60,67,0.6)',
  tertiaryLabel: 'rgba(60,60,67,0.3)',
  separator: 'rgba(60,60,67,0.16)',
  accent: '#9A7B33',
  accentSoft: 'rgba(154,123,51,0.14)',
  fill: '#1C1C1E',
  onFill: '#FFFFFF',
  blurTint: 'light',
};

const dark: Palette = {
  scheme: 'dark',
  background: '#000000',
  card: '#1C1C1E',
  cardPressed: '#2C2C2E',
  label: '#FFFFFF',
  secondaryLabel: 'rgba(235,235,245,0.6)',
  tertiaryLabel: 'rgba(235,235,245,0.3)',
  separator: 'rgba(84,84,88,0.55)',
  accent: '#D9BD7C',
  accentSoft: 'rgba(217,189,124,0.18)',
  fill: '#F5F5F7',
  onFill: '#1C1C1E',
  blurTint: 'dark',
};

// 跟随系统深浅色模式。
export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

// 8pt 间距网格。
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// 浮动玻璃标签栏占据的底部空间：tab 屏的滚动内容要留出这么多 paddingBottom，
// 以免最后一条被标签栏盖住。
export const TAB_BAR_INSET = 96;

// 连续圆角（squircle）半径。配合各处 borderCurve: 'continuous' 使用。
export const radius = {
  chip: 8,
  small: 10,
  button: 14,
  card: 16,
  sheet: 22,
} as const;
