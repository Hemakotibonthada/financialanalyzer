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
import { investmentService } from '../../services/api';
import { theme, gradients, shadows } from '../../theme';

const InvestmentsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [invRes, dashRes] = await Promise.all([
        investmentService.getInvestments({ type: filter !== 'all' ? filter : undefined }),
        investmentService.getDashboard(),
      ]);
      setInvestments(invRes.data?.investments || []);
      setDashboard(dashRes.data);
    } catch (error) {
      console.error('Error fetching investments:', error);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const totalValue = dashboard?.totalValue || 0;
  const totalGain = dashboard?.totalGain || 0;
  const gainPercentage = dashboard?.gainPercentage || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Portfolio Summary */}
        <Surface style={[styles.summaryCard, shadows.medium]}>
          <LinearGradient
            colors={gradients.green}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
            <Title style={styles.summaryAmount}>{formatCurrency(totalValue)}</Title>
            <View style={styles.gainContainer}>
              <Icon name={totalGain >= 0 ? 'trending-up' : 'trending-down'} size={20} color="#ffffff" />
              <Text style={styles.gainText}>
                {formatCurrency(Math.abs(totalGain))} ({gainPercentage.toFixed(2)}%)
              </Text>
            </View>
          </LinearGradient>
        </Surface>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
        >
          <Chip selected={filter === 'all'} onPress={() => setFilter('all')} style={styles.filterChip}>
            All
          </Chip>
          <Chip selected={filter === 'stocks'} onPress={() => setFilter('stocks')} style={styles.filterChip}>
            Stocks
          </Chip>
          <Chip selected={filter === 'mutual_funds'} onPress={() => setFilter('mutual_funds')} style={styles.filterChip}>
            Mutual Funds
          </Chip>
          <Chip selected={filter === 'fixed_deposit'} onPress={() => setFilter('fixed_deposit')} style={styles.filterChip}>
            FD
          </Chip>
          <Chip selected={filter === 'gold'} onPress={() => setFilter('gold')} style={styles.filterChip}>
            Gold
          </Chip>
        </ScrollView>

        {/* Investments List */}
        <View style={styles.listContainer}>
          {investments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="chart-line-variant" size={64} color={theme.colors.placeholder} />
              <Text style={styles.emptyText}>No investments found</Text>
            </View>
          ) : (
            investments.map((investment) => (
              <InvestmentCard key={investment._id} investment={investment} formatCurrency={formatCurrency} />
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

const InvestmentCard = ({ investment, formatCurrency }) => {
  const currentValue = investment.currentValue || investment.investedAmount;
  const gain = currentValue - investment.investedAmount;
  const gainPercentage = ((gain / investment.investedAmount) * 100).toFixed(2);
  const isProfit = gain >= 0;

  return (
    <Surface style={[styles.investmentCard, shadows.small]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeIcon, {
          backgroundColor: isProfit ? theme.colors.success + '20' : theme.colors.error + '20'
        }]}>
          <Icon 
            name={investment.type === 'stocks' ? 'chart-line' : 
                  investment.type === 'mutual_funds' ? 'chart-pie' :
                  investment.type === 'fixed_deposit' ? 'bank' : 'gold'}
            size={24}
            color={isProfit ? theme.colors.success : theme.colors.error}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.investmentName}>{investment.name}</Text>
          <Text style={styles.investmentType}>{investment.type.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Invested</Text>
          <Text style={styles.detailValue}>{formatCurrency(investment.investedAmount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Value</Text>
          <Text style={[styles.detailValue, { fontWeight: 'bold' }]}>
            {formatCurrency(currentValue)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Gain/Loss</Text>
          <Text style={[styles.detailValue, {
            color: isProfit ? theme.colors.success : theme.colors.error,
            fontWeight: 'bold'
          }]}>
            {isProfit ? '+' : ''}{formatCurrency(gain)} ({isProfit ? '+' : ''}{gainPercentage}%)
          </Text>
        </View>
      </View>
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
  summaryCard: {
    margin: 20,
    marginBottom: 0,
    borderRadius: theme.roundness * 2,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 24,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 8,
  },
  gainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gainText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
    fontWeight: '600',
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
  investmentCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  investmentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  investmentType: {
    fontSize: 12,
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  cardDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.placeholder,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: theme.colors.primary,
  },
});

export default InvestmentsScreen;
