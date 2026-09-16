import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import BottomNavigator from './BottomNavigator';
import {LocationProvider} from '../context/LocationContext';
import {AuthProvider, useAuth} from '../context/AuthContext';
import {ContactsProvider} from '../context/ContactsContext';
import DestinationSearchScreen from '../screens/Journey/DestinationSearchScreen';
import JourneyTrackingScreen from '../screens/Journey/JourneyTrackingScreen';
import EmergencyContactsScreen from '../screens/Contacts/EmergencyContactsScreen';

const Stack = createNativeStackNavigator();

// Split out from AppNavigator because useAuth() needs to run INSIDE
// AuthProvider's subtree - AppNavigator itself is where AuthProvider gets
// mounted, so it can't call the hook on its own children before they exist.
function RootStack() {
  const {user, loading} = useAuth();

  // Session restore from AsyncStorage happens on mount and is usually fast,
  // but isn't instant - show a plain loading view rather than flashing
  // Login and then immediately replacing it with Main once restore finishes.
  if (loading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'}}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Session already restored (app was closed/reopened, not first launch) -
  // skip Splash/Login/Register/Permissions entirely and go straight in.
  // This is the actual fix for "shouldn't have to log in again".
  const initialRouteName = user ? 'Main' : 'Splash';

  return (
    <Stack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName={initialRouteName}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
      />

      <Stack.Screen
        name="Login"
        component={LoginScreen}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
      />

      <Stack.Screen
          name="DestinationSearch"
          component={DestinationSearchScreen}
          options={{headerShown:false}}
        />
      <Stack.Screen
            name="JourneyTracking"
            component={JourneyTrackingScreen}
            options={{headerShown:false}}
        />

      <Stack.Screen
        name="EmergencyContacts"
        component={EmergencyContactsScreen}
        options={{headerShown: false}}
      />

      <Stack.Screen
        name="Main"
        component={BottomNavigator}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    // AuthProvider has to wrap ContactsProvider - contacts are fetched
    // per logged-in user, so ContactsContext needs useAuth()'s token.
    <AuthProvider>
      <LocationProvider>
        <ContactsProvider>
          <NavigationContainer>
            <RootStack />
          </NavigationContainer>
        </ContactsProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
