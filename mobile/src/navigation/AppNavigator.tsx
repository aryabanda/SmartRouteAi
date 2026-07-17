import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import BottomNavigator from './BottomNavigator';
import {LocationProvider} from '../context/LocationContext';
import {AuthProvider} from '../context/AuthContext';
import {ContactsProvider} from '../context/ContactsContext';
import DestinationSearchScreen from '../screens/Journey/DestinationSearchScreen';
import JourneyTrackingScreen from '../screens/Journey/JourneyTrackingScreen';
import EmergencyContactsScreen from '../screens/Contacts/EmergencyContactsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    // AuthProvider has to wrap ContactsProvider - contacts are fetched
    // per logged-in user, so ContactsContext needs useAuth()'s token.
    <AuthProvider>
      <LocationProvider>
        <ContactsProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{headerShown: false}}>
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
          </NavigationContainer>
        </ContactsProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
