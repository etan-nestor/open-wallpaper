import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { StatusBar, View } from 'react-native';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <>
      <View style={{ backgroundColor: '#FF6B9D', height: 0 }}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B9D" />
      </View>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.accent,
          headerShown: false,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTitleStyle: {
            color: theme.text,
          },
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            headerShown: false,
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            headerShown: false,
            title: 'Categories',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="view-grid" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            headerShown: false,
            title: 'Favorites',
            tabBarIcon: ({ color }) => (
              <Feather name="heart" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}