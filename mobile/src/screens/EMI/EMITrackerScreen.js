import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  Title,
  Subheading,
  ActivityIndicator,
  FAB,
  Chip,
} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { emiService } from '../../services/api';
import { theme, gradients, shadows } from '../../theme';
import { format } from 'date-fns';

const EMITrackerScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emis, setEmis] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchEMIs = async () => {
    try {
      const response = await emiService.getEMIs({ status: filter !== 'all' ? filter : undefined });
      setEmis(response.data?.emis || []);
    } catch (error) {
      console.error('Error fetching EMIs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEMIs();
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEMIs();
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

  const totalEMI = emis.reduce((sum, emi) => sum + (emi.emiAmount || 0), 0);
  const activeCount = emis.filter(e => e.status === 'active').length;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Stats */}
        <Surface style={[styles.headerCard, shadows.medium]}>
          <LinearGradient
            colors={gradients.blue}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerLabel}>Total Monthly EMI</Text>
                <Title style={styles.headerAmount}>{formatCurrency(totalEMI)}</Title>
              </View>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{activeCount}</Text>
                <Text style={styles.headerBadgeLabel}>Active</Text>
              </View>
            </View>
          </LinearGradient>
        </Surface>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
        >
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={styles.filterChip}
          >
            All
          </Chip>
          <Chip
            selected={filter === 'active'}
            onPress={() => setFilter('active')}
            style={styles.filterChip}
          >
            Active
          </Chip>
          <Chip
            selected={filter === 'completed'}
            onPress={() => setFilter('completed')}
            style={styles.filterChip}
          >
            Completed
          </Chip>
        </ScrollView>

        {/* EMI List */}
        <View style={styles.listContainer}>
          {emis.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="credit-card-off-outline" size={64} color={theme.colors.placeholder} />
              <Text style={styles.emptyText}>No EMIs found</Text>
            </View>
          ) : (
            emis.map((emi) => <EMICard key={emi._id} emi={emi} />)
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

const EMICard = ({ emi }) => {
  const formatCurrency = (amount) => `₹${amount?.toLocaleString('en-IN') || '0'}`;
  const progress = ((emi.paidInstallments || 0) / (emi.totalInstallments || 1)) * 100;

  return (
    <Surface style={[styles.emiCard, shadows.small]}>
      <View style={styles.emiHeader}>
        <View style={styles.emiIcon}>
          <Icon name="credit-card" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.emiInfo}>
          <Text style={styles.emiTitle}>{emi.loanType}</Text>
          <Text style={styles.emiBank}>{emi.bankName || emi.lender}</Text>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: emi.status === 'active' ? theme.colors.success + '20' : theme.colors.placeholder + '20' 
        }]}>
          <Text style={[styles.statusText, {
            color: emi.status === 'active' ? theme.colors.success : theme.colors.placeholder
          }]}>
            {emi.status}
          </Text>
        </View>
      </View>

      <View style={styles.emiDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>EMI Amount</Text>
          <Text style={styles.detailValue}>{formatCurrency(emi.emiAmount)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Next Due</Text>
          <Text style={styles.detailValue}>
            {emi.nextDueDate ? format(new Date(emi.nextDueDate), 'dd MMM yyyy') : 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {emi.paidInstallments || 0}/{emi.totalInstallments || 0} paid
        </Text>
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
  headerCard: {
    margin: 20,
    marginBottom: 0,
    borderRadius: theme.roundness * 2,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  headerAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.roundness,
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerBadgeLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
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
  emiCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
  },
  emiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emiInfo: {
    flex: 1,
  },
  emiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  emiBank: {
    fontSize: 14,
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.roundness,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  emiDetails: {
    marginBottom: 16,
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
    fontWeight: '500',
    color: theme.colors.text,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.placeholder,
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: theme.colors.primary,
  },
});

export default EMITrackerScreen;
