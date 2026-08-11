import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../contexts/ThemeContext';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import InsightsScreen from '../screens/insights/InsightsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import NotificationPreferencesScreen
  from '../screens/notifications/NotificationPreferencesScreen';
import SearchScreen from '../screens/search/SearchScreen';

import TransactionListScreen from '../screens/transactions/TransactionListScreen';
import TransactionFormScreen from '../screens/transactions/TransactionFormScreen';
import BudgetScreen from '../screens/budgets/BudgetScreen';
import BillRemindersScreen from '../screens/bills/BillRemindersScreen';
import ReceiptsScreen from '../screens/receipts/ReceiptsScreen';
import ReceiptDetailScreen from '../screens/receipts/ReceiptDetailScreen';

import EMIListScreen from '../screens/emi/EMIListScreen';
import EMIDetailScreen from '../screens/emi/EMIDetailScreen';
import EMIFormScreen from '../screens/emi/EMIFormScreen';
import LoansGivenScreen from '../screens/loans/LoansGivenScreen';
import PersonalLoansScreen from '../screens/loans/PersonalLoansScreen';
import CreditCardBillsScreen from '../screens/cards/CreditCardBillsScreen';
import CreditCardBillDetailScreen from '../screens/cards/CreditCardBillDetailScreen';

import InvestmentsScreen from '../screens/investments/InvestmentsScreen';
import NetWorthScreen from '../screens/investments/NetWorthScreen';
import GoalsScreen from '../screens/goals/GoalsScreen';
import RetirementScreen from '../screens/retirement/RetirementScreen';
import RetirementDetailScreen from '../screens/retirement/RetirementDetailScreen';

import MoreScreen from '../screens/more/MoreScreen';
import BankAccountsScreen from '../screens/banking/BankAccountsScreen';
import BankAccountDetailScreen from '../screens/banking/BankAccountDetailScreen';
import RecurringScreen from '../screens/recurring/RecurringScreen';
import SubscriptionsScreen from '../screens/subscriptions/SubscriptionsScreen';
import SplitExpensesScreen from '../screens/split/SplitExpensesScreen';
import SplitGroupDetailScreen from '../screens/split/SplitGroupDetailScreen';
import InsuranceScreen from '../screens/insurance/InsuranceScreen';
import InsuranceDetailScreen from '../screens/insurance/InsuranceDetailScreen';
import TaxScreen from '../screens/tax/TaxScreen';
import TaxDetailScreen from '../screens/tax/TaxDetailScreen';
import CreditScoreScreen from '../screens/credit/CreditScoreScreen';
import FamilyScreen from '../screens/family/FamilyScreen';
import DocumentsScreen from '../screens/documents/DocumentsScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import AchievementsScreen from '../screens/achievements/AchievementsScreen';
import AssistantScreen from '../screens/chat/AssistantScreen';
import ConversationsScreen from '../screens/chat/ConversationsScreen';

import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import SecurityScreen from '../screens/profile/SecurityScreen';

import NomineesScreen from '../screens/legacy/NomineesScreen';
import LegacyHubScreen from '../screens/legacy/LegacyHubScreen';
import DormancyCasesScreen from '../screens/legacy/DormancyCasesScreen';
import DormancyCaseDetailScreen from '../screens/legacy/DormancyCaseDetailScreen';
import EstateCasesScreen from '../screens/legacy/EstateCasesScreen';
import EstateCaseDetailScreen from '../screens/legacy/EstateCaseDetailScreen';
import RecoveryClaimsScreen from '../screens/legacy/RecoveryClaimsScreen';
import RecoveryClaimDetailScreen from '../screens/legacy/RecoveryClaimDetailScreen';
import SettlementScreen from '../screens/legacy/SettlementScreen';
import NomineePortalScreen from '../screens/legacy/NomineePortalScreen';

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
  // This route previously rendered InsightsScreen, so notifications were
  // unreachable even though the backend had been serving them all along.
  {
    name: 'Notifications',
    component: NotificationsScreen,
    options: { title: 'Notifications' }
  },
  {
    name: 'NotificationPreferences',
    component: NotificationPreferencesScreen,
    options: { title: 'Notification settings' }
  },
  { name: 'Search', component: SearchScreen, options: { title: 'Search' } }
]);

const MoneyStack = createStack('Money', [
  {
    name: 'Transactions',
    component: TransactionListScreen,
    options: { title: 'Transactions' }
  },
  {
    name: 'TransactionForm',
    component: TransactionFormScreen,
    options: { title: 'Add transaction' }
  },
  { name: 'Budgets', component: BudgetScreen, options: { title: 'Budgets' } },
  { name: 'Bills', component: BillRemindersScreen, options: { title: 'Bills & reminders' } },
  { name: 'Receipts', component: ReceiptsScreen, options: { title: 'Receipts' } },
  { name: 'ReceiptDetail', component: ReceiptDetailScreen, options: { title: 'Receipt' } }
]);

