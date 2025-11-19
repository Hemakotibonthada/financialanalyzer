import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { Searchbar, FAB, Card, Chip, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { theme } from '../../theme';

const API_URL = 'http://localhost:5001/api';
const screenWidth = Dimensions.get('window').width;

export default function LenderDashboardScreen({ navigation }) {
  const [loans, setLoans] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboard, setDashboard] = useState({
    totalLoaned: 0,
    totalReceived: 0,
    pendingAmount: 0,
    activeLoans: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterLoans();
  }, [searchQuery, loans]);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [loansRes, dashboardRes] = await Promise.all([
        axios.get(`${API_URL}/lender`, { headers }),
        axios.get(`${API_URL}/lender/dashboard`, { headers }),
      ]);

      setLoans(loansRes.data.loans || []);
      setDashboard(dashboardRes.data);
    } catch (error) {
      console.error('Error fetching lender data:', error);
      Alert.alert('Error', 'Failed to load lender dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterLoans = () => {
    if (!searchQuery) {
      setFilteredLoans(loans);
      return;
    }

    const filtered = loans.filter(
      (loan) =>
        loan.borrowerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.loanType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.purpose?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredLoans(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Loan',
      'Are you sure you want to delete this loan record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`${API_URL}/lender/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Loan deleted successfully');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete loan');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return theme.colors.info;
      case 'partially_paid':
        return theme.colors.warning;
      case 'fully_paid':
        return theme.colors.success;
      case 'defaulted':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderLoanItem = ({ item }) => {
    const progress = item.principalAmount > 0 
      ? (item.paidAmount / item.principalAmount) * 100 
      : 0;

    return (
      <Card style={styles.loanCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.borrowerInfo}>
              <Icon name="account-circle" size={40} color={theme.colors.primary} />
              <View style={styles.borrowerDetails}>
                <Text style={styles.borrowerName}>{item.borrowerName}</Text>
                <Text style={styles.loanType}>{item.loanType || 'Personal Loan'}</Text>
              </View>
            </View>
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                { backgroundColor: getStatusColor(item.status) },
              ]}
              textStyle={styles.chipText}
            >
              {item.status?.replace('_', ' ')}
            </Chip>
          </View>

          <View style={styles.amountContainer}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Principal:</Text>
              <Text style={styles.amountValue}>
                ₹{item.principalAmount?.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Paid:</Text>
              <Text style={[styles.amountValue, { color: theme.colors.success }]}>
                ₹{item.paidAmount?.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Remaining:</Text>
              <Text style={[styles.amountValue, { color: theme.colors.error }]}>
                ₹{(item.principalAmount - item.paidAmount).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: theme.colors.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progress.toFixed(1)}% paid</Text>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Icon name="calendar-start" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>
                {item.loanDate ? format(new Date(item.loanDate), 'dd MMM yyyy') : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="calendar-end" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>
                {item.dueDate ? format(new Date(item.dueDate), 'dd MMM yyyy') : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="percent" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>{item.interestRate || 0}% interest</Text>
            </View>
            <View style={styles.detailItem}>
              <Icon name="phone" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.detailText}>{item.contactNumber || 'N/A'}</Text>
            </View>
          </View>

          {item.purpose && (
            <Text style={styles.purpose} numberOfLines={2}>
              Purpose: {item.purpose}
            </Text>
          )}
        </Card.Content>

        <Card.Actions>
          <Button
            mode="text"
            onPress={() => navigation.navigate('RecordRepayment', { loanId: item._id })}
          >
            Add Repayment
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('EditLoan', { loanId: item._id })}
          >
            Edit
          </Button>
          <Button
            mode="text"
            textColor={theme.colors.error}
            onPress={() => handleDelete(item._id)}
          >
            Delete
          </Button>
        </Card.Actions>
      </Card>
    );
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
      {/* Dashboard Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dashboardContainer}
        contentContainerStyle={styles.dashboardContent}
      >
        <Card style={[styles.dashboardCard, { backgroundColor: theme.colors.primary }]}>
          <Card.Content>
            <Icon name="cash-multiple" size={32} color="#FFFFFF" />
            <Text style={styles.dashboardLabel}>Total Loaned</Text>
            <Text style={styles.dashboardValue}>
              ₹{dashboard.totalLoaned?.toLocaleString('en-IN') || 0}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.dashboardCard, { backgroundColor: theme.colors.success }]}>
          <Card.Content>
            <Icon name="cash-check" size={32} color="#FFFFFF" />
            <Text style={styles.dashboardLabel}>Received</Text>
            <Text style={styles.dashboardValue}>
              ₹{dashboard.totalReceived?.toLocaleString('en-IN') || 0}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.dashboardCard, { backgroundColor: theme.colors.warning }]}>
          <Card.Content>
            <Icon name="clock-outline" size={32} color="#FFFFFF" />
            <Text style={styles.dashboardLabel}>Pending</Text>
            <Text style={styles.dashboardValue}>
              ₹{dashboard.pendingAmount?.toLocaleString('en-IN') || 0}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.dashboardCard, { backgroundColor: theme.colors.info }]}>
          <Card.Content>
            <Icon name="account-multiple" size={32} color="#FFFFFF" />
            <Text style={styles.dashboardLabel}>Active Loans</Text>
            <Text style={styles.dashboardValue}>{dashboard.activeLoans || 0}</Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search loans..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Loans List */}
      <FlatList
        data={filteredLoans}
        renderItem={renderLoanItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="hand-coin-outline" size={64} color={theme.colors.disabled} />
            <Text style={styles.emptyText}>No loans found</Text>
            <Text style={styles.emptySubtext}>
              Start tracking your loans given to others
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Loan"
        onPress={() => navigation.navigate('AddLoan')}
      />
    </View>
  );
}

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
  dashboardContainer: {
    maxHeight: 140,
  },
  dashboardContent: {
    padding: 16,
  },
  dashboardCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 12,
  },
  dashboardLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
    opacity: 0.9,
  },
  dashboardValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
  },
  searchbar: {
    backgroundColor: theme.colors.surface,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  loanCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  borrowerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  borrowerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  borrowerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loanType: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    height: 24,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  amountContainer: {
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.disabled,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  purpose: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});
