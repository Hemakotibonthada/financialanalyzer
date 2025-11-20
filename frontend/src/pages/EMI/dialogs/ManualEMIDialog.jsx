import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { CARD_PROVIDERS, PURCHASE_CATEGORIES } from '../utils/constants';

const ManualEMIDialog = ({
  open,
  onClose,
  manualEMIData,
  handleManualEMIChange,
  manualEMIErrors,
  manualEMILoading,
  handleCreateManualEMI
}) => {
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN')}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 3,
        px: 4
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{ 
            bgcolor: 'rgba(255,255,255,0.2)', 
            borderRadius: 2, 
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AddIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Add Manual EMI</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Create a new EMI entry for your purchases
            </Typography>
          </Box>
        </Box>
        <IconButton 
          onClick={onClose}
          sx={{ 
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.1)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 4, bgcolor: '#f8f9fa' }}>
        <Grid container spacing={3}>
          {/* Card Details Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
              Card Details
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Card Provider *</Typography>
            <FormControl fullWidth error={!!manualEMIErrors.cardProvider} variant="outlined">
              <Select
                value={manualEMIData.cardProvider}
                onChange={(e) => handleManualEMIChange('cardProvider', e.target.value)}
                sx={{
                  bgcolor: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 }
                }}
              >
                {CARD_PROVIDERS.map(provider => (
                  <MenuItem key={provider} value={provider}>{provider}</MenuItem>
                ))}
              </Select>
              {manualEMIErrors.cardProvider && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                  {manualEMIErrors.cardProvider}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {manualEMIData.cardProvider === 'OTHER' && (
            <Grid item xs={12}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Provider Name *</Typography>
              <TextField
                fullWidth
                value={manualEMIData.customProviderName}
                onChange={(e) => handleManualEMIChange('customProviderName', e.target.value)}
                error={!!manualEMIErrors.customProviderName}
                helperText={manualEMIErrors.customProviderName}
                placeholder="e.g., Local Bank, Friend, Family"
                sx={{ bgcolor: 'white' }}
                InputProps={{
                  sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                }}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Card Last 4 Digits *</Typography>
            <TextField
              fullWidth
              value={manualEMIData.cardLastFourDigits}
              onChange={(e) => handleManualEMIChange('cardLastFourDigits', e.target.value)}
              error={!!manualEMIErrors.cardLastFourDigits}
              helperText={manualEMIErrors.cardLastFourDigits}
              inputProps={{ maxLength: 4, pattern: '[0-9]*' }}
              placeholder="1234"
              sx={{ bgcolor: 'white' }}
              InputProps={{
                sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Card Holder Name *</Typography>
            <TextField
              fullWidth
              value={manualEMIData.cardHolderName}
              onChange={(e) => handleManualEMIChange('cardHolderName', e.target.value)}
              error={!!manualEMIErrors.cardHolderName}
              helperText={manualEMIErrors.cardHolderName}
              placeholder="John Doe"
              sx={{ bgcolor: 'white' }}
              InputProps={{
                sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
              }}
            />
          </Grid>

          {/* Purchase Details Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main', mb: 2, mt: 2, pb: 1, borderBottom: '2px solid', borderColor: 'secondary.main' }}>
              Purchase Details
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Merchant Name *</Typography>
            <TextField
              fullWidth
              value={manualEMIData.merchantName}
              onChange={(e) => handleManualEMIChange('merchantName', e.target.value)}
              error={!!manualEMIErrors.merchantName}
              helperText={manualEMIErrors.merchantName}
              placeholder="Amazon, Flipkart, Apple Store"
              sx={{ bgcolor: 'white' }}
              InputProps={{
                sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Product Description</Typography>
            <TextField
              fullWidth
              value={manualEMIData.productDescription}
              onChange={(e) => handleManualEMIChange('productDescription', e.target.value)}
              placeholder="iPhone 15 Pro, MacBook Air, etc."
              sx={{ bgcolor: 'white' }}
              InputProps={{
                sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Purchase Category</Typography>
            <FormControl fullWidth variant="outlined">
              <Select
                value={manualEMIData.category || 'electronics'}
                onChange={(e) => handleManualEMIChange('category', e.target.value)}
                sx={{
                  bgcolor: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 }
                }}
              >
                {PURCHASE_CATEGORIES.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Financial Details Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main', mb: 2, mt: 2, pb: 1, borderBottom: '2px solid', borderColor: 'success.main' }}>
              Financial Details
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Repayment Type *</Typography>
            <FormControl fullWidth variant="outlined">
              <Select
                value={manualEMIData.repaymentType}
                onChange={(e) => handleManualEMIChange('repaymentType', e.target.value)}
                sx={{
                  bgcolor: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 }
                }}
              >
                <MenuItem value="MONTHLY">
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body1" fontWeight={700}>Monthly EMI</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Regular monthly installments with fixed tenure
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="ON_REQUEST">
                  <Box sx={{ py: 1 }}>
                    <Typography variant="body1" fontWeight={700}>On Request (Personal Loan)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pay back anytime when requested
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Principal Amount *</Typography>
            <TextField
              fullWidth
              type="number"
              value={manualEMIData.principalAmount}
              onChange={(e) => handleManualEMIChange('principalAmount', e.target.value)}
              error={!!manualEMIErrors.principalAmount}
              helperText={manualEMIErrors.principalAmount || (manualEMIData.repaymentType === 'ON_REQUEST' ? 'Total loan amount' : 'Original loan')}
              InputProps={{ 
                startAdornment: <Typography sx={{ mr: 1, fontWeight: 600 }}>₹</Typography>,
                sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
              }}
              placeholder="50000"
              sx={{ bgcolor: 'white' }}
            />
          </Grid>

          {manualEMIData.repaymentType === 'MONTHLY' && (
            <>
              <Grid item xs={12}>
                <Typography sx={{ fontWeight: 600, mb: 1 }}>EMI Amount *</Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={manualEMIData.emiAmount}
                  onChange={(e) => handleManualEMIChange('emiAmount', e.target.value)}
                  error={!!manualEMIErrors.emiAmount}
                  helperText={manualEMIErrors.emiAmount}
                  InputProps={{ 
                    startAdornment: <Typography sx={{ mr: 1, fontWeight: 600 }}>₹</Typography>,
                    sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                  }}
                  placeholder="5000"
                  sx={{ bgcolor: 'white' }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography sx={{ fontWeight: 600, mb: 1 }}>Tenure (Months) *</Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={manualEMIData.totalTenure}
                  onChange={(e) => handleManualEMIChange('totalTenure', e.target.value)}
                  error={!!manualEMIErrors.totalTenure}
                  helperText={manualEMIErrors.totalTenure}
                  placeholder="12"
                  inputProps={{ min: 1, max: 60 }}
                  sx={{ bgcolor: 'white' }}
                  InputProps={{
                    sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
                  }}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Interest Rate (%)</Typography>
            <TextField
              fullWidth
              type="number"
              value={manualEMIData.interestRate}
              onChange={(e) => handleManualEMIChange('interestRate', e.target.value)}
              placeholder="12"
              InputProps={{ 
                endAdornment: <Typography sx={{ ml: 1, fontWeight: 600 }}>%</Typography>,
                sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
              }}
              sx={{ bgcolor: 'white' }}
              helperText="Annual interest rate"
            />
          </Grid>

          {/* Date Information Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'info.main', mb: 2, mt: 2, pb: 1, borderBottom: '2px solid', borderColor: 'info.main' }}>
              Date Information
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>EMI Start Date *</Typography>
            <TextField
              fullWidth
              type="date"
              value={manualEMIData.startDate}
              onChange={(e) => handleManualEMIChange('startDate', e.target.value)}
              error={!!manualEMIErrors.startDate}
              helperText={manualEMIErrors.startDate || 'When EMI starts'}
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: 'white' }}
              InputProps={{
                sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Notes</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={manualEMIData.notes}
              onChange={(e) => handleManualEMIChange('notes', e.target.value)}
              placeholder="Any additional notes about this EMI..."
              sx={{ 
                bgcolor: 'white',
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderWidth: 2
                  }
                }
              }}
            />
          </Grid>

          {/* Summary Card */}
          {manualEMIData.principalAmount && (
            (manualEMIData.repaymentType === 'MONTHLY' && manualEMIData.emiAmount && manualEMIData.totalTenure) ||
            manualEMIData.repaymentType === 'ON_REQUEST'
          ) && (
            <Grid item xs={12}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                border: '3px solid',
                borderColor: 'primary.main',
                borderRadius: 3,
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.2)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ 
                      bgcolor: 'primary.main', 
                      borderRadius: 2, 
                      p: 1.5,
                      display: 'flex'
                    }}>
                      <Typography sx={{ fontSize: 28 }}>📊</Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {manualEMIData.repaymentType === 'MONTHLY' ? 'EMI Summary' : 'Loan Summary'}
                    </Typography>
                  </Box>
                  
                  {manualEMIData.repaymentType === 'MONTHLY' ? (
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            💵 Principal Amount
                          </Typography>
                          <Typography variant="h6" fontWeight={700}>
                            {formatCurrency(manualEMIData.principalAmount)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            💳 Monthly EMI
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color="primary">
                            {formatCurrency(manualEMIData.emiAmount)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            📅 Tenure
                          </Typography>
                          <Typography variant="h6" fontWeight={700}>
                            {manualEMIData.totalTenure} months
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            💰 Total Amount
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color="success.main">
                            {formatCurrency(parseFloat(manualEMIData.emiAmount || 0) * parseFloat(manualEMIData.totalTenure || 0))}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Box sx={{ 
                          bgcolor: 'info.light', 
                          p: 3, 
                          borderRadius: 2,
                          border: '2px solid',
                          borderColor: 'info.main'
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            💵 Loan Amount
                          </Typography>
                          <Typography variant="h5" fontWeight={700} color="info.dark">
                            {formatCurrency(manualEMIData.principalAmount)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            This is an on-request loan. It will be tracked but won't have monthly payments until requested.
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3, 
        bgcolor: '#f8f9fa',
        borderTop: '2px solid',
        borderColor: 'divider',
        gap: 2
      }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          size="large"
          sx={{ 
            px: 4,
            py: 1.5,
            fontWeight: 600,
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
              bgcolor: 'action.hover'
            }
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCreateManualEMI}
          variant="contained"
          size="large"
          disabled={manualEMILoading}
          startIcon={manualEMILoading ? <CircularProgress size={20} /> : <AddIcon />}
          sx={{ 
            px: 4,
            py: 1.5,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #63408b 100%)',
              boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)'
            }
          }}
        >
          {manualEMILoading ? 'Creating...' : 'Create EMI'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualEMIDialog;
