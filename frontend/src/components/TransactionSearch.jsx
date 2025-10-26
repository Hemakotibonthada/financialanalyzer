import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingIcon,
  History as HistoryIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { debounce } from 'lodash';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * TransactionSearch Component
 * Full-featured search component with autocomplete, filters, and results
 */
const TransactionSearch = ({ onSelectTransaction, compact = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [popularTerms, setPopularTerms] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Save search to recent searches
  const saveRecentSearch = (query) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Fetch popular terms on mount
  useEffect(() => {
    fetchPopularTerms();
  }, []);

  // Fetch popular search terms
  const fetchPopularTerms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/search/popular`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setPopularTerms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch popular terms:', error);
    }
  };

  // Fetch suggestions (debounced)
  const fetchSuggestions = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/search/suggestions`, {
          params: { q: query },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setSuggestions(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      }
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.length >= 2) {
      setShowSuggestions(true);
      fetchSuggestions(value);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Perform search
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;

    setLoading(true);
    setShowSuggestions(false);
    saveRecentSearch(query);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/search/transactions`, {
        params: { q: query, limit: 50, sortBy: 'relevance' },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ results: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Handle global search
  const handleGlobalSearch = async (query = searchQuery) => {
    if (!query.trim()) return;

    setLoading(true);
    setShowSuggestions(false);
    saveRecentSearch(query);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/search/global`, {
        params: { q: query, limit: 20 },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (error) {
      console.error('Global search failed:', error);
      setSearchResults({ transactions: [], documents: [], emis: [], bills: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Handle quick search
  const handleQuickSearch = async (type) => {
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/search/quick/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSearchResults(response.data.data);
        setSearchQuery(`Quick: ${type}`);
      }
    } catch (error) {
      console.error('Quick search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion.value);
    setShowSuggestions(false);
    handleSearch(suggestion.value);
  };

  // Handle clear search
  const handleClear = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Format amount
  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  // Render search input
  const renderSearchInput = () => (
    <TextField
      fullWidth
      placeholder="Search transactions, merchants, categories..."
      value={searchQuery}
      onChange={handleSearchChange}
      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: searchQuery && (
          <InputAdornment position="end">
            <IconButton size="small" onClick={handleClear}>
              <CloseIcon />
            </IconButton>
          </InputAdornment>
        )
      }}
      sx={{ mb: 2 }}
    />
  );

  // Render suggestions dropdown
  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          maxHeight: 400,
          overflow: 'auto'
        }}
      >
        <List>
          {suggestions.map((suggestion, index) => (
            <ListItemButton
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <ListItemText
                primary={suggestion.value}
                secondary={suggestion.type}
              />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    );
  };

  // Render quick search buttons
  const renderQuickSearches = () => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Quick Searches
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label="Recent (7 days)"
          onClick={() => handleQuickSearch('recent')}
          icon={<HistoryIcon />}
          variant="outlined"
        />
        <Chip
          label="Large Transactions"
          onClick={() => handleQuickSearch('large')}
          icon={<TrendingIcon />}
          variant="outlined"
        />
        <Chip
          label="Recurring"
          onClick={() => handleQuickSearch('recurring')}
          icon={<FilterIcon />}
          variant="outlined"
        />
        <Chip
          label="Unverified"
          onClick={() => handleQuickSearch('unverified')}
          icon={<SettingsIcon />}
          variant="outlined"
        />
      </Box>
    </Box>
  );

  // Render popular terms
  const renderPopularTerms = () => {
    if (!popularTerms) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Popular Searches
        </Typography>
        
        {popularTerms.merchants?.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Merchants
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {popularTerms.merchants.slice(0, 5).map((term, index) => (
                <Chip
                  key={index}
                  label={term.value}
                  size="small"
                  onClick={() => {
                    setSearchQuery(term.value);
                    handleSearch(term.value);
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {popularTerms.categories?.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Categories
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {popularTerms.categories.slice(0, 5).map((term, index) => (
                <Chip
                  key={index}
                  label={term.value}
                  size="small"
                  onClick={() => {
                    setSearchQuery(term.value);
                    handleSearch(term.value);
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  // Render recent searches
  const renderRecentSearches = () => {
    if (recentSearches.length === 0) return null;

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Recent Searches
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {recentSearches.slice(0, 5).map((query, index) => (
            <Chip
              key={index}
              label={query}
              size="small"
              onDelete={() => {
                const updated = recentSearches.filter((_, i) => i !== index);
                setRecentSearches(updated);
                localStorage.setItem('recentSearches', JSON.stringify(updated));
              }}
              onClick={() => {
                setSearchQuery(query);
                handleSearch(query);
              }}
            />
          ))}
        </Box>
      </Box>
    );
  };

  // Render search results
  const renderResults = () => {
    if (!searchResults) return null;

    // Transaction search results
    if (searchResults.results) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Found {searchResults.total} transactions
          </Typography>
          
          {searchResults.results.length === 0 ? (
            <Typography color="text.secondary">
              No transactions found matching your search.
            </Typography>
          ) : (
            <List>
              {searchResults.results.map((transaction) => (
                <React.Fragment key={transaction._id}>
                  <ListItem
                    button
                    onClick={() => onSelectTransaction && onSelectTransaction(transaction)}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1">
                            {transaction.description || transaction.merchantName || 'No description'}
                          </Typography>
                          <Typography
                            variant="h6"
                            color={transaction.type === 'credit' ? 'success.main' : 'error.main'}
                          >
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatAmount(transaction.amount, transaction.currency)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(transaction.date).toLocaleDateString()} • {transaction.category}
                          </Typography>
                          {transaction.merchantName && (
                            <Typography variant="caption" color="text.secondary">
                              {transaction.merchantName}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      );
    }

    // Global search results
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Found {searchResults.total} results across all categories
        </Typography>
        
        <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} sx={{ mb: 2 }}>
          <Tab label={`Transactions (${searchResults.transactions?.length || 0})`} />
          <Tab label={`Documents (${searchResults.documents?.length || 0})`} />
          <Tab label={`EMIs (${searchResults.emis?.length || 0})`} />
          <Tab label={`Bills (${searchResults.bills?.length || 0})`} />
        </Tabs>

        {selectedTab === 0 && renderTransactionResults(searchResults.transactions)}
        {selectedTab === 1 && renderDocumentResults(searchResults.documents)}
        {selectedTab === 2 && renderEMIResults(searchResults.emis)}
        {selectedTab === 3 && renderBillResults(searchResults.bills)}
      </Box>
    );
  };

  const renderTransactionResults = (transactions) => {
    if (!transactions || transactions.length === 0) {
      return <Typography color="text.secondary">No transactions found.</Typography>;
    }

    return (
      <List>
        {transactions.map((transaction) => (
          <ListItem key={transaction._id}>
            <ListItemText
              primary={transaction.description || 'No description'}
              secondary={`${new Date(transaction.date).toLocaleDateString()} • ${formatAmount(transaction.amount)}`}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderDocumentResults = (documents) => {
    if (!documents || documents.length === 0) {
      return <Typography color="text.secondary">No documents found.</Typography>;
    }

    return (
      <List>
        {documents.map((doc) => (
          <ListItem key={doc._id}>
            <ListItemText
              primary={doc.filename || doc.originalFilename}
              secondary={`Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}`}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderEMIResults = (emis) => {
    if (!emis || emis.length === 0) {
      return <Typography color="text.secondary">No EMIs found.</Typography>;
    }

    return (
      <List>
        {emis.map((emi) => (
          <ListItem key={emi._id}>
            <ListItemText
              primary={emi.lender || emi.loanType}
              secondary={`${formatAmount(emi.emiAmount)} • ${emi.remainingInstallments} remaining`}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderBillResults = (bills) => {
    if (!bills || bills.length === 0) {
      return <Typography color="text.secondary">No bills found.</Typography>;
    }

    return (
      <List>
        {bills.map((bill) => (
          <ListItem key={bill._id}>
            <ListItemText
              primary={bill.name}
              secondary={`${formatAmount(bill.amount)} • Due: ${new Date(bill.dueDate).toLocaleDateString()}`}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  // Compact view (search bar only)
  if (compact) {
    return (
      <Box sx={{ position: 'relative' }}>
        {renderSearchInput()}
        {renderSuggestions()}
      </Box>
    );
  }

  // Full view with all features
  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardContent>
          <Box sx={{ position: 'relative' }}>
            {renderSearchInput()}
            {renderSuggestions()}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => handleSearch()}
              disabled={!searchQuery.trim() || loading}
            >
              Search Transactions
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleGlobalSearch()}
              disabled={!searchQuery.trim() || loading}
            >
              Global Search
            </Button>
          </Box>

          {!searchResults && (
            <>
              {renderRecentSearches()}
              {renderQuickSearches()}
              {renderPopularTerms()}
            </>
          )}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {!loading && renderResults()}
        </CardContent>
      </Card>
    </Box>
  );
};

export default TransactionSearch;
