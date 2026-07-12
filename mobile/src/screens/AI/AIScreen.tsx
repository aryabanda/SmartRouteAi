import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';

export default function AIScreen() {
  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.heading}>
        🤖 Smart Route AI
      </Text>

      <Text style={styles.subtitle}>
        Your Intelligent Travel Assistant
      </Text>

      <ScrollView
        style={styles.chatArea}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.userBubble}>
          <Text style={styles.userText}>
            Find the safest route from Gachibowli to KPHB.
          </Text>
        </View>

        <View style={styles.aiBubble}>

          <Text style={styles.aiText}>
            The safest route is via Outer Ring Road.
          </Text>

          <Text style={styles.aiInfo}>
            🟢 Risk Level : Low
          </Text>

          <Text style={styles.aiInfo}>
            🚦 Traffic : Moderate
          </Text>

          <Text style={styles.aiInfo}>
            ⏱ ETA : 26 mins
          </Text>

        </View>

        <Text style={styles.sectionTitle}>
          Suggested Questions
        </Text>

        <View style={styles.chipsContainer}>

          <TouchableOpacity style={styles.chip}>
            <Text>Safest Route</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip}>
            <Text>Traffic</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip}>
            <Text>Nearby Hospitals</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip}>
            <Text>Nearby Police</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

      <View style={styles.inputContainer}>

        <TextInput
          placeholder="Ask Smart Route AI..."
          style={styles.input}
        />

        <TouchableOpacity style={styles.sendButton}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>

      </View>

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
},

subtitle:{
color:"#777",
marginBottom:20,
},

chatArea:{
flex:1,
},

userBubble:{
alignSelf:"flex-end",
backgroundColor:"#2563EB",
padding:15,
borderRadius:18,
marginVertical:10,
maxWidth:"80%",
},

userText:{
color:"#fff",
},

aiBubble:{
backgroundColor:"#fff",
padding:18,
borderRadius:18,
marginBottom:20,
elevation:2,
},

aiText:{
fontSize:16,
fontWeight:"600",
marginBottom:10,
},

aiInfo:{
marginBottom:6,
color:"#555",
},

sectionTitle:{
fontWeight:"700",
marginBottom:10,
fontSize:18,
},

chipsContainer:{
flexDirection:"row",
flexWrap:"wrap",
},

chip:{
backgroundColor:"#E8EEFF",
paddingHorizontal:15,
paddingVertical:10,
borderRadius:20,
margin:5,
},

inputContainer:{
flexDirection:"row",
alignItems:"center",
marginTop:15,
},

input:{
flex:1,
backgroundColor:"#fff",
padding:15,
borderRadius:30,
},

sendButton:{
marginLeft:10,
backgroundColor:"#2563EB",
width:52,
height:52,
borderRadius:26,
justifyContent:"center",
alignItems:"center",
},

sendText:{
fontSize:20,
color:"#fff",
},

});