import React, {useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {Text, TextInput} from 'react-native-paper';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import {useAuth} from '../../context/AuthContext';

export default function LoginScreen({navigation}: any) {
  const {login} = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Enter both your email and password.');
      return;
    }
    if (submitting) return; // guard against double-tap while a request is in flight

    setSubmitting(true);
    try {
      await login(email, password);
      navigation.replace('Main');
    } catch (err: any) {
      Alert.alert('Login failed', err.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

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
        autoCapitalize="none"
        keyboardType="email-address"
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
        title={submitting ? 'Logging in...' : 'Login'}
        onPress={handleLogin}
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
