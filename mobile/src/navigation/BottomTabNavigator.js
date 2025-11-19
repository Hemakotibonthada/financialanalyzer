import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../theme';

// Import Screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import EMITrackerScreen from '../screens/EMI/EMITrackerScreen';
import BillRemindersScreen from '../screens/BillReminders/BillRemindersScreen';
import CompanyExpensesScreen from '../screens/CompanyExpenses/CompanyExpensesScreen';
import LenderDashboardScreen from '../screens/Lender/LenderDashboardScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

// Stack Navigators
const DashboardStack = createNativeStackNavigator();
const EMIStack = createNativeStackNavigator();
const BillStack = createNativeStackNavigator();
const ExpenseStack = createNativeStackNavigator();
const LenderStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

// Dashboard Stack
const DashboardStackScreen = () => (
  <DashboardStack.Navigator>
    <DashboardStack.Screen 
      name="DashboardHome" 
      component={DashboardScreen}
      options={{ title: 'Dashboard' }}
    />
  </DashboardStack.Navigator>
);

// EMI Stack
const EMIStackScreen = () => (
  <EMIStack.Navigator>
    <EMIStack.Screen 
      name="EMIHome" 
      component={EMITrackerScreen}
      options={{ title: 'EMI Tracker' }}
    />
  </EMIStack.Navigator>
);

// Bill Stack
const BillStackScreen = () => (
  <BillStack.Navigator>
    <BillStack.Screen 
      name="BillHome" 
      component={BillRemindersScreen}
      options={{ title: 'Bill Reminders' }}
    />
  </BillStack.Navigator>
);

// Investment Stack
const ExpenseStackScreen = () => (
  <ExpenseStack.Navigator>
    <ExpenseStack.Screen 
      name="ExpenseHome" 
      component={CompanyExpensesScreen}
      options={{ title: 'Company Expenses' }}
    />
  </ExpenseStack.Navigator>
);

// Lender Stack
const LenderStackScreen = () => (
  <LenderStack.Navigator>
    <LenderStack.Screen 
      name="LenderHome" 
      component={LenderDashboardScreen}
      options={{ title: 'Loans Given' }}
    />
  </LenderStack.Navigator>
);

// Profile Stack
const ProfileStackScreen = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen 
      name="ProfileHome" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </ProfileStack.Navigator>
);

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.placeholder,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EMI"
        component={EMIStackScreen}
        options={{
          tabBarLabel: 'EMI',
          tabBarIcon: ({ color, size }) => (
            <Icon name="credit-card-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Bills"
        component={BillStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpenseStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Lender"
        component={LenderStackScreen}
        options={{
          tabBarLabel: 'Loans',
          tabBarIcon: ({ color, size }) => (
            <Icon name="hand-coin-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
