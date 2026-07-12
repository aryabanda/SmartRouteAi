import {MD3LightTheme} from 'react-native-paper';
import Colors from './colors';

const Theme = {
  ...MD3LightTheme,

  colors: {
    ...MD3LightTheme.colors,

    primary: Colors.primary,

    secondary: Colors.secondary,

    background: Colors.background,

    surface: Colors.card,
  },
};

export default Theme;