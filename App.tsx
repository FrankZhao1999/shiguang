import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';

import { navigationRef, navigate, RootStackParamList } from './src/navigation';
import { initDb } from './src/db';
import { ensurePermissions, scheduleDaily, topUpRandom } from './src/notifications';

import HomeScreen from './src/screens/HomeScreen';
import AddCardScreen from './src/screens/AddCardScreen';
import CardDetailScreen from './src/screens/CardDetailScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import TimelineScreen from './src/screens/TimelineScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: '#faf8f4' },
  headerShadowVisible: false,
  headerTintColor: '#2c2c2c',
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: '#faf8f4' },
};

export default function App() {
  const ready = useRef(false);

  useEffect(() => {
    (async () => {
      await initDb();
      const granted = await ensurePermissions();
      if (granted) {
        await scheduleDaily(21, 0); // 默认晚 9 点；以后可做成可设置
        await topUpRandom(3);
      }
      ready.current = true;
    })();

    // 冷启动：如果是点推送进来的，进入回味页。
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp?.notification.request.content.data?.kind === 'review') {
        // 等导航就绪后再跳。
        const t = setInterval(() => {
          if (navigationRef.isReady()) {
            clearInterval(t);
            navigate('Review');
          }
        }, 100);
      }
    });

    // 运行中点推送：直接跳回味页。
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      if (resp.notification.request.content.data?.kind === 'review') {
        navigate('Review');
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: '拾光',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Timeline')}>
                <Text style={{ fontSize: 15, color: '#c8a45c' }}>每日</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="AddCard"
          component={AddCardScreen}
          options={{ title: '记一笔', presentation: 'modal' }}
        />
        <Stack.Screen
          name="CardDetail"
          component={CardDetailScreen}
          options={{ title: '' }}
        />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: '回味' }} />
        <Stack.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{ title: '每日' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
