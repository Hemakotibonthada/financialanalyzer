import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Chip } from '@mui/material';
import { formatCurrency, formatDate } from '../utils/formatters';

const ActiveEMIsTab = ({ overview }) => {
  if (!overview || !overview.activeEMIs || overview.activeEMIs.length === 0) {
    return <Box sx={{ p: 3 }}><Alert severity="info">No active EMIs</Alert></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Active EMIs</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell sx={{ fontWeight: 700 }}>Merchant</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Card</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>EMI Amount</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Tenure Left</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Next Payment</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overview.activeEMIs.map((emi, index) => (
              <TableRow key={index} hover>
                <TableCell>{emi.merchantName}</TableCell>
                <TableCell>{emi.cardProvider} {emi.cardLastFourDigits}</TableCell>
                <TableCell align="right">{formatCurrency(emi.emiAmount)}</TableCell>
                <TableCell align="right">{formatCurrency(emi.remainingAmount)}</TableCell>
                <TableCell align="right">{emi.remainingTenure} months</TableCell>
                <TableCell>{formatDate(emi.nextPaymentDate)}</TableCell>
                <TableCell><Chip label="Active" color="success" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ActiveEMIsTab;
