import { createNavigationContainerRef } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

// 底部标签：记录库 / 每日 / 设置
export type TabParamList = {
  Library: undefined;
  Timeline: undefined;
  Settings: undefined;
};

// 根栈：标签容器 + 浮层/详情页
export type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList> | undefined;
  AddCard: { id?: number; date?: number } | undefined; // 带 id=编辑；带 date=补记
  CardDetail: { id: number };
  Review: undefined; // 从推送点进来，现场选一张卡
  SeedLibrary: undefined; // 灵感库：浏览普适道理示例，单条加入
};

// 各屏统一用这个类型取 navigation，跨导航器跳转也能正确解析。
export type RootNav = NativeStackNavigationProp<RootStackParamList>;

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<T extends keyof RootStackParamList>(
  name: T,
  params?: RootStackParamList[T]
) {
  if (navigationRef.isReady()) {
    // @ts-expect-error 参数类型在调用处已保证
    navigationRef.navigate(name, params);
  }
}
