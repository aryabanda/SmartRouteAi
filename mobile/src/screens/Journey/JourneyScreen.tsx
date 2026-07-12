import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import {useAppLocation} from '../../context/LocationContext';
import {getRoute} from '../../services/route';
import {useNavigation} from '@react-navigation/native';

export default function JourneyScreen() {

const location = useAppLocation();
  useEffect(() => {
  console.log("JourneyScreen location:", location);
}, [location]);

const [routeInfo, setRouteInfo] = useState<any>(null);

const [selectedPlace, setSelectedPlace] = useState<any>(null);

  const [destination, setDestination] = useState('');



  const navigation = useNavigation<any>();

  

useEffect(() => {
  if (destination.trim() === '') {
    setSelectedPlace(null);
    setRouteInfo(null);
  }
}, [destination]);

  return (
  <SafeAreaView style={styles.container}>
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
      <Text style={styles.heading}>New Journey</Text>

      
    <Text>
        Current Location
    </Text>
      <View style={styles.addressBox}>
  <Text
    numberOfLines={1}
    ellipsizeMode="tail"
    style={styles.addressText}
  >
    {location ? location.address : "Getting current location..."}
  </Text>
</View>
    <Text style={styles.sectionTitle}>
  Destination
</Text>

<TouchableOpacity
  activeOpacity={0.8}
  onPress={() =>
    navigation.navigate('DestinationSearch', {
      onSelect: async (item: any) => {
        if (!location) return;
        setDestination(item.place_name);
        setSelectedPlace(item);

        if (!location) return;

        const route = await getRoute(
  {latitude: location.coords.latitude, longitude: location.coords.longitude},
  {latitude: item.center[1], longitude: item.center[0]},
);
        console.log("Route Response:", route);


        setRouteInfo(route);
      },
    })
  }
>
  <View style={styles.input}>
    <Text
      numberOfLines={1}
      style={{
        fontSize: 16,
        color: destination ? '#111827' : '#9CA3AF',
      }}>
      {destination || 'Search destination...'}
    </Text>
  </View>
</TouchableOpacity>
    

      <View style={styles.mapContainer}>
  {location ? (
    <>
      <Text style={styles.mapTitle}>📍 Current Location</Text>

      <Text style={styles.mapText}>
        {location.address}
      </Text>
    </>
  ) : (
    <Text>Loading location...</Text>
  )}
</View>

      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text>Distance</Text>
          <Text>
  {routeInfo
    ? `${routeInfo.distance.toFixed(1)} km`
    : '-- km'}
</Text>
        </View>

        <View style={styles.row}>
          <Text>ETA</Text>
          <Text>
  {routeInfo
    ? `${routeInfo.duration.toFixed(0)} mins`
    : '-- mins'}
</Text>
        </View>

        <View style={styles.row}>
          <Text>Safety</Text>
          <Text>⭐⭐⭐⭐☆</Text>
        </View>

        <View style={styles.row}>
          <Text>Traffic</Text>
          <Text>Moderate</Text>
        </View>
      </View>

      <TouchableOpacity
    style={styles.button}
    disabled={!routeInfo}
    onPress={()=>{
        navigation.navigate("JourneyTracking",{
            destination,
            routeInfo,
            selectedPlace,
        });
    }}
>
        <Text style={styles.buttonText}>
          Start Journey
        </Text>
      </TouchableOpacity>

      <View style={styles.aiCard}>
        <Text style={styles.aiTitle}>🤖 AI Insights</Text>

        <Text style={styles.aiText}>• Safest route selected</Text>

        <Text style={styles.aiText}>• Moderate traffic ahead</Text>

        <Text style={styles.aiText}>• Avoid Road No.36 after 7 PM</Text>
      </View>

      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },

  heading: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 25,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 8,
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,

    borderWidth: 1,
    borderColor: '#ECECEC',

    elevation: 2,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
addressBox: {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
},

addressText: {
  fontSize: 16,
  color: '#111827',
},

  mapContainer: {
    backgroundColor: '#EAF2FF',

    borderRadius: 22,

    padding: 22,

    marginTop: 15,
    marginBottom: 20,

    minHeight: 170,

    justifyContent: 'center',

    borderWidth: 1,
    borderColor: '#D7E7FF',
  },

  mapTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  mapText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },

  infoCard: {
    backgroundColor: '#fff',

    borderRadius: 22,

    padding: 22,

    marginBottom: 20,

    elevation: 2,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingVertical: 10,

    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  rowLabel: {
    fontSize: 16,
    color: '#6B7280',
  },

  rowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  button: {
    backgroundColor: '#2563EB',

    paddingVertical: 18,

    borderRadius: 18,

    alignItems: 'center',

    marginBottom: 22,

    elevation: 4,

    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  aiCard: {
    backgroundColor: '#EEF4FF',

    borderRadius: 22,

    padding: 22,

    marginBottom: 30,

    borderWidth: 1,
    borderColor: '#D8E7FF',
  },

  aiTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  aiText: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 10,
    lineHeight: 22,
  },
});