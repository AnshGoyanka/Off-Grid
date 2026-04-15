// Main navigation structure for Bitpay
// Onboarding Stack → Main Tab Navigator → Wallet sub-stack

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSelector} from 'react-redux';
import {Text} from 'react-native';

import {selectIsOnboarding} from '../store/uiSlice';
import {Colors} from '../theme/colors';
import {RootStackParamList, MainTabParamList} from './types';

// Onboarding screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import CreateWalletScreen from '../screens/onboarding/CreateWalletScreen';
import RecoveryPhraseScreen from '../screens/onboarding/RecoveryPhraseScreen';
import VerifyPhraseScreen from '../screens/onboarding/VerifyPhraseScreen';
import WalletReadyScreen from '../screens/onboarding/WalletReadyScreen';
import ImportWalletScreen from '../screens/onboarding/ImportWalletScreen';

// Main app screens
import DashboardScreen from '../screens/main/DashboardScreen';
import SendScreen from '../screens/main/SendScreen';
import ReceiveScreen from '../screens/main/ReceiveScreen';
import ActivityScreen from '../screens/main/ActivityScreen';
import MeshMapScreen from '../screens/main/MeshMapScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Tab Icon ───────────────────────────────────────────────────────────────

function TabIcon({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}): React.ReactElement {
  const icons: Record<string, string> = {
    Wallet: '⬡',
    Contacts: '⊕',
    MeshMap: '⋮',
    Settings: '⚙',
  };
  return (
    <Text
      style={{
        fontSize: 18,
        color: focused ? Colors.accent : Colors.textMuted,
      }}>
      {icons[label] ?? label[0]}
    </Text>
  );
}

// ─── Main Tab Navigator ─────────────────────────────────────────────────────

function MainTabs(): React.ReactElement {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgDark,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {fontSize: 10, fontWeight: '500'},
        tabBarIcon: ({focused}) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}>
      <Tab.Screen name="Wallet" component={DashboardScreen} />
      <Tab.Screen name="Contacts" component={SettingsScreen} />
      <Tab.Screen
        name="MeshMap"
        component={MeshMapScreen}
        options={{tabBarLabel: 'Mesh Map'}}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ─────────────────────────────────────────────────────────

const screenOptions = {
  headerShown: false,
  cardStyle: {backgroundColor: Colors.bgDark},
};

export default function AppNavigator(): React.ReactElement {
  const isOnboarding = useSelector(selectIsOnboarding);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {isOnboarding ? (
          // Onboarding flow
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
            <Stack.Screen
              name="RecoveryPhrase"
              component={RecoveryPhraseScreen}
            />
            <Stack.Screen name="VerifyPhrase" component={VerifyPhraseScreen} />
            <Stack.Screen name="WalletReady" component={WalletReadyScreen} />
            <Stack.Screen
              name="ImportWallet"
              component={ImportWalletScreen}
            />
          </>
        ) : (
          // Main app
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Send" component={SendScreen} />
            <Stack.Screen name="Receive" component={ReceiveScreen} />
            <Stack.Screen name="Activity" component={ActivityScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
