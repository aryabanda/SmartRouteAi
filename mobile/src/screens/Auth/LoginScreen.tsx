import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {Text, TextInput} from 'react-native-paper';
import PrimaryButton from '../../components/buttons/PrimaryButton';

export default function LoginScreen({navigation}: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>

      <Text variant="displaySmall" style={styles.title}>
        Welcome Back 👋
      </Text>

      <Text style={styles.subtitle}>
        Login to continue your journey safely.
      </Text>

      <TextInput
        label="Email"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        label="Password"
        mode="outlined"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <PrimaryButton
        title="Login"
        onPress={() => navigation.replace('Main')}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>
          Create Account
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    justifyContent:'center',
    padding:25,
    backgroundColor:'#fff'
  },

  title:{
    fontWeight:'bold',
    marginBottom:10
  },

  subtitle:{
    color:'gray',
    marginBottom:40
  },

  input:{
    marginBottom:20
  },

  link:{
    marginTop:20,
    textAlign:'center',
    color:'#2563EB'
  }
});