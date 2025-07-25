import { Stack } from "expo-router";
import { ThemeProvider } from '../context/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, Image, StyleSheet, } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from "react";

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#212E53');
  }, []);

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ backgroundColor: '#FF6B9D', height: 0 }}>
          <StatusBar style="light" />
        </View>
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: {
              backgroundColor: '#FF084B',
            },
            headerTintColor: '#fff',
            // headerTitle: () => (
            //   <Image 
            //     source={require('../assets/images/OWP_NB.png')}
            //     style={styles.logo}
            //     resizeMode="contain"
            //   />
            // ),
            headerTitleAlign: 'center',
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="categories/[id]" 
            options={{ 
              headerShown: false
            }} 
          />
          <Stack.Screen 
            name="wallpapers/[id]" 
            options={{ 
              headerShown: false,
              presentation: 'transparentModal',
            }} 
          />
        </Stack>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 200,
    height: 70,
  },
});
