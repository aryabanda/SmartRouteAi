import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/Home/HomeScreen';
import JourneyScreen from '../screens/Journey/JourneyScreen';
import AIScreen from '../screens/AI/AIScreen';
import HistoryScreen from '../screens/History/HistoryScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

import Icon from 'react-native-vector-icons/Ionicons';

const Tab = createBottomTabNavigator();

export default function BottomNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,

        tabBarActiveTintColor: '#2563EB',

        tabBarInactiveTintColor: '#888',

        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
        },

        tabBarIcon: ({color, size}) => {
          let iconName = 'home';

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;

            case 'Journey':
              iconName = 'map';
              break;

            case 'AI':
              iconName = 'sparkles';
              break;

            case 'History':
              iconName = 'time';
              break;

            case 'Profile':
              iconName = 'person';
              break;
          }

          return (
            <Icon
              name={iconName}
              size={size}
              color={color}
            />
          );
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Journey" component={JourneyScreen} />
      <Tab.Screen name="AI" component={AIScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}