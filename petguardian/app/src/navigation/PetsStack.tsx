import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PetsListScreen } from '@/screens/pets/PetsListScreen';
import { PetDetailScreen } from '@/screens/pets/PetDetailScreen';
import { PetFormScreen } from '@/screens/pets/PetFormScreen';
import { LogWeightScreen } from '@/screens/pets/LogWeightScreen';
import type { PetsStackParamList } from './types';

const Stack = createNativeStackNavigator<PetsStackParamList>();

export function PetsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PetsList" component={PetsListScreen} options={{ title: 'My Pets' }} />
      <Stack.Screen name="PetDetail" component={PetDetailScreen} options={{ title: 'Pet' }} />
      <Stack.Screen name="PetForm" component={PetFormScreen} options={{ title: 'Pet' }} />
      <Stack.Screen
        name="LogWeight"
        component={LogWeightScreen}
        options={{ title: 'Log weight', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
