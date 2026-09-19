import React, {useCallback, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {listJourneys, Journey} from '../../services/journeys';

type MenuItem = {
  label: string;
  onPress: () => void;
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {user, token, logout} = useAuth();

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    if (!token) {
      setJourneys([]);
      setLoadingStats(false);
      return;
    }
    try {
      const {journeys: fetched} = await listJourneys(token);
      setJourneys(fetched);
    } catch (err) {
      console.warn('Failed to load profile stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [token]);

  // Refetch every time this tab is focused - so a journey you just
  // finished is reflected in the stats without needing to reopen the app.
  useFocusEffect(
    useCallback(() => {
      setLoadingStats(true);
      loadStats();
    }, [loadStats]),
  );

  const journeyCount = journeys.length;
  const totalHours = journeys.reduce((sum, j) => sum + (j.duration_min ?? 0), 0) / 60;
  // "Safety" here is simple and honest: the percentage of past journeys
  // that did NOT end in an SOS. Defaults to 100% with zero journeys logged
  // yet, rather than showing a misleading 0%/NaN for a new account.
  const safetyPercent =
    journeyCount === 0
      ? 100
      : Math.round(
          (journeys.filter(j => j.status !== 'sos_triggered').length / journeyCount) * 100,
        );

  const avatarUrl = user
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff&size=150`
    : undefined;

  const handleLogout = () => {
    Alert.alert('Log out?', 'You can log back in anytime.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({index: 0, routes: [{name: 'Login'}]});
        },
      },
    ]);
  };

  const comingSoon = (feature: string) =>
    Alert.alert(feature, "This isn't built yet - coming in a future update.");

  const menuItems: MenuItem[] = [
    {
      label: '🚨 Emergency Contacts',
      onPress: () => navigation.navigate('EmergencyContacts'),
    },
    {label: '🤖 AI Preferences', onPress: () => comingSoon('AI Preferences')},
    {label: '📍 Default Locations', onPress: () => comingSoon('Default Locations')},
    {label: '🔔 Notifications', onPress: () => comingSoon('Notifications')},
    {label: '🌙 Dark Mode', onPress: () => comingSoon('Dark Mode')},
    {label: '🔒 Privacy & Security', onPress: () => comingSoon('Privacy & Security')},
    {label: 'ℹ️ About App', onPress: () => comingSoon('About App')},
    {label: '🚪 Log Out', onPress: handleLogout},
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          {avatarUrl && (
            <Image source={{uri: avatarUrl}} style={styles.avatar} />
          )}

          <Text style={styles.name}>{user?.name ?? 'Loading...'}</Text>

          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            {loadingStats ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.statNumber}>{journeyCount}</Text>
            )}
            <Text style={styles.statTitle}>Journeys</Text>
          </View>

          <View style={styles.statCard}>
            {loadingStats ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.statNumber}>{safetyPercent}%</Text>
            )}
            <Text style={styles.statTitle}>Safety</Text>
          </View>

          <View style={styles.statCard}>
            {loadingStats ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.statNumber}>{totalHours.toFixed(1)}</Text>
            )}
            <Text style={styles.statTitle}>Hours</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  profileCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  name: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 15,
  },

  email: {
    color: '#666',
    marginTop: 6,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 25,
  },

  statCard: {
    backgroundColor: '#fff',
    width: 95,
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
    minHeight: 66,
    justifyContent: 'center',
  },

  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563EB',
  },

  statTitle: {
    marginTop: 5,
    color: '#666',
  },

  menuCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 3,
  },

  menuItem: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },

  menuText: {
    fontSize: 16,
  },
});