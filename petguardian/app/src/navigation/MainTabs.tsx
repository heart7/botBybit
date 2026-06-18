import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AccountScreen } from '@/screens/AccountScreen';
import { HomeScreen, RecordsScreen, ScanScreen } from '@/screens/Placeholders';
import { PetsStack } from './PetsStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcon =
  (emoji: string) =>
  ({ size }: { focused: boolean; color: string; size: number }) => (
    <Text style={{ fontSize: size }}>{emoji}</Text>
  );

export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Pets"
      screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1a73e8' }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="Pets" component={PetsStack} options={{ tabBarIcon: tabIcon('🐾') }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ tabBarIcon: tabIcon('📷') }} />
      <Tab.Screen name="Records" component={RecordsScreen} options={{ tabBarIcon: tabIcon('📁') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}
