import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Chip, IconButton,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Tabs, Tab, Switch, FormControlLabel, LinearProgress, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  ToggleButton, ToggleButtonGroup, Alert, Slider, Avatar, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails, Radio, RadioGroup,
  CircularProgress
} from '@mui/material';
import {
  AccountBalance, Calculate, TrendingUp, TrendingDown, ExpandMore,
  Info, Download, Refresh, CompareArrows, CheckCircle, Warning,
  Lightbulb, ArrowForward, Add, Remove, Assessment, CalendarMonth,
  Receipt, LocalAtm, Savings, House, School as SchoolIcon, HealthAndSafety,
  CreditCard, EmojiEvents, Star
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Legend, PieChart, Pie, Cell, Tooltip as RechartsTooltip
} from 'recharts';
import api from '../services/api';
import '../styles/animations.css';

// ============================================================
// Feature #100: Tax Planning & Optimization Page
// ============================================================

// Indian Tax Slabs (FY 2024-25) — these are official GOI rates
const NEW_REGIME_SLABS = [
  { min: 0, max: 300000, rate: 0, label: 'Up to ₹3L' },
  { min: 300001, max: 700000, rate: 5, label: '₹3L - ₹7L' },
  { min: 700001, max: 1000000, rate: 10, label: '₹7L - ₹10L' },
  { min: 1000001, max: 1200000, rate: 15, label: '₹10L - ₹12L' },
  { min: 1200001, max: 1500000, rate: 20, label: '₹12L - ₹15L' },
  { min: 1500001, max: Infinity, rate: 30, label: 'Above ₹15L' },
];

const OLD_REGIME_SLABS = [
  { min: 0, max: 250000, rate: 0, label: 'Up to ₹2.5L' },
  { min: 250001, max: 500000, rate: 5, label: '₹2.5L - ₹5L' },
  { min: 500001, max: 1000000, rate: 20, label: '₹5L - ₹10L' },
  { min: 1000001, max: Infinity, rate: 30, label: 'Above ₹10L' },
];

// Deduction sections — official Indian Income Tax deduction limits
const DEDUCTION_SECTIONS = [
  {
    section: '80C',
    title: 'Section 80C',
    maxLimit: 150000,
    description: 'Deduction for investments in specified instruments',
    items: [
      { name: 'ELSS Mutual Funds', limit: 150000, icon: '📈', recommended: true },
      { name: 'PPF (Public Provident Fund)', limit: 150000, icon: '🏦', recommended: true },
      { name: 'EPF (Employee Provident Fund)', limit: 150000, icon: '💼', recommended: false },
      { name: 'NSC (National Savings Certificate)', limit: 150000, icon: '📜', recommended: false },
      { name: 'Life Insurance Premium', limit: 150000, icon: '🛡️', recommended: false },
      { name: 'Sukanya Samriddhi Yojana', limit: 150000, icon: '👧', recommended: true },
      { name: 'ULIP', limit: 150000, icon: '📊', recommended: false },
      { name: '5-Year Tax Saving FD', limit: 150000, icon: '🏧', recommended: false },
      { name: 'Tuition Fees (2 children)', limit: 150000, icon: '🎓', recommended: false },
      { name: 'Home Loan Principal', limit: 150000, icon: '🏠', recommended: false },
    ],
  },
  {
    section: '80CCD(1B)',
    title: 'Section 80CCD(1B)',
    maxLimit: 50000,
    description: 'Additional NPS contribution',
    items: [
      { name: 'National Pension System (NPS)', limit: 50000, icon: '🏖️', recommended: true },
    ],
  },
  {
    section: '80D',
    title: 'Section 80D',
    maxLimit: 100000,
    description: 'Health insurance premium deduction',
    items: [
      { name: 'Self & Family Health Insurance', limit: 25000, icon: '🏥', recommended: true },
      { name: 'Parents Health Insurance (< 60)', limit: 25000, icon: '👨‍👩‍👦', recommended: true },
      { name: 'Parents Health Insurance (≥ 60)', limit: 50000, icon: '👴', recommended: true },
      { name: 'Preventive Health Check-up', limit: 5000, icon: '🩺', recommended: false },
    ],
  },
  {
    section: '24B',
    title: 'Section 24(b)',
    maxLimit: 200000,
    description: 'Home loan interest deduction',
    items: [
      { name: 'Home Loan Interest (Self-occupied)', limit: 200000, icon: '🏠', recommended: true },
    ],
  },
  {
    section: '80E',
    title: 'Section 80E',
    maxLimit: Infinity,
    description: 'Education loan interest (no upper limit)',
    items: [
      { name: 'Education Loan Interest', limit: Infinity, icon: '🎓', recommended: false },
    ],
  },
  {
    section: '80G',
    title: 'Section 80G',
    maxLimit: Infinity,
    description: 'Donations to charitable organizations',
    items: [
      { name: 'PM National Relief Fund (100%)', limit: Infinity, icon: '🇮🇳', recommended: false },
      { name: 'Other Charitable Donations (50%)', limit: Infinity, icon: '🤝', recommended: false },
    ],
  },
  {
    section: '80TTA',
    title: 'Section 80TTA',
    maxLimit: 10000,
    description: 'Savings account interest deduction',
    items: [
      { name: 'Savings Account Interest', limit: 10000, icon: '💰', recommended: false },
    ],
  },
];

