import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, Typography, Box, FormControl, Select, MenuItem,
  IconButton, CircularProgress, Card, CardContent
} from '@mui/material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';

const ManualEMIDialog = ({ open, onClose, onCreate, data, errors, loading, onChange }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{
        sx: { borderRadius: 4, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }
      }}
    >
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white', fontWeight: 'bold', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', py: 3, px: 4
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AddIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {data._id ? 'Edit EMI' : 'Add Manual EMI'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {data._id ? 'Update your EMI details' : 'Create a new EMI entry for your purchases'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
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
            <FormControl fullWidth error={!!errors.cardProvider} variant="outlined">
              <Select value={data.cardProvider} onChange={(e) => onChange('cardProvider', e.target.value)}
                sx={{ bgcolor: 'white', '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }}>
                <MenuItem value="ICICI">ICICI Bank</MenuItem>
                <MenuItem value="HDFC">HDFC Bank</MenuItem>
                <MenuItem value="SBI">State Bank of India</MenuItem>
                <MenuItem value="AXIS">Axis Bank</MenuItem>
                <MenuItem value="KOTAK">Kotak Mahindra</MenuItem>
                <MenuItem value="CITI">Citi Bank</MenuItem>
                <MenuItem value="AMEX">American Express</MenuItem>
                <MenuItem value="STANDARD CHARTERED">Standard Chartered</MenuItem>
                <MenuItem value="INDUSIND">IndusInd Bank</MenuItem>
                <MenuItem value="YES BANK">Yes Bank</MenuItem>
                <MenuItem value="PAYTM">Paytm</MenuItem>
                <MenuItem value="BAJAJ FINSERV">Bajaj Finserv</MenuItem>
                <MenuItem value="IDFC FIRST">IDFC First Bank</MenuItem>
                <MenuItem value="RBL">RBL Bank</MenuItem>
                <MenuItem value="HSBC">HSBC Bank</MenuItem>
                <MenuItem value="BOB">Bank of Baroda</MenuItem>
                <MenuItem value="PNB">Punjab National Bank</MenuItem>
                <MenuItem value="CANARA">Canara Bank</MenuItem>
                <MenuItem value="UNION BANK">Union Bank</MenuItem>
                <MenuItem value="IDBI">IDBI Bank</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
              {errors.cardProvider && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1 }}>
                  {errors.cardProvider}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {data.cardProvider === 'OTHER' && (
            <Grid item xs={12}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Provider Name *</Typography>
              <TextField fullWidth value={data.customProviderName}
                onChange={(e) => onChange('customProviderName', e.target.value)}
                error={!!errors.customProviderName} helperText={errors.customProviderName}
                placeholder="e.g., Local Bank, Friend, Family" sx={{ bgcolor: 'white' }}
                InputProps={{ sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Card Last 4 Digits *</Typography>
            <TextField fullWidth value={data.cardLastFourDigits}
              onChange={(e) => onChange('cardLastFourDigits', e.target.value)}
              error={!!errors.cardLastFourDigits} helperText={errors.cardLastFourDigits}
              inputProps={{ maxLength: 4, pattern: '[0-9]*' }} placeholder="1234"
              sx={{ bgcolor: 'white' }}
              InputProps={{ sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Card Holder Name *</Typography>
            <TextField fullWidth value={data.cardHolderName}
              onChange={(e) => onChange('cardHolderName', e.target.value)}
              error={!!errors.cardHolderName} helperText={errors.cardHolderName}
              placeholder="John Doe" sx={{ bgcolor: 'white' }}
              InputProps={{ sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
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
            <TextField fullWidth value={data.merchantName}
              onChange={(e) => onChange('merchantName', e.target.value)}
              error={!!errors.merchantName} helperText={errors.merchantName}
              placeholder="Amazon, Flipkart, Apple Store" sx={{ bgcolor: 'white' }}
              InputProps={{ sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Product Description</Typography>
            <TextField fullWidth value={data.productDescription}
              onChange={(e) => onChange('productDescription', e.target.value)}
              placeholder="iPhone 15 Pro, MacBook Air, etc." sx={{ bgcolor: 'white' }}
              InputProps={{ sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Purchase Category</Typography>
            <FormControl fullWidth variant="outlined">
              <Select value={data.category || 'electronics'}
                onChange={(e) => onChange('category', e.target.value)}
                sx={{ bgcolor: 'white', '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }}>
                <MenuItem value="electronics">Electronics</MenuItem>
                <MenuItem value="furniture">Furniture</MenuItem>
                <MenuItem value="appliances">Home Appliances</MenuItem>
                <MenuItem value="vehicle">Vehicle</MenuItem>
                <MenuItem value="jewellery">Jewellery</MenuItem>
                <MenuItem value="education">Education</MenuItem>
                <MenuItem value="travel">Travel</MenuItem>
                <MenuItem value="medical">Medical</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Order/Invoice No.</Typography>
            <TextField fullWidth value={data.invoiceNumber || ''}
              onChange={(e) => onChange('invoiceNumber', e.target.value)}
              placeholder="INV-2025-001" sx={{ bgcolor: 'white' }}
              InputProps={{ sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
            />
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
              <Select value={data.repaymentType} onChange={(e) => onChange('repaymentType', e.target.value)}
                sx={{ bgcolor: 'white', '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } }}>
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
                      Pay back anytime when requested (friends, family, informal loans)
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Principal Amount *</Typography>
            <TextField fullWidth type="number" value={data.principalAmount}
              onChange={(e) => onChange('principalAmount', e.target.value)}
              error={!!errors.principalAmount}
              helperText={errors.principalAmount || (data.repaymentType === 'ON_REQUEST' ? 'Total loan amount' : 'Original loan')}
              InputProps={{ startAdornment: <Typography sx={{ mr: 1, fontWeight: 600 }}>₹</Typography>, sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
              placeholder="50000" sx={{ bgcolor: 'white' }}
            />
          </Grid>

          {data.repaymentType === 'MONTHLY' && (
            <>
              <Grid item xs={12}>
                <Typography sx={{ fontWeight: 600, mb: 1 }}>EMI Amount *</Typography>
                <TextField fullWidth type="number" value={data.emiAmount}
                  onChange={(e) => onChange('emiAmount', e.target.value)}
                  error={!!errors.emiAmount} helperText={errors.emiAmount}
                  InputProps={{ startAdornment: <Typography sx={{ mr: 1, fontWeight: 600 }}>₹</Typography>, sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
                  placeholder="5000" sx={{ bgcolor: 'white' }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography sx={{ fontWeight: 600, mb: 1 }}>Tenure (Months) *</Typography>
                <TextField fullWidth type="number" value={data.totalTenure}
                  onChange={(e) => onChange('totalTenure', e.target.value)}
                  error={!!errors.totalTenure} helperText={errors.totalTenure}
                  placeholder="12" inputProps={{ min: 1, max: 60 }} sx={{ bgcolor: 'white' }}
                  InputProps={{ sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Interest Rate (%)</Typography>
            <TextField fullWidth type="number" value={data.interestRate}
              onChange={(e) => onChange('interestRate', e.target.value)}
              placeholder="12"
              InputProps={{ endAdornment: <Typography sx={{ ml: 1, fontWeight: 600 }}>%</Typography>, sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
              sx={{ bgcolor: 'white' }} helperText="Annual interest rate"
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
            <TextField fullWidth type="date" value={data.startDate}
              onChange={(e) => onChange('startDate', e.target.value)}
              error={!!errors.startDate} helperText={errors.startDate || 'When EMI starts'}
              InputLabelProps={{ shrink: true }} sx={{ bgcolor: 'white' }}
              InputProps={{ sx: { '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2 } } }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography sx={{ fontWeight: 600, mb: 1 }}>Notes</Typography>
            <TextField fullWidth multiline rows={3} value={data.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="Any additional notes about this EMI..."
              sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { '& fieldset': { borderWidth: 2 } } }}
            />
          </Grid>

          {/* Summary Card */}
          {data.principalAmount && (
            (data.repaymentType === 'MONTHLY' && data.emiAmount && data.totalTenure) ||
            data.repaymentType === 'ON_REQUEST'
          ) && (
            <Grid item xs={12}>
              <Card sx={{ background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', border: '3px solid', borderColor: 'primary.main', borderRadius: 3, boxShadow: '0 8px 24px rgba(102, 126, 234, 0.2)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ bgcolor: 'primary.main', borderRadius: 2, p: 1.5, display: 'flex' }}>
                      <Typography sx={{ fontSize: 28 }}>📊</Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {data.repaymentType === 'MONTHLY' ? 'EMI Summary' : 'Loan Summary'}
                    </Typography>
                  </Box>

                  {data.repaymentType === 'MONTHLY' ? (
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">💵 Principal Amount</Typography>
                          <Typography variant="h6" fontWeight={700}>
                            ₹{parseFloat(data.principalAmount || 0).toLocaleString('en-IN')}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">💳 Monthly EMI</Typography>
                          <Typography variant="h6" fontWeight={700} color="primary">
                            ₹{parseFloat(data.emiAmount || 0).toLocaleString('en-IN')}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">📅 Tenure</Typography>
                          <Typography variant="h6" fontWeight={700}>{data.totalTenure} months</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">💰 Total Amount</Typography>
                          <Typography variant="h6" fontWeight={700} color="success.main">
                            ₹{(parseFloat(data.emiAmount || 0) * parseFloat(data.totalTenure || 0)).toLocaleString('en-IN')}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Box sx={{ bgcolor: 'info.light', p: 3, borderRadius: 2, border: '2px solid', borderColor: 'info.main' }}>
                          <Typography variant="caption" color="text.secondary">💵 Loan Amount</Typography>
                          <Typography variant="h5" fontWeight={700} color="info.dark">
                            ₹{parseFloat(data.principalAmount || 0).toLocaleString('en-IN')}
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

      <DialogActions sx={{ p: 3, bgcolor: '#f8f9fa', borderTop: '2px solid', borderColor: 'divider', gap: 2 }}>
        <Button onClick={onClose} variant="outlined" size="large"
          sx={{ px: 4, py: 1.5, fontWeight: 600, borderWidth: 2, '&:hover': { borderWidth: 2, bgcolor: 'action.hover' } }}>
          Cancel
        </Button>
        <Button onClick={onCreate} variant="contained" size="large" disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          sx={{ px: 4, py: 1.5, fontWeight: 600, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)', '&:hover': { background: 'linear-gradient(135deg, #5568d3 0%, #63408b 100%)', boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)' } }}>
          {loading ? (data._id ? 'Updating...' : 'Creating...') : (data._id ? 'Update EMI' : 'Create EMI')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualEMIDialog;
