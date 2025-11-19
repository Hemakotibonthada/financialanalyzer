import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Auth Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

// Dashboard Screens
import FinancialHealthScreen from '../screens/Dashboard/FinancialHealthScreen';

// Import placeholder for other screens (to be created)
import { colors } from '../styles/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Placeholder screens
const PlaceholderScreen = ({ title }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Ionicons name="construct" size={64} color={colors.textSecondary} />
    <Text style={{ marginTop: 16, fontSize: 18, color: colors.text }}>
      {title} - Coming Soon
    </Text>
  </View>
);

const CompanyExpensesScreen = () => <PlaceholderScreen title="Company Expenses" />;
const EMITrackerScreen = () => <PlaceholderScreen title="EMI Tracker" />;
const LenderDashboardScreen = () => <PlaceholderScreen title="Lender Dashboard" />;
const BillRemindersScreen = () => <PlaceholderScreen title="Bill Reminders" />;
const ProfileScreen = () => <PlaceholderScreen title="Profile" />;
const ReportsScreen = () => <PlaceholderScreen title="Reports" />;

// Auth Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Bottom Tab Navigator
function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Expenses') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'EMI') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Lender') {
            iconName = focused ? 'cash' : 'cash-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={FinancialHealthScreen}
        options={{ title: 'Financial Health' }}
      />
      <Tab.Screen 
        name="Expenses" 
        component={CompanyExpensesScreen}
        options={{ title: 'Expenses' }}
      />
      <Tab.Screen 
        name="EMI" 
        component={EMITrackerScreen}
        options={{ title: 'EMI Tracker' }}
      />
      <Tab.Screen 
        name="Lender" 
        component={LenderDashboardScreen}
        options={{ title: 'Loans Given' }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
function AppNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
      }}
    >
      <Drawer.Screen 
        name="Home" 
        component={HomeTabs}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Bill Reminders" 
        component={BillRemindersScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

// Root Navigator
export default function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}
