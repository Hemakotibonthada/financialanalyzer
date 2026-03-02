import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  MenuItem,
  Button,
  Grid,
  Chip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Slider,
  Stack,
  IconButton,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const TRANSACTION_TYPES = [
  { value: 'debit', label: 'Debit (Expense)' },
  { value: 'credit', label: 'Credit (Income)' },
  { value: 'transfer', label: 'Transfer' }
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' }
];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'last90days', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' }
];

const TransactionFilters = ({ filters, onFilterChange, availableFilters = {} }) => {
  const [localFilters, setLocalFilters] = useState(filters || {});
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [amountRange, setAmountRange] = useState([0, 10000]);

  useEffect(() => {
    if (availableFilters.amountRange) {
      setAmountRange([
        availableFilters.amountRange.minAmount || 0,
        availableFilters.amountRange.maxAmount || 10000
      ]);
    }
  }, [availableFilters]);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
  };

  const handleClearFilters = () => {
    const cleared = {};
    setLocalFilters(cleared);
    setShowCustomDateRange(false);
    onFilterChange(cleared);
  };

  const handleDateRangeChange = (value) => {
    handleFilterChange('dateRange', value);
    setShowCustomDateRange(value === 'custom');
  };

  const handleAmountRangeChange = (event, newValue) => {
    setAmountRange(newValue);
    handleFilterChange('minAmount', newValue[0]);
    handleFilterChange('maxAmount', newValue[1]);
  };

  const getActiveFilterCount = () => {
    return Object.keys(localFilters).filter(
      key => localFilters[key] && localFilters[key].length > 0
    ).length;
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterListIcon color="primary" />
          <Typography variant="h6">Filters</Typography>
          {getActiveFilterCount() > 0 && (
            <Chip
              label={`${getActiveFilterCount()} active`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Box>
          <Button
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            disabled={getActiveFilterCount() === 0}
            size="small"
          >
            Clear All
          </Button>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleApplyFilters}
            sx={{ ml: 1 }}
            size="small"
          >
            Apply Filters
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        {/* Search */}
        <Grid size={12}>
          <TextField
            fullWidth
            label="Search"
            placeholder="Search transactions..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>

        {/* Date Range Preset */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={localFilters.dateRange || ''}
              onChange={(e) => handleDateRangeChange(e.target.value)}
              label="Date Range"
            >
              <MenuItem value="">All Time</MenuItem>
              {DATE_RANGES.map(range => (
                <MenuItem key={range.value} value={range.value}>
                  {range.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Custom Date Range */}
        {showCustomDateRange && (
          <>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={localFilters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={localFilters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </>
        )}

        {/* Transaction Type */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <InputLabel>Transaction Type</InputLabel>
            <Select
              multiple
              value={localFilters.type || []}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              input={<OutlinedInput label="Transaction Type" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={TRANSACTION_TYPES.find(t => t.value === value)?.label}
                      size="small"
                    />
                  ))}
                </Box>
              )}
            >
              {TRANSACTION_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Checkbox checked={(localFilters.type || []).indexOf(type.value) > -1} />
                  <ListItemText primary={type.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Categories */}
        {availableFilters.categories && availableFilters.categories.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Categories</InputLabel>
              <Select
                multiple
                value={localFilters.category || []}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                input={<OutlinedInput label="Categories" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableFilters.categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    <Checkbox checked={(localFilters.category || []).indexOf(category) > -1} />
                    <ListItemText primary={category} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Payment Methods */}
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl fullWidth>
            <InputLabel>Payment Method</InputLabel>
            <Select
              multiple
              value={localFilters.paymentMethod || []}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
              input={<OutlinedInput label="Payment Method" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={PAYMENT_METHODS.find(m => m.value === value)?.label}
                      size="small"
                    />
                  ))}
                </Box>
              )}
            >
              {PAYMENT_METHODS.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  <Checkbox checked={(localFilters.paymentMethod || []).indexOf(method.value) > -1} />
                  <ListItemText primary={method.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Amount Range */}
        <Grid size={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Amount Range</Typography>
              {(localFilters.minAmount || localFilters.maxAmount) && (
                <Chip
                  label={`${localFilters.minAmount || 0} - ${localFilters.maxAmount || amountRange[1]}`}
                  size="small"
                  sx={{ ml: 2 }}
                />
              )}
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2} direction="row" alignItems="center">
                <Typography variant="body2" sx={{ minWidth: 80 }}>
                  ${amountRange[0]}
                </Typography>
                <Slider
                  value={amountRange}
                  onChange={handleAmountRangeChange}
                  valueLabelDisplay="auto"
                  min={availableFilters.amountRange?.minAmount || 0}
                  max={availableFilters.amountRange?.maxAmount || 10000}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right' }}>
                  ${amountRange[1]}
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Advanced Filters */}
        <Grid size={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Advanced Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Recurring</InputLabel>
                    <Select
                      value={localFilters.isRecurring || ''}
                      onChange={(e) => handleFilterChange('isRecurring', e.target.value)}
                      label="Recurring"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="true">Recurring Only</MenuItem>
                      <MenuItem value="false">Non-Recurring Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Verified</InputLabel>
                    <Select
                      value={localFilters.isVerified || ''}
                      onChange={(e) => handleFilterChange('isVerified', e.target.value)}
                      label="Verified"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="true">Verified Only</MenuItem>
                      <MenuItem value="false">Unverified Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Merchant Name"
                    value={localFilters.merchantName || ''}
                    onChange={(e) => handleFilterChange('merchantName', e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={localFilters.location || ''}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && (
        <Box mt={2}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Active Filters:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
            {Object.entries(localFilters).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              
              const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
              
              return (
                <Chip
                  key={key}
                  label={`${key}: ${displayValue}`}
                  onDelete={() => handleFilterChange(key, Array.isArray(value) ? [] : '')}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default TransactionFilters;