// HRA Calculator inputs
const HRA_DEFAULTS = {
  basicSalary: 50000,
  hraReceived: 20000,
  rentPaid: 25000,
  isMetro: true,
};

// Tax calendar events — standard Indian tax filing dates
const TAX_CALENDAR = [
  { date: 'Jun 15', event: 'Advance Tax - Q1 (15%)', type: 'payment', important: true },
  { date: 'Jul 31', event: 'ITR Filing Deadline', type: 'deadline', important: true },
  { date: 'Sep 15', event: 'Advance Tax - Q2 (45%)', type: 'payment', important: true },
  { date: 'Oct 31', event: 'Revised Return Deadline', type: 'deadline', important: false },
  { date: 'Dec 15', event: 'Advance Tax - Q3 (75%)', type: 'payment', important: true },
  { date: 'Jan 31', event: 'Form 16B for TDS on Property', type: 'document', important: false },
  { date: 'Mar 15', event: 'Advance Tax - Q4 (100%)', type: 'payment', important: true },
  { date: 'Mar 31', event: 'Last date for Tax-saving investments', type: 'deadline', important: true },
  { date: 'Apr 30', event: 'Employer issues Form 16', type: 'document', important: false },
  { date: 'Jun 15', event: 'TDS on Salary certificates due', type: 'document', important: false },
];

