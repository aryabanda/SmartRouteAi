import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useAppLocation} from '../../context/LocationContext';
import JourneyScreen from '../Journey/JourneyScreen';
import { useNavigation } from '@react-navigation/native';



export default function HomeScreen() {
  const navigation=useNavigation<any>();
      const location = useAppLocation();
  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
  <Text style={styles.greeting}>👋 Welcome Back</Text>

  <Text style={styles.title}>
    Smart Route AI
  </Text>

  <Text style={styles.location}>
    📍 Current Location
  </Text>

  <Text style={styles.coordinates}>
  {location
    ? location.address
    : 'Getting your location...'}
</Text>
</View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Status</Text>

        <Text style={styles.status}>
          🟢 Safe
        </Text>

        <Text style={styles.subtitle}>
          No active journey
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={()=> navigation.navigate("Journey")}>
        <Text style={styles.buttonText}>
          Start New Journey
        </Text>
      </TouchableOpacity>

      <View style={styles.aiCard}>
        <Text style={styles.aiTitle}>
          🤖 AI Assistant
        </Text>

        <Text style={styles.aiSubtitle}>
          Ask for safest route, traffic alerts or emergency help.
        </Text>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

    location: {
  marginTop: 18,
  color: '#666',
  fontSize: 15,
},

coordinates: {
  marginTop: 5,
  color: '#2563EB',
  fontWeight: '600',
  fontSize: 15,
},

container:{
    flex:1,
    backgroundColor:"#F5F7FB",
    padding:20,
},

header:{
    marginTop:20,
},

greeting:{
    fontSize:18,
    color:"#777",
},

title:{
    fontSize:30,
    fontWeight:"700",
    marginTop:5,
},

card:{
    marginTop:30,
    backgroundColor:"#fff",
    borderRadius:20,
    padding:20,
    elevation:5,
},

cardTitle:{
    fontSize:18,
    fontWeight:"600",
},

status:{
    fontSize:32,
    fontWeight:"700",
    color:"#27AE60",
    marginTop:20,
},

subtitle:{
    color:"#777",
    marginTop:8,
},

button:{
    marginTop:30,
    backgroundColor:"#2563EB",
    padding:18,
    borderRadius:18,
    alignItems:"center",
},

buttonText:{
    color:"#fff",
    fontSize:18,
    fontWeight:"700",
},

aiCard:{
    marginTop:30,
    backgroundColor:"#EEF4FF",
    padding:20,
    borderRadius:20,
},

aiTitle:{
    fontSize:20,
    fontWeight:"700",
},

aiSubtitle:{
    marginTop:10,
    color:"#555",
    lineHeight:22,
},

});