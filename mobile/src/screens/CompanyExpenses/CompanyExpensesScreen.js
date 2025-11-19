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
} from 'react-native';
import { Searchbar, FAB, Card, Chip, Menu, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parse } from 'date-fns';
import { theme } from '../../theme';

const API_URL = 'http://localhost:5001/api';

export default function CompanyExpensesScreen({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    expenseCount: 0,
  });
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [searchQuery, expenses, selectedFilter]);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [expensesRes, analyticsRes] = await Promise.all([
        axios.get(`${API_URL}/company-expenses`, { headers }),
        axios.get(`${API_URL}/company-expenses/analytics`, { headers }),
      ]);

      setExpenses(expensesRes.data.expenses || []);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterExpenses = () => {
    let filtered = expenses;

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(
        (exp) => exp.paymentStatus.toLowerCase() === selectedFilter
      );
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (exp) =>
          exp.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exp.department?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredExpenses(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`${API_URL}/company-expenses/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Expense deleted successfully');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const renderExpenseItem = ({ item }) => (
    <Card style={styles.expenseCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.expenseTitle}>{item.title}</Text>
          <Chip
            mode="flat"
            style={[
              styles.statusChip,
              {
                backgroundColor:
                  item.paymentStatus === 'Paid'
                    ? theme.colors.success
                    : item.paymentStatus === 'Pending'
                    ? theme.colors.warning
                    : theme.colors.error,
              },
            ]}
            textStyle={styles.chipText}
          >
            {item.paymentStatus}
          </Chip>
        </View>

        <View style={styles.expenseDetails}>
          <View style={styles.detailRow}>
            <Icon name="cash" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              ₹{item.amountInINR?.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="tag" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>{item.category || 'Uncategorized'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="office-building" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>{item.department || 'General'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              {item.expenseDate
                ? format(new Date(item.expenseDate), 'dd MMM yyyy')
                : 'N/A'}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </Card.Content>

      <Card.Actions>
        <Button
          mode="text"
          onPress={() =>
            navigation.navigate('EditExpense', { expenseId: item._id })
          }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Analytics Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.analyticsContainer}
        contentContainerStyle={styles.analyticsContent}
      >
        <Card style={[styles.analyticsCard, { backgroundColor: theme.colors.primary }]}>
          <Card.Content>
            <Text style={styles.analyticsLabel}>Total</Text>
            <Text style={styles.analyticsValue}>
              ₹{analytics.totalAmount?.toLocaleString('en-IN') || 0}
            </Text>
            <Text style={styles.analyticsCount}>
              {analytics.expenseCount || 0} expenses
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.analyticsCard, { backgroundColor: theme.colors.success }]}>
          <Card.Content>
            <Text style={styles.analyticsLabel}>Paid</Text>
            <Text style={styles.analyticsValue}>
              ₹{analytics.paidAmount?.toLocaleString('en-IN') || 0}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.analyticsCard, { backgroundColor: theme.colors.warning }]}>
          <Card.Content>
            <Text style={styles.analyticsLabel}>Pending</Text>
            <Text style={styles.analyticsValue}>
              ₹{analytics.pendingAmount?.toLocaleString('en-IN') || 0}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search expenses..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFilterMenuVisible(true)}
            >
              <Icon name="filter-variant" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => {
              setSelectedFilter('all');
              setFilterMenuVisible(false);
            }}
            title="All"
            leadingIcon="check-all"
          />
          <Menu.Item
            onPress={() => {
              setSelectedFilter('paid');
              setFilterMenuVisible(false);
            }}
            title="Paid"
            leadingIcon="check-circle"
          />
          <Menu.Item
            onPress={() => {
              setSelectedFilter('pending');
              setFilterMenuVisible(false);
            }}
            title="Pending"
            leadingIcon="clock-outline"
          />
        </Menu>
      </View>

      {/* Expenses List */}
      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={64} color={theme.colors.disabled} />
            <Text style={styles.emptyText}>No expenses found</Text>
          </View>
        }
      />

      {/* FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddExpense')}
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
  analyticsContainer: {
    maxHeight: 120,
  },
  analyticsContent: {
    padding: 16,
  },
  analyticsCard: {
    width: 160,
    marginRight: 12,
    borderRadius: 12,
  },
  analyticsLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
  analyticsValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  analyticsCount: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchbar: {
    flex: 1,
    marginRight: 8,
  },
  filterButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  expenseCard: {
    marginBottom: 12,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  statusChip: {
    height: 24,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  expenseDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
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
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});
