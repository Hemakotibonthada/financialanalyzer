import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  Surface,
  Title,
  Subheading,
  ActivityIndicator,
} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { dashboardService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { theme, gradients, shadows } from '../../theme';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardService.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, []);

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || '0'}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Title style={styles.userName}>{user?.name || 'User'}</Title>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="bell-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Financial Overview */}
      <Surface style={[styles.overviewCard, shadows.medium]}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overviewGradient}
        >
          <Text style={styles.overviewLabel}>Total Balance</Text>
          <Title style={styles.overviewAmount}>
            {formatCurrency(dashboardData?.totalBalance || 0)}
          </Title>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Icon name="arrow-down" size={20} color="#ffffff" />
              <Text style={styles.overviewText}>
                Income: {formatCurrency(dashboardData?.totalIncome || 0)}
              </Text>
            </View>
            <View style={styles.overviewItem}>
              <Icon name="arrow-up" size={20} color="#ffffff" />
              <Text style={styles.overviewText}>
                Expense: {formatCurrency(dashboardData?.totalExpense || 0)}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Surface>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <StatCard
          icon="credit-card-outline"
          label="Active EMIs"
          value={dashboardData?.activeEmis || 0}
          gradient={gradients.blue}
          onPress={() => navigation.navigate('EMI')}
        />
        <StatCard
          icon="bell-outline"
          label="Pending Bills"
          value={dashboardData?.pendingBills || 0}
          gradient={gradients.pink}
          onPress={() => navigation.navigate('Bills')}
        />
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          icon="chart-line"
          label="Investments"
          value={formatCurrency(dashboardData?.totalInvestments || 0)}
          gradient={gradients.green}
          onPress={() => navigation.navigate('Investments')}
        />
        <StatCard
          icon="target"
          label="Goals"
          value={dashboardData?.activeGoals || 0}
          gradient={gradients.orange}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Subheading style={styles.sectionTitle}>Quick Actions</Subheading>
        <View style={styles.actionsContainer}>
          <ActionButton
            icon="plus-circle"
            label="Add EMI"
            onPress={() => navigation.navigate('EMI')}
          />
          <ActionButton
            icon="bell-plus"
            label="Add Bill"
            onPress={() => navigation.navigate('Bills')}
          />
          <ActionButton
            icon="chart-line-variant"
            label="Invest"
            onPress={() => navigation.navigate('Investments')}
          />
          <ActionButton
            icon="target"
            label="Set Goal"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Subheading style={styles.sectionTitle}>Recent Activity</Subheading>
        {dashboardData?.recentTransactions?.slice(0, 5).map((transaction) => (
          <TransactionItem key={transaction._id} transaction={transaction} />
        ))}
      </View>
    </ScrollView>
  );
};

const StatCard = ({ icon, label, value, gradient, onPress }) => (
  <TouchableOpacity
    style={styles.statCard}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statGradient}
    >
      <Icon name={icon} size={32} color="#ffffff" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const ActionButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <Surface style={[styles.actionIcon, shadows.small]}>
      <Icon name={icon} size={24} color={theme.colors.primary} />
    </Surface>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const TransactionItem = ({ transaction }) => (
  <Surface style={[styles.transactionItem, shadows.small]}>
    <View
      style={[
        styles.transactionIcon,
        {
          backgroundColor:
            transaction.type === 'income'
              ? theme.colors.success + '20'
              : theme.colors.error + '20',
        },
      ]}
    >
      <Icon
        name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'}
        size={20}
        color={
          transaction.type === 'income'
            ? theme.colors.success
            : theme.colors.error
        }
      />
    </View>
    <View style={styles.transactionDetails}>
      <Text style={styles.transactionTitle}>
        {transaction.description || transaction.category}
      </Text>
      <Text style={styles.transactionDate}>
        {new Date(transaction.date).toLocaleDateString()}
      </Text>
    </View>
    <Text
      style={[
        styles.transactionAmount,
        {
          color:
            transaction.type === 'income'
              ? theme.colors.success
              : theme.colors.error,
        },
      ]}
    >
      {transaction.type === 'income' ? '+' : '-'}₹
      {transaction.amount?.toLocaleString('en-IN')}
    </Text>
  </Surface>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 16,
    color: theme.colors.placeholder,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewCard: {
    marginHorizontal: 20,
    borderRadius: theme.roundness * 2,
    overflow: 'hidden',
  },
  overviewGradient: {
    padding: 24,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  overviewAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 8,
  },
  overviewRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  overviewText: {
    fontSize: 12,
    color: '#ffffff',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  statGradient: {
    padding: 20,
    borderRadius: theme.roundness * 2,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    width: (width - 80) / 4,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: theme.colors.text,
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;
