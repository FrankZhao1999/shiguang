import { createNavigationContainerRef } from '@react-navigation/native';

export type RootStackParamList = {
  Home: undefined;
  // 带 id = 编辑已有的卡；带 date（某天 0 点的 ms）= 补记那一天
  AddCard: { id?: number; date?: number } | undefined;
  CardDetail: { id: number };
  Review: undefined; // 从推送点进来，现场选一张卡
  Timeline: undefined; // 按天回看记录节奏
};

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