const DebtStack = createStack('Debt', [
  { name: 'EMIs', component: EMIListScreen, options: { title: 'EMIs' } },
  { name: 'EMIDetail', component: EMIDetailScreen, options: { title: 'EMI detail' } },
  { name: 'EMIForm', component: EMIFormScreen, options: { title: 'Add EMI' } },
  { name: 'LoansGiven', component: LoansGivenScreen, options: { title: 'Money lent' } },
  {
    name: 'PersonalLoans',
    component: PersonalLoansScreen,
    options: { title: 'Money borrowed' }
  },
  {
    name: 'CreditCardBills',
    component: CreditCardBillsScreen,
    options: { title: 'Credit card bills' }
  },
  {
    name: 'CreditCardBillDetail',
    component: CreditCardBillDetailScreen,
    options: { title: 'Bill detail' }
  }
]);

const WealthStack = createStack('Wealth', [
  { name: 'Investments', component: InvestmentsScreen, options: { title: 'Investments' } },
  { name: 'NetWorth', component: NetWorthScreen, options: { title: 'Net worth' } },
  { name: 'Goals', component: GoalsScreen, options: { title: 'Goals' } },
  { name: 'Retirement', component: RetirementScreen, options: { title: 'Retirement' } },
  {
    name: 'RetirementDetail',
    component: RetirementDetailScreen,
    options: { title: 'Retirement plan' }
  }
]);

/**
 * The long tail. Five tabs cannot hold forty capabilities, so everything that
 * is not a daily-use surface is reachable from the More hub instead of being
 * built and then left unreachable.
 */
const MoreStack = createStack('More', [
  { name: 'MoreHome', component: MoreScreen, options: { title: 'More' } },

  { name: 'BankAccounts', component: BankAccountsScreen, options: { title: 'Bank accounts' } },
  {
    name: 'BankAccountDetail',
    component: BankAccountDetailScreen,
    options: { title: 'Account' }
  },
  { name: 'Recurring', component: RecurringScreen, options: { title: 'Recurring payments' } },
  {
    name: 'Subscriptions',
    component: SubscriptionsScreen,
    options: { title: 'Subscriptions' }
  },
  {
    name: 'SplitExpenses',
    component: SplitExpensesScreen,
    options: { title: 'Split expenses' }
  },
  { name: 'SplitGroupDetail', component: SplitGroupDetailScreen, options: { title: 'Group' } },

  { name: 'Insurance', component: InsuranceScreen, options: { title: 'Insurance' } },
  { name: 'InsuranceDetail', component: InsuranceDetailScreen, options: { title: 'Policy' } },
  { name: 'Tax', component: TaxScreen, options: { title: 'Tax' } },
  { name: 'TaxDetail', component: TaxDetailScreen, options: { title: 'Tax record' } },
  { name: 'CreditScore', component: CreditScoreScreen, options: { title: 'Credit score' } },
  { name: 'Family', component: FamilyScreen, options: { title: 'Family' } },

  { name: 'Documents', component: DocumentsScreen, options: { title: 'Documents' } },
  { name: 'Reports', component: ReportsScreen, options: { title: 'Reports & export' } },
  { name: 'Achievements', component: AchievementsScreen, options: { title: 'Achievements' } },

  { name: 'Assistant', component: AssistantScreen, options: { title: 'Assistant' } },
  {
    name: 'Conversations',
    component: ConversationsScreen,
    options: { title: 'Conversations' }
  },

  { name: 'LegacyHub', component: LegacyHubScreen, options: { title: 'Legacy Guard' } },
  { name: 'Nominees', component: NomineesScreen, options: { title: 'Nominees' } },
  {
    name: 'DormancyCases',
    component: DormancyCasesScreen,
    options: { title: 'Dormancy cases' }
  },
  {
    name: 'DormancyCaseDetail',
    component: DormancyCaseDetailScreen,
    options: { title: 'Dormancy case' }
  },
  { name: 'EstateCases', component: EstateCasesScreen, options: { title: 'Estate cases' } },
  {
    name: 'EstateCaseDetail',
    component: EstateCaseDetailScreen,
    options: { title: 'Estate case' }
  },
  {
    name: 'RecoveryClaims',
    component: RecoveryClaimsScreen,
    options: { title: 'Recovery claims' }
  },
  {
    name: 'RecoveryClaimDetail',
    component: RecoveryClaimDetailScreen,
    options: { title: 'Claim' }
  },
  { name: 'Settlement', component: SettlementScreen, options: { title: 'Settlement' } },
  {
    name: 'NomineePortal',
    component: NomineePortalScreen,
    options: { title: 'Nominee portal' }
  }
]);

const ProfileStack = createStack('Profile', [
  { name: 'ProfileHome', component: ProfileScreen, options: { title: 'Profile' } },
  { name: 'Settings', component: SettingsScreen, options: { title: 'Settings' } },
  { name: 'Security', component: SecurityScreen, options: { title: 'Security' } },
  { name: 'ProfileNominees', component: NomineesScreen, options: { title: 'Nominees' } }
]);

const TABS = [
  { name: 'HomeTab', label: 'Home', icon: 'home-variant', component: HomeStack },
  { name: 'MoneyTab', label: 'Money', icon: 'swap-horizontal', component: MoneyStack },
  { name: 'DebtTab', label: 'Debt', icon: 'credit-card-outline', component: DebtStack },
  { name: 'WealthTab', label: 'Wealth', icon: 'chart-line', component: WealthStack },
  {
    name: 'MoreTab',
    label: 'More',
    icon: 'dots-horizontal-circle-outline',
    component: MoreStack
  },
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
