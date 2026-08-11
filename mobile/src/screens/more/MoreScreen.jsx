import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../contexts/ThemeContext';
import { Card, ListRow, Screen } from '../../components/ui';
import { radii, spacing, typography } from '../../theme/tokens';

/**
 * The app has five tabs but far more capability than five tabs can hold.
 * Everything that does not belong on a primary tab is reachable from here,
 * grouped by what the user is trying to do rather than by which backend
 * service happens to serve it.
 */
const SECTIONS = [
  {
    title: 'Accounts & spending',
    items: [
      {
        route: 'BankAccounts',
        label: 'Bank accounts',
        detail: 'Balances, transfers and account analytics',
        icon: 'bank',
        tint: 'primary'
      },
      {
        route: 'CreditCardBills',
        label: 'Credit card bills',
        detail: 'Statements, due dates and payments',
        icon: 'credit-card-multiple-outline',
        tint: 'primary'
      },
      {
        route: 'Recurring',
        label: 'Recurring payments',
        detail: 'Detected patterns and upcoming charges',
        icon: 'autorenew',
        tint: 'primary'
      },
      {
        route: 'Subscriptions',
        label: 'Subscriptions',
        detail: 'Renewals, unused services and cost',
        icon: 'repeat-variant',
        tint: 'primary'
      },
      {
        route: 'SplitExpenses',
        label: 'Split expenses',
        detail: 'Shared groups and who owes whom',
        icon: 'account-multiple-outline',
        tint: 'primary'
      }
    ]
  },
  {
    title: 'Protection & planning',
    items: [
      {
        route: 'Insurance',
        label: 'Insurance',
        detail: 'Policies, premiums and claims',
        icon: 'shield-check-outline',
        tint: 'success'
      },
      {
        route: 'Tax',
        label: 'Tax',
        detail: 'Filings, regime comparison and optimisation',
        icon: 'file-document-outline',
        tint: 'success'
      },
      {
        route: 'Retirement',
        label: 'Retirement',
        detail: 'Corpus projections and scenarios',
        icon: 'beach',
        tint: 'success'
      },
      {
        route: 'CreditScore',
        label: 'Credit score',
        detail: 'CIBIL profile and borrowing health',
        icon: 'gauge',
        tint: 'success'
      },
      {
        route: 'Family',
        label: 'Family',
        detail: 'Members, allowances and shared budget',
        icon: 'home-heart',
        tint: 'success'
      }
    ]
  },
  {
    title: 'Records',
    items: [
      {
        route: 'Receipts',
        label: 'Receipts',
        detail: 'Scan and store proof of purchase',
        icon: 'receipt',
        tint: 'warning'
      },
      {
        route: 'Documents',
        label: 'Documents',
        detail: 'Statements and files to extract from',
        icon: 'folder-outline',
        tint: 'warning'
      },
      {
        route: 'Reports',
        label: 'Reports & export',
        detail: 'Generate, schedule and download',
        icon: 'chart-box-outline',
        tint: 'warning'
      },
      {
        route: 'Search',
        label: 'Search',
        detail: 'Find anything across your finances',
        icon: 'magnify',
        tint: 'warning'
      }
    ]
  },
  {
    title: 'Legacy Guard',
    caption:
      'Protects your family if something happens to you, and helps them recover '
      + 'what you are owed.',
    items: [
      {
        route: 'LegacyHub',
        label: 'Legacy Guard',
        detail: 'Nominees, estate cases and recovery claims',
        icon: 'account-heart-outline',
        tint: 'danger'
      },
      {
        route: 'NomineePortal',
        label: 'Nominee portal',
        detail: 'For a nominee acting on behalf of someone',
        icon: 'account-arrow-right-outline',
        tint: 'danger'
      }
    ]
  },
  {
    title: 'Assistant & activity',
    items: [
      {
        route: 'Assistant',
        label: 'Ask the assistant',
        detail: 'Questions about your own numbers',
        icon: 'robot-outline',
        tint: 'primary'
      },
      {
        route: 'Conversations',
        label: 'Past conversations',
        detail: 'Everything you have asked before',
        icon: 'history',
        tint: 'primary'
      },
      {
        route: 'Achievements',
        label: 'Achievements',
        detail: 'Streaks, challenges and progress',
        icon: 'trophy-outline',
        tint: 'primary'
      },
      {
        route: 'Notifications',
        label: 'Notifications',
        detail: 'Alerts and reminders',
        icon: 'bell-outline',
        tint: 'primary'
      }
    ]
  }
];

function TintedIcon({ name, tint, colors }) {
  const color = colors[tint] || colors.primary;
  return (
    <View style={[styles.iconBubble, { backgroundColor: `${color}1A` }]}>
      <Icon color={color} name={name} size={20} />
    </View>
  );
}

function SectionCard({ section, colors, navigation }) {
  return (
    <Card style={styles.card}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {section.title.toUpperCase()}
      </Text>
      {section.caption ? (
        <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
          {section.caption}
        </Text>
      ) : null}
      {section.items.map((item, index) => (
        <ListRow
          accessibilityLabel={`${item.label}. ${item.detail}`}
          chevron
          icon={<TintedIcon colors={colors} name={item.icon} tint={item.tint} />}
          key={item.route}
          onPress={() => navigation.navigate(item.route)}
          style={index === section.items.length - 1 ? styles.lastRow : undefined}
          subtitle={item.detail}
          title={item.label}
        />
      ))}
    </Card>
  );
}

export default function MoreScreen({ navigation }) {
  const { colors } = useTheme();

  return (
    <Screen scroll>
      {SECTIONS.map((section) => (
        <SectionCard
          colors={colors}
          key={section.title}
          navigation={navigation}
          section={section}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.xs
  },
  sectionCaption: {
    ...typography.caption,
    marginBottom: spacing.sm
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  lastRow: {
    borderBottomWidth: 0
  }
});
