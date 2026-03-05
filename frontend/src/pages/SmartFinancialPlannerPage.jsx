// ============================================================================
// SMART FINANCIAL PLANNER PAGE — Comprehensive AI Financial Planning UI
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Button,
  Chip, CircularProgress, Alert, Tabs, Tab, LinearProgress,
  TextField, Slider, Divider, List, ListItem, ListItemText,
  ListItemIcon, Stepper, Step, StepLabel, StepContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, FormControlLabel,
  Switch, Accordion, AccordionSummary, AccordionDetails, IconButton,
  Tooltip, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  Psychology, TrendingUp, Savings, AccountBalance, Assessment,
  PlayArrow, CheckCircle, Warning, Refresh, AutoAwesome,
  Calculate, Security, HealthAndSafety, EmojiEvents, School,
  Home, DirectionsCar, BeachAccess, Elderly, ExpandMore,
  Info, Star, AccountBalanceWallet, Receipt, PieChart, Timeline
} from '@mui/icons-material';
import enhancedAIService from '../services/enhancedAIService';

// ============================================================================
// §1  RETIREMENT PLANNER TAB
// ============================================================================

function RetirementPlannerTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [config, setConfig] = useState({
    currentAge: 30,
    retirementAge: 55,
    lifeExpectancy: 85,
    currentMonthlyExpense: 50000,
    currentSavings: 500000,
    monthlySIP: 15000,
    expectedReturn: 12
  });

  const handlePlan = async () => {
    setLoading(true);
    try {
      const response = await enhancedAIService.runAutoML('forecast', {
        retirementConfig: {
          ...config,
          expectedReturn: config.expectedReturn / 100
        }
      });
      // Simulate retirement planning calculation locally for demo
      const yearsToRetirement = config.retirementAge - config.currentAge;
      const futureExpense = config.currentMonthlyExpense * Math.pow(1.06, yearsToRetirement);
      const requiredCorpus = futureExpense * 12 * 25;
      const monthlyReturn = config.expectedReturn / 100 / 12;
      const projected = config.currentSavings * Math.pow(1 + monthlyReturn, yearsToRetirement * 12) +
        config.monthlySIP * ((Math.pow(1 + monthlyReturn, yearsToRetirement * 12) - 1) / monthlyReturn);
      const gap = Math.max(0, requiredCorpus - projected);
      const additionalSIP = gap > 0 ? gap / ((Math.pow(1 + monthlyReturn, yearsToRetirement * 12) - 1) / monthlyReturn) : 0;

      setResult({
        corpus: {
          required: Math.round(requiredCorpus),
          projected: Math.round(projected),
          gap: Math.round(gap),
          onTrack: gap <= 0
        },
        expenses: {
          currentMonthly: config.currentMonthlyExpense,
          atRetirement: Math.round(futureExpense),
          annualAtRetirement: Math.round(futureExpense * 12)
        },
        action: {
          currentMonthlySIP: config.monthlySIP,
          requiredAdditionalSIP: Math.round(additionalSIP),
          totalRequiredSIP: Math.round(config.monthlySIP + additionalSIP)
        },
        summary: {
          yearsToRetirement,
          retirementYears: config.lifeExpectancy - config.retirementAge
        },
        fire: {
          fireNumber: Math.round(config.currentMonthlyExpense * 12 * 25),
          yearsToFIRE: 0
        }
      });
    } catch (err) {
      console.error('Retirement planning error:', err);
    } finally {
      setLoading(false);
    }
  };

  const ConfigField = ({ label, value, field, min, max, step = 1, prefix = '', suffix = '' }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" gutterBottom>{label}: {prefix}{value.toLocaleString()}{suffix}</Typography>
      <Slider
        value={value}
        onChange={(_, v) => setConfig(p => ({ ...p, [field]: v }))}
        min={min} max={max} step={step}
        valueLabelDisplay="auto"
        valueLabelFormat={v => `${prefix}${v.toLocaleString()}${suffix}`}
      />
    </Box>
  );

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Elderly color="primary" /> Retirement Config
            </Typography>

            <ConfigField label="Current Age" value={config.currentAge} field="currentAge" min={20} max={60} suffix=" yrs" />
            <ConfigField label="Retirement Age" value={config.retirementAge} field="retirementAge" min={40} max={70} suffix=" yrs" />
            <ConfigField label="Life Expectancy" value={config.lifeExpectancy} field="lifeExpectancy" min={70} max={100} suffix=" yrs" />
            <ConfigField label="Monthly Expense" value={config.currentMonthlyExpense} field="currentMonthlyExpense" min={10000} max={500000} step={5000} prefix="₹" />
            <ConfigField label="Current Savings" value={config.currentSavings} field="currentSavings" min={0} max={50000000} step={100000} prefix="₹" />
            <ConfigField label="Monthly SIP" value={config.monthlySIP} field="monthlySIP" min={0} max={200000} step={1000} prefix="₹" />
            <ConfigField label="Expected Return" value={config.expectedReturn} field="expectedReturn" min={6} max={18} step={0.5} suffix="%" />

            <Button
              fullWidth variant="contained"
              onClick={handlePlan}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <Calculate />}
            >
              {loading ? 'Calculating...' : 'Plan Retirement'}
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        {result ? (
          <>
            {/* Corpus Overview */}
            <Card elevation={2} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Retirement Corpus Analysis</Typography>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">Required Corpus</Typography>
                      <Typography variant="h5" fontWeight="bold" color="primary.main">
                        ₹{(result.corpus.required / 10000000).toFixed(1)} Cr
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: result.corpus.onTrack ? 'success.50' : 'warning.50', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">Projected Corpus</Typography>
                      <Typography variant="h5" fontWeight="bold" color={result.corpus.onTrack ? 'success.main' : 'warning.main'}>
                        ₹{(result.corpus.projected / 10000000).toFixed(1)} Cr
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: result.corpus.gap > 0 ? 'error.50' : 'success.50', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">{result.corpus.gap > 0 ? 'Gap' : 'Surplus'}</Typography>
                      <Typography variant="h5" fontWeight="bold" color={result.corpus.gap > 0 ? 'error.main' : 'success.main'}>
                        ₹{(Math.abs(result.corpus.gap) / 10000000).toFixed(1)} Cr
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <LinearProgress
                  variant="determinate"
                  value={Math.min((result.corpus.projected / result.corpus.required) * 100, 100)}
                  sx={{ height: 12, borderRadius: 6, mt: 3, mb: 1 }}
                  color={result.corpus.onTrack ? 'success' : 'warning'}
                />
                <Typography variant="caption" color="text.secondary" align="center" display="block">
                  {((result.corpus.projected / result.corpus.required) * 100).toFixed(0)}% of required corpus projected
                </Typography>
              </CardContent>
            </Card>

            {/* Expense Projection */}
            <Card elevation={2} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>Expense Projection</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Current Monthly Expense</Typography>
                    <Typography variant="h6">₹{result.expenses.currentMonthly.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">At Retirement (after inflation)</Typography>
                    <Typography variant="h6" color="warning.main">₹{result.expenses.atRetirement.toLocaleString()}</Typography>
                  </Grid>
                </Grid>
                <Alert severity="info" sx={{ mt: 2, py: 0.5 }}>
                  <Typography variant="caption">
                    Your ₹{config.currentMonthlyExpense.toLocaleString()}/month will feel like ₹{result.expenses.atRetirement.toLocaleString()}/month in {result.summary.yearsToRetirement} years due to 6% inflation.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>

            {/* Action Required */}
            {result.corpus.gap > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">Action Required</Typography>
                <Typography variant="body2">
                  Increase your monthly SIP by ₹{result.action.requiredAdditionalSIP.toLocaleString()} (from ₹{config.monthlySIP.toLocaleString()} to ₹{result.action.totalRequiredSIP.toLocaleString()}) to reach your retirement goal.
                </Typography>
              </Alert>
            )}

            {result.corpus.onTrack && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold">Congratulations! You're on track for retirement.</Typography>
                <Typography variant="body2">
                  Your current savings and SIP should build a corpus of ₹{(result.corpus.projected / 10000000).toFixed(1)} Cr by retirement.
                </Typography>
              </Alert>
            )}

            {/* FIRE Number */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEvents color="warning" /> FIRE Number
                </Typography>
                <Typography variant="h5" color="warning.main" sx={{ mt: 1 }}>
                  ₹{(result.fire.fireNumber / 10000000).toFixed(1)} Cr
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Financial Independence, Retire Early (25x annual expenses)
                </Typography>
              </CardContent>
            </Card>
          </>
        ) : !loading && (
          <Card elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Elderly sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>AI Retirement Planner</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400, mx: 'auto' }}>
              Plan your retirement with inflation-adjusted projections, corpus gap analysis, and FIRE calculations.
            </Typography>
          </Card>
        )}
      </Grid>
    </Grid>
  );
}

