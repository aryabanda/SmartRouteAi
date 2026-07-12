import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const journeys = [
  {
    date: 'Today',
    from: 'Gachibowli',
    to: 'Hitech City',
    duration: '18 mins',
    status: 'Safe',
    color: '#22C55E',
  },
  {
    date: 'Yesterday',
    from: 'KPHB',
    to: 'Secunderabad',
    duration: '34 mins',
    status: 'Traffic',
    color: '#F59E0B',
  },
  {
    date: '28 Jun',
    from: 'Ameerpet',
    to: 'Airport',
    duration: '52 mins',
    status: 'SOS',
    color: '#EF4444',
  },
];

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.heading}>
        Journey History
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>

        {journeys.map((item, index) => (

          <View
            key={index}
            style={styles.card}
          >

            <View style={styles.row}>

              <Text style={styles.date}>
                {item.date}
              </Text>

              <View
                style={[
                  styles.badge,
                  { backgroundColor: item.color },
                ]}
              >
                <Text style={styles.badgeText}>
                  {item.status}
                </Text>
              </View>

            </View>

            <Text style={styles.location}>
              📍 {item.from}
            </Text>

            <Text style={styles.arrow}>
              ↓
            </Text>

            <Text style={styles.location}>
              🏁 {item.to}
            </Text>

            <View style={styles.footer}>

              <Text style={styles.duration}>
                ⏱ {item.duration}
              </Text>

              <Text style={styles.ai}>
                🤖 AI Summary Available
              </Text>

            </View>

          </View>

        ))}

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#F5F7FB",
padding:20,
},

heading:{
fontSize:28,
fontWeight:"700",
marginBottom:20,
},

card:{
backgroundColor:"#fff",
borderRadius:20,
padding:20,
marginBottom:18,
elevation:3,
},

row:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
},

date:{
fontSize:16,
fontWeight:"700",
},

badge:{
paddingHorizontal:12,
paddingVertical:5,
borderRadius:20,
},

badgeText:{
color:"#fff",
fontWeight:"700",
},

location:{
fontSize:18,
marginTop:12,
},

arrow:{
fontSize:24,
textAlign:"center",
marginVertical:8,
color:"#888",
},

footer:{
marginTop:15,
flexDirection:"row",
justifyContent:"space-between",
},

duration:{
color:"#666",
},

ai:{
fontWeight:"600",
color:"#2563EB",
},

});