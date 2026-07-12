import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const menuItems = [
  '🚨 Emergency Contacts',
  '🤖 AI Preferences',
  '📍 Default Locations',
  '🔔 Notifications',
  '🌙 Dark Mode',
  '🔒 Privacy & Security',
  'ℹ️ About App',
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.profileCard}>
          <Image
            source={{
              uri: 'https://i.pravatar.cc/150?img=12',
            }}
            style={styles.avatar}
          />

          <Text style={styles.name}>Arya Banda</Text>

          <Text style={styles.email}>
            arya@example.com
          </Text>
        </View>

        <View style={styles.statsContainer}>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>46</Text>
            <Text style={styles.statTitle}>Journeys</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>98%</Text>
            <Text style={styles.statTitle}>Safety</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>214</Text>
            <Text style={styles.statTitle}>Hours</Text>
          </View>

        </View>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}>
              <Text style={styles.menuText}>{item}</Text>
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