// ============================================================================
// §2  TAX OPTIMIZER TAB
// ============================================================================

function TaxOptimizerTab() {
  const [income, setIncome] = useState(1200000);
  const [deductions, setDeductions] = useState({
    section80C: 100000,
    section80D: 25000,
    section80CCD: 0,
    hra: 0,
    homeLoanInterest: 0
  });
  const [result, setResult] = useState(null);

  const calculate = () => {
    // Local calculation matching the backend TaxOptimizer
    const standardDeduction = 75000;

    // Old regime
    const totalDeductionsOld = Math.min(deductions.section80C, 150000) +
      Math.min(deductions.section80D, 75000) + Math.min(deductions.section80CCD, 50000) +
      deductions.hra + Math.min(deductions.homeLoanInterest, 200000) + standardDeduction;
    const taxableOld = Math.max(0, income - totalDeductionsOld);
    const taxOld = calcTax(taxableOld, 'old');

    // New regime
    const taxableNew = Math.max(0, income - standardDeduction);
    const taxNew = calcTax(taxableNew, 'new');

    setResult({
      oldRegime: {
        taxableIncome: taxableOld,
        totalDeductions: totalDeductionsOld,
        totalTax: Math.round(taxOld * 1.04),
        effectiveRate: income > 0 ? ((taxOld * 1.04 / income) * 100).toFixed(1) + '%' : '0%'
      },
      newRegime: {
        taxableIncome: taxableNew,
        standardDeduction,
        totalTax: Math.round(taxNew * 1.04),
        effectiveRate: income > 0 ? ((taxNew * 1.04 / income) * 100).toFixed(1) + '%' : '0%'
      },
      recommendation: taxOld < taxNew ? 'old_regime' : 'new_regime',
      savings: Math.round(Math.abs(taxOld - taxNew) * 1.04),
      tips: [
        deductions.section80C < 150000 ? `Invest ₹${(150000 - deductions.section80C).toLocaleString()} more in 80C (ELSS/PPF)` : null,
        deductions.section80CCD < 50000 ? 'Invest in NPS for ₹50,000 extra deduction under 80CCD(1B)' : null,
        deductions.section80D < 50000 ? 'Get health insurance for parents for additional 80D deduction' : null
      ].filter(Boolean)
    });
  };

  function calcTax(taxable, regime) {
    if (regime === 'old') {
      let tax = 0;
      if (taxable > 250000) tax += Math.min(taxable - 250000, 250000) * 0.05;
      if (taxable > 500000) tax += Math.min(taxable - 500000, 500000) * 0.20;
      if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;
      if (taxable <= 500000) tax = Math.max(0, tax - 12500);
      return tax;
    } else {
      let tax = 0;
      if (taxable > 300000) tax += Math.min(taxable - 300000, 400000) * 0.05;
      if (taxable > 700000) tax += Math.min(taxable - 700000, 300000) * 0.10;
      if (taxable > 1000000) tax += Math.min(taxable - 1000000, 200000) * 0.15;
      if (taxable > 1200000) tax += Math.min(taxable - 1200000, 300000) * 0.20;
      if (taxable > 1500000) tax += (taxable - 1500000) * 0.30;
      if (taxable <= 700000) tax = Math.max(0, tax - 25000);
      return tax;
    }
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              <Receipt color="primary" /> Tax Calculator
            </Typography>

            <TextField
              fullWidth size="small" label="Annual Income" type="number"
              value={income} onChange={(e) => setIncome(Number(e.target.value))}
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Deductions (Old Regime)</Typography>

            {Object.entries({
              section80C: { label: '80C (Max 1.5L)', max: 150000 },
              section80D: { label: '80D Health Insurance (Max 75K)', max: 75000 },
              section80CCD: { label: '80CCD NPS (Max 50K)', max: 50000 },
              hra: { label: 'HRA Exemption', max: 500000 },
              homeLoanInterest: { label: 'Home Loan Interest (Max 2L)', max: 200000 }
            }).map(([key, config]) => (
              <TextField
                key={key} fullWidth size="small" label={config.label} type="number"
                value={deductions[key]}
                onChange={(e) => setDeductions(p => ({ ...p, [key]: Math.min(Number(e.target.value), config.max) }))}
                sx={{ mb: 1 }}
              />
            ))}

            <Button fullWidth variant="contained" onClick={calculate} startIcon={<Calculate />} sx={{ mt: 1 }}>
              Compare Tax Regimes
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        {result && (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Card elevation={2} sx={{
                  border: 2,
                  borderColor: result.recommendation === 'old_regime' ? 'success.main' : 'grey.300'
                }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    {result.recommendation === 'old_regime' && (
                      <Chip label="RECOMMENDED" color="success" size="small" sx={{ mb: 1 }} />
                    )}
                    <Typography variant="subtitle1" fontWeight="bold">Old Regime</Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ my: 1 }}>
                      ₹{result.oldRegime.totalTax.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Effective Rate: {result.oldRegime.effectiveRate}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Deductions: ₹{result.oldRegime.totalDeductions.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card elevation={2} sx={{
                  border: 2,
                  borderColor: result.recommendation === 'new_regime' ? 'success.main' : 'grey.300'
                }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    {result.recommendation === 'new_regime' && (
                      <Chip label="RECOMMENDED" color="success" size="small" sx={{ mb: 1 }} />
                    )}
                    <Typography variant="subtitle1" fontWeight="bold">New Regime</Typography>
                    <Typography variant="h4" fontWeight="bold" color="secondary.main" sx={{ my: 1 }}>
                      ₹{result.newRegime.totalTax.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Effective Rate: {result.newRegime.effectiveRate}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Standard Deduction: ₹{result.newRegime.standardDeduction.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                You save <strong>₹{result.savings.toLocaleString()}</strong> by choosing the{' '}
                <strong>{result.recommendation === 'old_regime' ? 'Old' : 'New'} Regime</strong>.
              </Typography>
            </Alert>

            {result.tips.length > 0 && (
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    💡 Tax Saving Opportunities
                  </Typography>
                  <List dense>
                    {result.tips.map((tip, i) => (
                      <ListItem key={i}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Star color="warning" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={tip} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Grid>
    </Grid>
  );
}

// ============================================================================
// §3  INSURANCE GAP ANALYZER TAB
// ============================================================================

function InsuranceGapTab() {
  const [config, setConfig] = useState({
    age: 30,
    annualIncome: 800000,
    dependents: 3,
    existingLifeInsurance: 2000000,
    existingHealthInsurance: 500000,
    hasHomeLoan: true,
    homeLoanOutstanding: 3000000,
    monthlyExpenses: 40000,
    hasKids: true
  });
  const [result, setResult] = useState(null);

  const analyze = () => {
    const incomeReplacement = config.annualIncome * 15;
    const liabilityCover = config.hasHomeLoan ? config.homeLoanOutstanding : 0;
    const childEducation = config.hasKids ? 3000000 : 0;
    const requiredLife = incomeReplacement + liabilityCover + childEducation;
    const lifeGap = Math.max(0, requiredLife - config.existingLifeInsurance);

    const requiredHealth = Math.max(1000000, config.dependents > 2 ? 2000000 : 1000000);
    const healthGap = Math.max(0, requiredHealth - config.existingHealthInsurance);

    const premiumEstimate = config.age < 35 ? 500 : config.age < 45 ? 800 : 1200;
    const termPremium = Math.round((lifeGap / 1000000) * premiumEstimate / 12);
    const healthPremium = Math.round((healthGap / 500000) * 8000 / 12);

    setResult({
      lifeInsurance: { required: requiredLife, existing: config.existingLifeInsurance, gap: lifeGap, premium: termPremium },
      healthInsurance: { required: requiredHealth, existing: config.existingHealthInsurance, gap: healthGap, premium: healthPremium },
      criticalIllness: { recommended: config.annualIncome * 5 },
      totalMonthlyPremium: termPremium + healthPremium,
      score: Math.max(0, Math.round(100 - (lifeGap / requiredLife) * 40 - (healthGap / requiredHealth) * 30))
    });
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              <Security color="primary" /> Insurance Profile
            </Typography>
            <TextField fullWidth size="small" label="Age" type="number" value={config.age}
              onChange={(e) => setConfig(p => ({ ...p, age: Number(e.target.value) }))} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Annual Income" type="number" value={config.annualIncome}
              onChange={(e) => setConfig(p => ({ ...p, annualIncome: Number(e.target.value) }))} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Dependents" type="number" value={config.dependents}
              onChange={(e) => setConfig(p => ({ ...p, dependents: Number(e.target.value) }))} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Existing Life Insurance" type="number" value={config.existingLifeInsurance}
              onChange={(e) => setConfig(p => ({ ...p, existingLifeInsurance: Number(e.target.value) }))} sx={{ mb: 1 }} />
            <TextField fullWidth size="small" label="Existing Health Insurance" type="number" value={config.existingHealthInsurance}
              onChange={(e) => setConfig(p => ({ ...p, existingHealthInsurance: Number(e.target.value) }))} sx={{ mb: 1 }} />
            <FormControlLabel
              control={<Switch checked={config.hasHomeLoan} onChange={(e) => setConfig(p => ({ ...p, hasHomeLoan: e.target.checked }))} />}
              label="Has Home Loan" sx={{ mb: 1 }}
            />
            {config.hasHomeLoan && (
              <TextField fullWidth size="small" label="Home Loan Outstanding" type="number" value={config.homeLoanOutstanding}
                onChange={(e) => setConfig(p => ({ ...p, homeLoanOutstanding: Number(e.target.value) }))} sx={{ mb: 1 }} />
            )}
            <Button fullWidth variant="contained" onClick={analyze} startIcon={<Assessment />} sx={{ mt: 1 }}>
              Analyze Coverage
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        {result && (
          <>
            {/* Insurance Score */}
            <Card elevation={2} sx={{ mb: 2 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight="bold" color={result.score >= 80 ? 'success.main' : result.score >= 50 ? 'warning.main' : 'error.main'}>
                  {result.score}/100
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Insurance Coverage Score
                </Typography>
              </CardContent>
            </Card>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card elevation={2} sx={{ borderLeft: 4, borderColor: result.lifeInsurance.gap > 0 ? 'error.main' : 'success.main' }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">Life Insurance</Typography>
                    <Typography variant="body2">Required: ₹{(result.lifeInsurance.required / 100000).toFixed(0)}L</Typography>
                    <Typography variant="body2">Existing: ₹{(result.lifeInsurance.existing / 100000).toFixed(0)}L</Typography>
                    <Typography variant="h6" color={result.lifeInsurance.gap > 0 ? 'error.main' : 'success.main'} sx={{ mt: 1 }}>
                      Gap: ₹{(result.lifeInsurance.gap / 100000).toFixed(0)}L
                    </Typography>
                    {result.lifeInsurance.gap > 0 && (
                      <Typography variant="caption">
                        Est. premium: ₹{result.lifeInsurance.premium}/month for term plan
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card elevation={2} sx={{ borderLeft: 4, borderColor: result.healthInsurance.gap > 0 ? 'warning.main' : 'success.main' }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">Health Insurance</Typography>
                    <Typography variant="body2">Required: ₹{(result.healthInsurance.required / 100000).toFixed(0)}L</Typography>
                    <Typography variant="body2">Existing: ₹{(result.healthInsurance.existing / 100000).toFixed(0)}L</Typography>
                    <Typography variant="h6" color={result.healthInsurance.gap > 0 ? 'warning.main' : 'success.main'} sx={{ mt: 1 }}>
                      Gap: ₹{(result.healthInsurance.gap / 100000).toFixed(0)}L
                    </Typography>
                    {result.healthInsurance.gap > 0 && (
                      <Typography variant="caption">
                        Consider super top-up plan (₹{result.healthInsurance.premium}/month)
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Total estimated premium for full coverage: <strong>₹{result.totalMonthlyPremium.toLocaleString()}/month</strong>
              </Typography>
            </Alert>
          </>
        )}
      </Grid>
    </Grid>
  );
}

// ============================================================================
// §4  GOAL OPTIMIZER TAB
// ============================================================================

function GoalOptimizerTab() {
  const [goals, setGoals] = useState([
    { name: 'Emergency Fund', targetAmount: 300000, currentAmount: 100000, deadline: '2027-01-01', priority: 'critical' },
    { name: 'Vacation', targetAmount: 200000, currentAmount: 50000, deadline: '2026-12-01', priority: 'medium' },
    { name: 'Car Down Payment', targetAmount: 500000, currentAmount: 150000, deadline: '2028-06-01', priority: 'high' }
  ]);
  const [monthlyIncome, setMonthlyIncome] = useState(75000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const optimize = () => {
    setLoading(true);
    setTimeout(() => {
      const monthlyBudget = monthlyIncome * 0.2;
      let remaining = monthlyBudget;
      const allocations = goals.map(goal => {
        const months = Math.max(1, Math.round((new Date(goal.deadline) - Date.now()) / (30 * 24 * 60 * 60 * 1000)));
        const gap = Math.max(0, goal.targetAmount - goal.currentAmount);
        const requiredSIP = gap / months;
        const allocated = Math.min(requiredSIP, remaining);
        remaining -= allocated;

        return {
          goalName: goal.name,
          priority: goal.priority,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          progressPercent: ((goal.currentAmount / goal.targetAmount) * 100).toFixed(0),
          monthsRemaining: months,
          requiredMonthlySIP: Math.round(requiredSIP),
          allocatedMonthlySIP: Math.round(allocated),
          feasibility: allocated >= requiredSIP * 0.95 ? 'on_track' : allocated >= requiredSIP * 0.7 ? 'at_risk' : 'underfunded'
        };
      });

      setResult({
        goalAllocations: allocations,
        totalMonthlyBudget: monthlyBudget,
        totalAllocated: monthlyBudget - remaining,
        unallocated: Math.max(0, remaining),
        goalsOnTrack: allocations.filter(a => a.feasibility === 'on_track').length,
        goalsAtRisk: allocations.filter(a => a.feasibility === 'at_risk').length
      });
      setLoading(false);
    }, 500);
  };

  const goalIcons = {
    'Emergency Fund': <Security />,
    'Vacation': <BeachAccess />,
    'Car Down Payment': <DirectionsCar />,
    'House': <Home />,
    'Education': <School />
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              <EmojiEvents color="primary" /> Financial Goals
            </Typography>
            <TextField fullWidth size="small" label="Monthly Income" type="number"
              value={monthlyIncome} onChange={(e) => setMonthlyIncome(Number(e.target.value))} sx={{ mb: 2 }} />
            <Divider sx={{ my: 1 }} />
            {goals.map((goal, i) => (
              <Paper key={i} elevation={0} sx={{ p: 1, mb: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold">{goal.name}</Typography>
                <Typography variant="caption">
                  ₹{goal.currentAmount.toLocaleString()} / ₹{goal.targetAmount.toLocaleString()} • {goal.deadline}
                </Typography>
              </Paper>
            ))}
            <Button fullWidth variant="contained" onClick={optimize} disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />} sx={{ mt: 2 }}>
              Optimize Allocations
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        {result && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`Budget: ₹${result.totalMonthlyBudget.toLocaleString()}/mo`} />
              <Chip label={`${result.goalsOnTrack} On Track`} color="success" />
              {result.goalsAtRisk > 0 && <Chip label={`${result.goalsAtRisk} At Risk`} color="warning" />}
            </Box>

            {result.goalAllocations.map((alloc, i) => (
              <Card key={i} elevation={2} sx={{ mb: 2, borderLeft: 4,
                borderColor: alloc.feasibility === 'on_track' ? 'success.main' : alloc.feasibility === 'at_risk' ? 'warning.main' : 'error.main'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {goalIcons[alloc.goalName] || <Star />}
                      <Typography variant="subtitle1" fontWeight="bold">{alloc.goalName}</Typography>
                    </Box>
                    <Chip
                      label={alloc.feasibility.replace('_', ' ')}
                      size="small"
                      color={alloc.feasibility === 'on_track' ? 'success' : alloc.feasibility === 'at_risk' ? 'warning' : 'error'}
                    />
                  </Box>
                  <LinearProgress variant="determinate" value={Number(alloc.progressPercent)} sx={{ height: 8, borderRadius: 4, my: 1 }} />
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Progress</Typography>
                      <Typography variant="body2" fontWeight="bold">{alloc.progressPercent}%</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Required SIP</Typography>
                      <Typography variant="body2" fontWeight="bold">₹{alloc.requiredMonthlySIP.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Allocated</Typography>
                      <Typography variant="body2" fontWeight="bold">₹{alloc.allocatedMonthlySIP.toLocaleString()}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </Grid>
    </Grid>
  );
}

// ============================================================================
// §5  MAIN PAGE
// ============================================================================

export default function SmartFinancialPlannerPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceWallet color="primary" />
          Smart Financial Planner
        </Typography>
        <Typography variant="body2" color="text.secondary">
          AI-powered retirement planning, tax optimization, insurance analysis, and goal tracking
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<Elderly />} label="Retirement" />
        <Tab icon={<Receipt />} label="Tax Optimizer" />
        <Tab icon={<Security />} label="Insurance" />
        <Tab icon={<EmojiEvents />} label="Goals" />
      </Tabs>

      {activeTab === 0 && <RetirementPlannerTab />}
      {activeTab === 1 && <TaxOptimizerTab />}
      {activeTab === 2 && <InsuranceGapTab />}
      {activeTab === 3 && <GoalOptimizerTab />}
    </Box>
  );
}
