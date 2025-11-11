import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Surface,
  Title,
  ActivityIndicator,
  FAB,
  Chip,
} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { billReminderService } from '../../services/api';
import { theme, gradients, shadows } from '../../theme';
import { format } from 'date-fns';

const BillRemindersScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [billsRes, dashRes] = await Promise.all([
        billReminderService.getBills({ status: filter !== 'all' ? filter : undefined }),
        billReminderService.getDashboard(),
      ]);
      setBills(billsRes.data?.bills || []);
      setDashboard(dashRes.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [filter]);

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString('en-IN') || '0'}`;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      electricity: 'lightning-bolt',
      water: 'water',
      gas: 'fire',
      internet: 'wifi',
      mobile: 'cellphone',
      milk: 'food',
      rent: 'home',
      subscription: 'play-circle',
      insurance: 'shield-check',
      loan: 'bank',
    };
    return icons[category] || 'receipt';
  };

  const getCategoryColor = (category) => {
    const colors = {
      electricity: gradients.warning,
      water: gradients.blue,
      gas: gradients.danger,
      internet: gradients.info,
      mobile: gradients.purple,
      milk: gradients.green,
      rent: gradients.orange,
      subscription: gradients.pink,
      insurance: gradients.success,
      loan: gradients.primary,
    };
    return colors[category] || gradients.primary;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Dashboard Stats */}
        <View style={styles.statsRow}>
          <Surface style={[styles.statCard, shadows.small]}>
            <Text style={styles.statValue}>{dashboard?.dueSoon || 0}</Text>
            <Text style={styles.statLabel}>Due Soon</Text>
          </Surface>
          <Surface style={[styles.statCard, shadows.small]}>
            <Text style={styles.statValue}>{dashboard?.awaitingApproval || 0}</Text>
            <Text style={styles.statLabel}>Awaiting</Text>
          </Surface>
          <Surface style={[styles.statCard, shadows.small]}>
            <Text style={[styles.statValue, { color: theme.colors.error }]}>
              {dashboard?.overdue || 0}
            </Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </Surface>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
        >
          <Chip selected={filter === 'all'} onPress={() => setFilter('all')} style={styles.filterChip}>
            All
          </Chip>
          <Chip selected={filter === 'pending'} onPress={() => setFilter('pending')} style={styles.filterChip}>
            Pending
          </Chip>
          <Chip selected={filter === 'paid'} onPress={() => setFilter('paid')} style={styles.filterChip}>
            Paid
          </Chip>
          <Chip selected={filter === 'overdue'} onPress={() => setFilter('overdue')} style={styles.filterChip}>
            Overdue
          </Chip>
        </ScrollView>

        {/* Bills List */}
        <View style={styles.listContainer}>
          {bills.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="bell-off-outline" size={64} color={theme.colors.placeholder} />
              <Text style={styles.emptyText}>No bills found</Text>
            </View>
          ) : (
            bills.map((bill) => (
              <BillCard key={bill._id} bill={bill} getCategoryIcon={getCategoryIcon} getCategoryColor={getCategoryColor} formatCurrency={formatCurrency} />
            ))
          )}
        </View>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {}}
        color="#ffffff"
      />
    </View>
  );
};

const BillCard = ({ bill, getCategoryIcon, getCategoryColor, formatCurrency }) => {
  return (
    <Surface style={[styles.billCard, shadows.small]}>
      <LinearGradient
        colors={getCategoryColor(bill.category)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.billGradient}
      >
        <View style={styles.billHeader}>
          <View style={styles.billIconContainer}>
            <Icon name={getCategoryIcon(bill.category)} size={28} color="#ffffff" />
          </View>
          <View style={styles.billInfo}>
            <Text style={styles.billTitle}>{bill.billName}</Text>
            <Text style={styles.billVendor}>{bill.vendor?.name || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.billDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValueWhite}>{formatCurrency(bill.amount)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValueWhite}>
              {format(new Date(bill.dueDate), 'dd MMM yyyy')}
            </Text>
          </View>
          {bill.status === 'pending' && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Days Left</Text>
              <Text style={styles.detailValueWhite}>
                {Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.statusBadge, {
          backgroundColor: bill.status === 'paid' 
            ? 'rgba(255,255,255,0.3)' 
            : bill.status === 'overdue'
            ? 'rgba(239,68,68,0.3)'
            : 'rgba(255,255,255,0.2)'
        }]}>
          <Text style={styles.statusText}>{bill.status.toUpperCase()}</Text>
        </View>
      </LinearGradient>
    </Surface>
  );
};

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
  statsRow: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 0,
  },
  statCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.placeholder,
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.placeholder,
    marginTop: 16,
  },
  billCard: {
    marginBottom: 16,
    borderRadius: theme.roundness * 2,
    overflow: 'hidden',
  },
  billGradient: {
    padding: 20,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  billIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  billTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  billVendor: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 2,
  },
  billDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  detailValueWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.roundness,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: theme.colors.primary,
  },
});

export default BillRemindersScreen;
