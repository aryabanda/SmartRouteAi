import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#2563EB', '#06B6D4']}
      style={styles.container}>

      <Animated.View
        entering={FadeIn.duration(1000)}
        style={styles.logoContainer}>

        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(1200)}
        style={styles.textContainer}>

        <Text variant="displaySmall" style={styles.title}>
          Smart Route AI
        </Text>

        <Text variant="titleMedium" style={styles.subtitle}>
          Intelligent Navigation • Safer Journeys
        </Text>

      </Animated.View>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoContainer: {
    marginBottom: 30,
  },

  logo: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
  },

  textContainer: {
    alignItems: 'center',
  },

  title: {
    color: '#fff',
    fontWeight: 'bold',
  },

  subtitle: {
    color: '#E0F2FE',
    marginTop: 8,
  },
});