const TaxPlanner = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [regime, setRegime] = useState('new');
  const [grossIncome, setGrossIncome] = useState(1200000);
  const [deductions, setDeductions] = useState({
    '80C': 0,
    '80CCD': 0,
    '80D_self': 0,
    '80D_parents': 0,
    '24B': 0,
    '80E': 0,
    '80G': 0,
    '80TTA': 0,
    'HRA': 0,
    'standardDeduction': 50000,
  });
  const [hraInputs, setHraInputs] = useState(HRA_DEFAULTS);
  const [expandedSection, setExpandedSection] = useState('80C');

  // Suggestions state — fetched from API
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);

  const formatCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  // Calculate HRA Exemption
  const calculateHRA = useMemo(() => {
    const { basicSalary, hraReceived, rentPaid, isMetro } = hraInputs;
    const annual = {
      basic: basicSalary * 12,
      hra: hraReceived * 12,
      rent: rentPaid * 12,
    };
    const exemption1 = annual.hra;
    const exemption2 = annual.rent - 0.1 * annual.basic;
    const exemption3 = (isMetro ? 0.5 : 0.4) * annual.basic;
    return Math.max(0, Math.min(exemption1, exemption2, exemption3));
  }, [hraInputs]);

  // Calculate tax
  const calculateTax = useCallback((income, regimeType) => {
    const slabs = regimeType === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
    let taxableIncome = income;

    // Apply deductions for old regime
    if (regimeType === 'old') {
      const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0) + calculateHRA;
      taxableIncome = Math.max(0, income - totalDeductions);
    } else {
      // New regime only gets standard deduction of ₹75,000
      taxableIncome = Math.max(0, income - 75000);
    }

    let tax = 0;
    let remaining = taxableIncome;

    for (const slab of slabs) {
      if (remaining <= 0) break;
      const taxable = Math.min(remaining, slab.max - slab.min + 1);
      tax += taxable * (slab.rate / 100);
      remaining -= taxable;
    }

    // Rebate u/s 87A
    if (regimeType === 'new' && taxableIncome <= 700000) {
      tax = Math.max(0, tax - 25000);
    } else if (regimeType === 'old' && taxableIncome <= 500000) {
      tax = Math.max(0, tax - 12500);
    }

    // Surcharge
    if (taxableIncome > 5000000 && taxableIncome <= 10000000) {
      tax *= 1.10; // 10% surcharge
    } else if (taxableIncome > 10000000 && taxableIncome <= 20000000) {
      tax *= 1.15; // 15% surcharge
    } else if (taxableIncome > 20000000 && taxableIncome <= 50000000) {
      tax *= 1.25; // 25% surcharge
    } else if (taxableIncome > 50000000) {
      tax *= 1.37; // 37% surcharge
    }

    // Health & Education Cess
    const cess = tax * 0.04;
    const totalTax = tax + cess;

    return {
      grossIncome: income,
      taxableIncome,
      tax: Math.round(tax),
      cess: Math.round(cess),
      totalTax: Math.round(totalTax),
      effectiveRate: ((totalTax / income) * 100).toFixed(2),
      monthlySalary: Math.round((income - totalTax) / 12),
    };
  }, [deductions, calculateHRA]);

  const oldRegimeTax = useMemo(() => calculateTax(grossIncome, 'old'), [grossIncome, calculateTax]);
  const newRegimeTax = useMemo(() => calculateTax(grossIncome, 'new'), [grossIncome, calculateTax]);
  const currentTax = regime === 'old' ? oldRegimeTax : newRegimeTax;
  const savings = Math.abs(oldRegimeTax.totalTax - newRegimeTax.totalTax);
  const betterRegime = oldRegimeTax.totalTax < newRegimeTax.totalTax ? 'old' : 'new';

  // Slab-wise breakdown
  const slabBreakdown = useMemo(() => {
    const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
    let remaining = currentTax.taxableIncome;
    return slabs.map(slab => {
      if (remaining <= 0) return { ...slab, taxable: 0, tax: 0 };
      const taxable = Math.min(remaining, (slab.max === Infinity ? remaining : slab.max) - slab.min + 1);
      const tax = taxable * (slab.rate / 100);
      remaining -= taxable;
      return { ...slab, taxable: Math.round(taxable), tax: Math.round(tax) };
    });
  }, [regime, currentTax]);

  // Fetch suggestions from API when suggestions tab is opened
  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const response = await api.post('/tax/suggestions', {
        grossIncome,
        deductions,
        regime,
      });
      const data = response.data;
      if (data?.success && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else if (Array.isArray(data)) {
        setSuggestions(data);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Failed to fetch tax suggestions:', error);
      setSuggestionsError('Unable to load tax suggestions. Please try again later.');
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [grossIncome, deductions, regime]);

  // Fetch suggestions when switching to the suggestions tab
  useEffect(() => {
    if (activeTab === 3) {
      fetchSuggestions();
    }
  }, [activeTab]); // intentionally not including fetchSuggestions to avoid refetching on every input change

  // Pie chart data for tax breakdown
  const pieData = [
    { name: 'Take Home', value: grossIncome - currentTax.totalTax, color: '#4CAF50' },
    { name: 'Income Tax', value: currentTax.tax, color: '#F44336' },
    { name: 'Cess', value: currentTax.cess, color: '#FF9800' },
  ];

  return (
    <Box sx={{ p: 3, animation: 'fadeInUp 0.6s ease-out' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Tax Planner</Typography>
          <Typography color="text.secondary">Optimize your taxes with smart planning (FY 2024-25)</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Download />}>Download Report</Button>
          <Button variant="contained" startIcon={<Calculate />}>Calculate</Button>
        </Box>
      </Box>

      {/* Regime Comparison Alert */}
      <Alert
        severity={betterRegime === regime ? 'success' : 'info'}
        sx={{ mb: 3, animation: 'fadeIn 0.5s ease-out' }}
        icon={<Lightbulb />}
        action={
          regime !== betterRegime ? (
            <Button size="small" onClick={() => setRegime(betterRegime)}>
              Switch to {betterRegime === 'old' ? 'Old' : 'New'} Regime
            </Button>
          ) : null
        }
      >
        <Typography variant="body2">
          {betterRegime === regime
            ? `You're on the optimal regime! Saving ${formatCurrency(savings)} compared to the other regime.`
            : `Switch to ${betterRegime === 'old' ? 'Old' : 'New'} regime to save ${formatCurrency(savings)} in taxes!`
          }
        </Typography>
      </Alert>

      {/* Income & Regime Selection */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Annual Gross Income</Typography>
              <TextField
                fullWidth
                type="number"
                value={grossIncome}
                onChange={(e) => setGrossIncome(Number(e.target.value))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              <Slider
                value={grossIncome}
                onChange={(_, v) => setGrossIncome(v)}
                min={300000}
                max={5000000}
                step={50000}
                marks={[
                  { value: 300000, label: '₹3L' },
                  { value: 1000000, label: '₹10L' },
                  { value: 2000000, label: '₹20L' },
                  { value: 3000000, label: '₹30L' },
                  { value: 5000000, label: '₹50L' },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Tax Regime</Typography>
              <RadioGroup row value={regime} onChange={(e) => setRegime(e.target.value)}>
                <FormControlLabel
                  value="new"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="subtitle2">New Regime (Default)</Typography>
                      <Typography variant="caption" color="text.secondary">Lower rates, fewer deductions</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="old"
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="subtitle2">Old Regime</Typography>
                      <Typography variant="caption" color="text.secondary">Higher rates, all deductions</Typography>
                    </Box>
                  }
                />
              </RadioGroup>
              {betterRegime === regime && (
                <Chip icon={<CheckCircle />} label="Recommended for your profile" color="success" size="small" sx={{ mt: 1 }} />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tax Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Gross Income', value: formatCurrency(grossIncome), color: '#2196F3', icon: <LocalAtm /> },
          { label: 'Taxable Income', value: formatCurrency(currentTax.taxableIncome), color: '#FF9800', icon: <Assessment /> },
          { label: 'Total Tax', value: formatCurrency(currentTax.totalTax), color: '#F44336', icon: <Receipt /> },
          { label: 'Monthly Take Home', value: formatCurrency(currentTax.monthlySalary), color: '#4CAF50', icon: <Savings /> },
        ].map((card, idx) => (
          <Grid size={{ xs: 6, md: 3 }} key={idx}>
            <Card sx={{ transition: 'all 0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 } }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${card.color}15`, color: card.color }}>{card.icon}</Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                  <Typography variant="h6" fontWeight={700}>{card.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Tax Breakdown" icon={<Assessment />} iconPosition="start" />
        <Tab label="Deductions" icon={<Receipt />} iconPosition="start" />
        <Tab label="Regime Comparison" icon={<CompareArrows />} iconPosition="start" />
        <Tab label="Suggestions" icon={<Lightbulb />} iconPosition="start" />
        <Tab label="Tax Calendar" icon={<CalendarMonth />} iconPosition="start" />
      </Tabs>

      {/* Tax Breakdown Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Slab-wise Tax Breakdown ({regime === 'new' ? 'New' : 'Old'} Regime)</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Income Slab</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right">Taxable Amount</TableCell>
                        <TableCell align="right">Tax</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {slabBreakdown.map((slab, idx) => (
                        <TableRow key={idx} sx={{ bgcolor: slab.tax > 0 ? 'action.hover' : 'transparent' }}>
                          <TableCell>{slab.label}</TableCell>
                          <TableCell align="right">{slab.rate}%</TableCell>
                          <TableCell align="right">{formatCurrency(slab.taxable)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: slab.tax > 0 ? 600 : 400 }}>
                            {formatCurrency(slab.tax)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'primary.50' }}>
                        <TableCell colSpan={3}><strong>Base Tax</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(currentTax.tax)}</strong></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3}>Health & Education Cess (4%)</TableCell>
                        <TableCell align="right">{formatCurrency(currentTax.cess)}</TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: 'error.50' }}>
                        <TableCell colSpan={3}><strong>Total Tax Liability</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(currentTax.totalTax)}</strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Effective Tax Rate: {currentTax.effectiveRate}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Income Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Deductions Tab */}
      {activeTab === 1 && (
        <Box>
          {regime === 'new' ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                New tax regime allows limited deductions. Only standard deduction of ₹75,000 is available.
                Switch to old regime to claim all deductions.
              </Typography>
            </Alert>
          ) : null}

          {DEDUCTION_SECTIONS.map((section) => (
            <Accordion
              key={section.section}
              expanded={expandedSection === section.section}
              onChange={() => setExpandedSection(expandedSection === section.section ? '' : section.section)}
              sx={{ mb: 1 }}
              disabled={regime === 'new' && section.section !== '80CCD(1B)'}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2, alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{section.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{section.description}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle2" fontWeight={600}>{formatCurrency(deductions[section.section.replace('(', '').replace(')', '')] || 0)}</Typography>
                    {section.maxLimit !== Infinity && (
                      <Typography variant="caption" color="text.secondary">
                        Max: {formatCurrency(section.maxLimit)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {section.items.map((item, idx) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                      <Paper
                        sx={{
                          p: 2,
                          border: item.recommended ? '1px solid' : 'none',
                          borderColor: 'success.main',
                          position: 'relative',
                        }}
                      >
                        {item.recommended && (
                          <Chip
                            label="Recommended"
                            size="small"
                            color="success"
                            sx={{ position: 'absolute', top: -10, right: 8, fontSize: '0.65rem' }}
                          />
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h5" component="span">{item.icon}</Typography>
                          <Typography variant="subtitle2" fontWeight={500}>{item.name}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Limit: {item.limit === Infinity ? 'No limit' : formatCurrency(item.limit)}
                        </Typography>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          placeholder="Enter amount"
                          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}

          {/* HRA Calculator */}
          {regime === 'old' && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>HRA Exemption Calculator</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Monthly Basic Salary"
                      type="number"
                      value={hraInputs.basicSalary}
                      onChange={(e) => setHraInputs(p => ({ ...p, basicSalary: Number(e.target.value) }))}
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Monthly HRA Received"
                      type="number"
                      value={hraInputs.hraReceived}
                      onChange={(e) => setHraInputs(p => ({ ...p, hraReceived: Number(e.target.value) }))}
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Monthly Rent Paid"
                      type="number"
                      value={hraInputs.rentPaid}
                      onChange={(e) => setHraInputs(p => ({ ...p, rentPaid: Number(e.target.value) }))}
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={hraInputs.isMetro}
                          onChange={(e) => setHraInputs(p => ({ ...p, isMetro: e.target.checked }))}
                        />
                      }
                      label="Metro City?"
                    />
                  </Grid>
                </Grid>
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    HRA Exemption: <strong>{formatCurrency(calculateHRA)}/year</strong> ({formatCurrency(calculateHRA / 12)}/month)
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Regime Comparison Tab */}
      {activeTab === 2 && (
        <Box>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{
                border: betterRegime === 'old' ? '2px solid' : '1px solid',
                borderColor: betterRegime === 'old' ? 'success.main' : 'divider',
              }}>
                <CardContent>
                  {betterRegime === 'old' && (
                    <Chip icon={<Star />} label="Better for You" color="success" size="small" sx={{ mb: 1 }} />
                  )}
                  <Typography variant="h6" fontWeight={600}>Old Tax Regime</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">Gross Income</Typography>
                    <Typography fontWeight={600}>{formatCurrency(oldRegimeTax.grossIncome)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">Taxable Income</Typography>
                    <Typography fontWeight={600}>{formatCurrency(oldRegimeTax.taxableIncome)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">Tax + Cess</Typography>
                    <Typography fontWeight={600} color="error.main">{formatCurrency(oldRegimeTax.totalTax)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">Effective Rate</Typography>
                    <Typography fontWeight={600}>{oldRegimeTax.effectiveRate}%</Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontWeight={600}>Monthly Take Home</Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {formatCurrency(oldRegimeTax.monthlySalary)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{
                border: betterRegime === 'new' ? '2px solid' : '1px solid',
                borderColor: betterRegime === 'new' ? 'success.main' : 'divider',
              }}>
                <CardContent>
                  {betterRegime === 'new' && (
                    <Chip icon={<Star />} label="Better for You" color="success" size="small" sx={{ mb: 1 }} />
                  )}
                  <Typography variant="h6" fontWeight={600}>New Tax Regime</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">Gross Income</Typography>
                    <Typography fontWeight={600}>{formatCurrency(newRegimeTax.grossIncome)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">Taxable Income</Typography>
                    <Typography fontWeight={600}>{formatCurrency(newRegimeTax.taxableIncome)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">Tax + Cess</Typography>
                    <Typography fontWeight={600} color="error.main">{formatCurrency(newRegimeTax.totalTax)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography color="text.secondary">Effective Rate</Typography>
                    <Typography fontWeight={600}>{newRegimeTax.effectiveRate}%</Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontWeight={600}>Monthly Take Home</Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {formatCurrency(newRegimeTax.monthlySalary)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Comparison Chart */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Visual Comparison</Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={[
                    { name: 'Taxable Income', old: oldRegimeTax.taxableIncome, new: newRegimeTax.taxableIncome },
                    { name: 'Total Tax', old: oldRegimeTax.totalTax, new: newRegimeTax.totalTax },
                    { name: 'Annual Take Home', old: oldRegimeTax.monthlySalary * 12, new: newRegimeTax.monthlySalary * 12 },
                  ]}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <RechartsTooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="old" fill="#FF9800" name="Old Regime" />
                  <Bar dataKey="new" fill="#2196F3" name="New Regime" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Suggestions Tab — fetched from API */}
      {activeTab === 3 && (
        <Box>
          {suggestionsLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={40} />
              <Typography color="text.secondary" sx={{ mt: 2 }}>Loading tax-saving suggestions...</Typography>
            </Box>
          ) : suggestionsError ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }} action={
                <Button size="small" startIcon={<Refresh />} onClick={fetchSuggestions}>Retry</Button>
              }>
                <Typography variant="body2">{suggestionsError}</Typography>
              </Alert>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Lightbulb sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  Tax-saving suggestions could not be loaded. Use the calculator and deductions tabs to plan independently.
                </Typography>
              </Box>
            </Box>
          ) : suggestions.length === 0 ? (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }} action={
                <Button size="small" startIcon={<Refresh />} onClick={fetchSuggestions}>Refresh</Button>
              }>
                <Typography variant="body2">
                  No personalized suggestions available right now. Add your income and deduction details for tailored recommendations.
                </Typography>
              </Alert>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Lightbulb sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">
                  Suggestions will appear here based on your financial profile.
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Alert severity="info" sx={{ flex: 1, mr: 2 }}>
                  <Typography variant="body2">
                    Based on your income of {formatCurrency(grossIncome)}, here are personalized tax-saving suggestions.
                    {suggestions.filter(s => s.priority === 'high').length > 0 && (
                      <> Following all high-priority suggestions could save you up to {formatCurrency(suggestions.filter(s => s.priority === 'high').reduce((a, s) => a + (s.savings || 0), 0))} in taxes.</>
                    )}
                  </Typography>
                </Alert>
                <Button size="small" variant="outlined" startIcon={<Refresh />} onClick={fetchSuggestions}>
                  Refresh
                </Button>
              </Box>

              <Grid container spacing={2}>
                {suggestions.map((suggestion, idx) => (
                  <Grid size={{ xs: 12, md: 6 }} key={idx}>
                    <Card sx={{
                      border: '1px solid',
                      borderColor: suggestion.priority === 'high' ? 'success.main' : suggestion.priority === 'medium' ? 'warning.main' : 'divider',
                      transition: 'all 0.3s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Chip
                            label={suggestion.priority || 'info'}
                            size="small"
                            color={suggestion.priority === 'high' ? 'success' : suggestion.priority === 'medium' ? 'warning' : 'default'}
                          />
                          {suggestion.section && <Chip label={suggestion.section} size="small" variant="outlined" />}
                        </Box>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>{suggestion.action}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {suggestion.savings ? (
                            <Typography color="success.main" fontWeight={700}>
                              Save {formatCurrency(suggestion.savings)}/year
                            </Typography>
                          ) : (
                            <Typography color="text.secondary" variant="body2">
                              See details
                            </Typography>
                          )}
                          <Button size="small" endIcon={<ArrowForward />}>Apply</Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Total Potential Savings */}
              {suggestions.some(s => s.savings > 0) && (
                <Card sx={{ mt: 3, bgcolor: 'success.50' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={600}>Total Potential Tax Savings</Typography>
                    <Typography variant="h3" fontWeight={700} color="success.main">
                      {formatCurrency(suggestions.reduce((a, s) => a + (s.savings || 0), 0))}
                    </Typography>
                    <Typography color="text.secondary">per year if you follow all suggestions</Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Tax Calendar Tab */}
      {activeTab === 4 && (
        <Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>Important Tax Dates (FY 2024-25)</Typography>
          <Grid container spacing={2}>
            {TAX_CALENDAR.map((event, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                <Card sx={{
                  transition: 'all 0.3s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                  borderLeft: 4,
                  borderColor: event.type === 'payment' ? 'warning.main' : event.type === 'deadline' ? 'error.main' : 'info.main',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" fontWeight={700} color={event.type === 'payment' ? 'warning.main' : event.type === 'deadline' ? 'error.main' : 'info.main'}>
                        {event.date}
                      </Typography>
                      {event.important && <Star color="warning" sx={{ fontSize: 18 }} />}
                    </Box>
                    <Typography variant="body2">{event.event}</Typography>
                    <Chip
                      label={event.type}
                      size="small"
                      variant="outlined"
                      color={event.type === 'payment' ? 'warning' : event.type === 'deadline' ? 'error' : 'info'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default TaxPlanner;
