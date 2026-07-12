import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Keyboard,
} from 'react-native';

import useSearch from '../../hooks/useSearch';
import {useAppLocation} from '../../context/LocationContext';

export default function DestinationSearchScreen({navigation, route}: any) {
  const location = useAppLocation();
  
  const [query, setQuery] = useState('');

  const {search, results, clearResults} = useSearch();

  useEffect(() => {
    const q = query.trim();

    if (q.length < 3) {
      clearResults();
      return;
    }

    const timer = setTimeout(() => {
      search(
        q,
        location?.coords.latitude,
        location?.coords.longitude,
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <SafeAreaView style={styles.container}>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.back}>
          ← Back
        </Text>
      </TouchableOpacity>

      <Text style={styles.heading}>
        Where are you going?
      </Text>

      <TextInput
        autoFocus
        placeholder="Search destination..."
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />

      <FlatList
        data={results}
        keyExtractor={(item, index) =>
          item.id?.toString() ?? index.toString()
        }
        keyboardShouldPersistTaps="handled"
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => {

              Keyboard.dismiss();

              route.params.onSelect(item);

              navigation.goBack();

            }}
          >

            <Text style={styles.title}>
              📍 {item.text}
            </Text>

            <Text style={styles.subtitle}>
              {item.place_name}
            </Text>

          </TouchableOpacity>
        )}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#fff",
padding:20,
},

back:{
fontSize:18,
color:"#2563EB",
marginBottom:20,
},

heading:{
fontSize:28,
fontWeight:"700",
marginBottom:20,
},

input:{
backgroundColor:"#F5F5F5",
borderRadius:16,
padding:18,
fontSize:17,
marginBottom:20,
},

item:{
paddingVertical:16,
borderBottomWidth:1,
borderBottomColor:"#eee",
},

title:{
fontSize:17,
fontWeight:"700",
},

subtitle:{
marginTop:5,
fontSize:13,
color:"#777",
},

});