import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../contexts/ThemeContext';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import InsightsScreen from '../screens/insights/InsightsScreen';

import TransactionListScreen from '../screens/transactions/TransactionListScreen';
import TransactionFormScreen from '../screens/transactions/TransactionFormScreen';
import BudgetScreen from '../screens/budgets/BudgetScreen';
import BillRemindersScreen from '../screens/bills/BillRemindersScreen';

import EMIListScreen from '../screens/emi/EMIListScreen';
import EMIDetailScreen from '../screens/emi/EMIDetailScreen';
import EMIFormScreen from '../screens/emi/EMIFormScreen';
import LoansGivenScreen from '../screens/loans/LoansGivenScreen';
import PersonalLoansScreen from '../screens/loans/PersonalLoansScreen';

import InvestmentsScreen from '../screens/investments/InvestmentsScreen';
import NetWorthScreen from '../screens/investments/NetWorthScreen';
import GoalsScreen from '../screens/goals/GoalsScreen';

import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import SecurityScreen from '../screens/profile/SecurityScreen';
import NomineesScreen from '../screens/legacy/NomineesScreen';

const Tab = createBottomTabNavigator();

/**
 * Each tab owns its own stack so the back button behaves per-tab, which is
 * what users expect on both platforms: switching tabs must not lose the
 * screen you had pushed in the previous one.
 */
function createStack(name, screens) {
  const Stack = createNativeStackNavigator();
  const StackComponent = () => {
    const { colors } = useTheme();
    return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        {screens.map((s) => (
          <Stack.Screen
            key={s.name}
            name={s.name}
            component={s.component}
            options={s.options}
          />
        ))}
      </Stack.Navigator>
    );
  };
  StackComponent.displayName = `${name}Stack`;
  return StackComponent;
}

const HomeStack = createStack('Home', [
  { name: 'Dashboard', component: DashboardScreen, options: { title: 'Overview' } },
  { name: 'Insights', component: InsightsScreen, options: { title: 'Insights' } },
  { name: 'Notifications', component: InsightsScreen, options: { title: 'Notifications' } }
]);

const MoneyStack = createStack('Money', [
  { name: 'Transactions', component: TransactionListScreen, options: { title: 'Transactions' } },
  { name: 'TransactionForm', component: TransactionFormScreen, options: { title: 'Add transaction' } },
  { name: 'Budgets', component: BudgetScreen, options: { title: 'Budgets' } },
  { name: 'Bills', component: BillRemindersScreen, options: { title: 'Bills & reminders' } }
]);

const DebtStack = createStack('Debt', [
  { name: 'EMIs', component: EMIListScreen, options: { title: 'EMIs' } },
  { name: 'EMIDetail', component: EMIDetailScreen, options: { title: 'EMI detail' } },
  { name: 'EMIForm', component: EMIFormScreen, options: { title: 'Add EMI' } },
  { name: 'LoansGiven', component: LoansGivenScreen, options: { title: 'Money lent' } },
  { name: 'PersonalLoans', component: PersonalLoansScreen, options: { title: 'Money borrowed' } }
]);

const WealthStack = createStack('Wealth', [
  { name: 'Investments', component: InvestmentsScreen, options: { title: 'Investments' } },
  { name: 'NetWorth', component: NetWorthScreen, options: { title: 'Net worth' } },
  { name: 'Goals', component: GoalsScreen, options: { title: 'Goals' } }
]);

const ProfileStack = createStack('Profile', [
  { name: 'ProfileHome', component: ProfileScreen, options: { title: 'Profile' } },
  { name: 'Settings', component: SettingsScreen, options: { title: 'Settings' } },
  { name: 'Security', component: SecurityScreen, options: { title: 'Security' } },
  { name: 'Nominees', component: NomineesScreen, options: { title: 'Nominees' } }
]);

const TABS = [
  { name: 'HomeTab', label: 'Home', icon: 'home-variant', component: HomeStack },
  { name: 'MoneyTab', label: 'Money', icon: 'swap-horizontal', component: MoneyStack },
  { name: 'DebtTab', label: 'Debt', icon: 'credit-card-outline', component: DebtStack },
  { name: 'WealthTab', label: 'Wealth', icon: 'chart-line', component: WealthStack },
  { name: 'ProfileTab', label: 'Profile', icon: 'account-outline', component: ProfileStack }
];

export default function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
      }}
    >
      {TABS.map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{
            tabBarLabel: t.label,
            tabBarAccessibilityLabel: t.label,
            tabBarIcon: ({ color, size }) => <Icon name={t.icon} size={size} color={color} />
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
