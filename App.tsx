import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import {
  navigationRef,
  navigate,
  RootStackParamList,
  TabParamList,
} from './src/navigation';
import { initDb } from './src/db';
import { ensurePermissions } from './src/notifications';
import { applyNotificationPrefs } from './src/settings';
import { useColors, Palette } from './src/theme';
import { haptic } from './src/haptics';

import HomeScreen from './src/screens/HomeScreen';
import AddCardScreen from './src/screens/AddCardScreen';
import CardDetailScreen from './src/screens/CardDetailScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// 各栈共用的普通（小标题）头。不透明、与屏幕同底色——小标题在任何嵌套结构下都稳定渲染。
function headerOptions(c: Palette): NativeStackNavigationOptions {
  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: c.background },
    headerTitleStyle: { color: c.label },
    headerTintColor: c.accent,
    headerBackTitle: '返回',
    contentStyle: { backgroundColor: c.background },
  };
}

const LibraryStack = createNativeStackNavigator();
function LibraryStackNav() {
  const c = useColors();
  return (
    <LibraryStack.Navigator screenOptions={headerOptions(c)}>
      <LibraryStack.Screen
        name="LibraryHome"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: '记录库',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                haptic.light();
                navigation.navigate('AddCard');
              }}
              hitSlop={10}
            >
              <Ionicons name="add" size={28} color={c.accent} />
            </TouchableOpacity>
          ),
        })}
      />
    </LibraryStack.Navigator>
  );
}

const TimelineStack = createNativeStackNavigator();
function TimelineStackNav() {
  const c = useColors();
  return (
    <TimelineStack.Navigator screenOptions={headerOptions(c)}>
      <TimelineStack.Screen
        name="TimelineMain"
        component={TimelineScreen}
        options={{ title: '每日' }}
      />
    </TimelineStack.Navigator>
  );
}

const SettingsStack = createNativeStackNavigator();
function SettingsStackNav() {
  const c = useColors();
  return (
    <SettingsStack.Navigator screenOptions={headerOptions(c)}>
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: '设置' }}
      />
    </SettingsStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<TabParamList>();
function Tabs() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.secondaryLabel,
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
        // 贴底玻璃栏：铺满屏幕底边到安全区，内容干净地停在它上方，下方不再露东西。
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.separator,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView tint={c.blurTint} intensity={70} style={StyleSheet.absoluteFill} />
        ),
        tabBarIcon: ({ color, size, focused }) => {
          const map = {
            Library: focused ? 'sparkles' : 'sparkles-outline',
            Timeline: focused ? 'calendar' : 'calendar-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          } as const;
          return <Ionicons name={map[route.name]} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Library"
        component={LibraryStackNav}
        options={{ title: '记录' }}
        listeners={{ tabPress: () => haptic.selection() }}
      />
      <Tab.Screen
        name="Timeline"
        component={TimelineStackNav}
        options={{ title: '每日' }}
        listeners={{ tabPress: () => haptic.selection() }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNav}
        options={{ title: '设置' }}
        listeners={{ tabPress: () => haptic.selection() }}
      />
    </Tab.Navigator>
  );
}

const RootStack = createNativeStackNavigator<RootStackParamList>();
function RootNavigator() {
  const c = useColors();
  return (
    <RootStack.Navigator screenOptions={headerOptions(c)}>
      <RootStack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
      <RootStack.Screen
        name="AddCard"
        component={AddCardScreen}
        options={{ presentation: 'modal', title: '记一笔' }}
      />
      <RootStack.Screen
        name="CardDetail"
        component={CardDetailScreen}
        options={{ title: '' }}
      />
      <RootStack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ presentation: 'modal', title: '回味' }}
      />
    </RootStack.Navigator>
  );
}

function AppInner() {
  const c = useColors();

  useEffect(() => {
    (async () => {
      await initDb();
      const granted = await ensurePermissions();
      if (granted) await applyNotificationPrefs();
    })();

    // 冷启动：点推送进来 → 进回味页。
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp?.notification.request.content.data?.kind === 'review') {
        const t = setInterval(() => {
          if (navigationRef.isReady()) {
            clearInterval(t);
            navigate('Review');
          }
        }, 100);
      }
    });

    // 运行中点推送 → 进回味页。
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      if (resp.notification.request.content.data?.kind === 'review') {
        navigate('Review');
      }
    });
    return () => sub.remove();
  }, []);

  const base = c.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      background: c.background,
      card: c.card,
      text: c.label,
      border: c.separator,
      primary: c.accent,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}
