import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScanPetPickerScreen } from '@/screens/scan/ScanPetPickerScreen';
import { ScanFormScreen } from '@/screens/scan/ScanFormScreen';
import { ScanResultScreen } from '@/screens/scan/ScanResultScreen';
import type { ScanStackParamList } from './types';

const Stack = createNativeStackNavigator<ScanStackParamList>();

export function ScanStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ScanPetPicker" component={ScanPetPickerScreen} options={{ title: 'New Scan' }} />
      <Stack.Screen name="ScanForm" component={ScanFormScreen} options={{ title: 'Symptoms' }} />
      <Stack.Screen
        name="ScanResult"
        component={ScanResultScreen}
        options={{ title: 'Triage', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
