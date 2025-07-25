import React, { createContext, useContext, useState } from 'react';
import { ColorValue } from 'react-native';

type Theme = {
  shadow: ColorValue | undefined;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  customColors: {
    blueLight: string;
    yellow: string;
    blueDark: string;
    orange: string;
    black: string;
  };
};

type ThemeType = 'light' | 'dark';

const lightTheme: Theme = {
  background: '#212E53',
  card: '#f8f8f8',
  text: '#eeeeee',
  textSecondary: '#666666',
  border: '#e0e0e0',
  primary: '#6a1b9a',
  secondary: '#9c4dcc',
  accent: '#ff4081',
  customColors: {
    blueLight: '#9face1',
    yellow: '#ffd05b',
    blueDark: '#5168c4',
    orange: 'orangered',
    black: '#000000'
  },
  shadow: undefined
};

const darkTheme: Theme = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#dddddd',
  border: '#333333',
  primary: '#bb86fc',
  secondary: '#3700b3',
  accent: '#03dac6',
  customColors: {
    blueLight: '#9face1',
    yellow: '#ffd05b',
    blueDark: '#5168c4',
    orange: 'orangered',
    black: '#000000'
  },
  shadow: undefined
};

const ThemeContext = createContext<{
  theme: Theme;
  themeType: ThemeType;
  toggleTheme: () => void;
}>({
  theme: lightTheme,
  themeType: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeType, setThemeType] = useState<ThemeType>('light');

  const toggleTheme = () => {
    setThemeType(prev => prev === 'light' ? 'dark' : 'light');
  };

  const theme = themeType === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeType, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);