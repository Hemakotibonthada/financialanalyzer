import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Chip } from '@mui/material';
import { formatCurrency, formatDate } from '../utils/formatters';

const CompletedEMIsTab = ({ overview }) => {
  if (!overview || !overview.completedEMIs || overview.completedEMIs.length === 0) {
    return <Box sx={{ p: 3 }}><Alert severity="info">No completed EMIs</Alert></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Completed EMIs</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'success.light' }}>
              <TableCell sx={{ fontWeight: 700 }}>Merchant</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Card</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Total Paid</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Tenure</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Completed On</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {overview.completedEMIs.map((emi, index) => (
              <TableRow key={index} hover>
                <TableCell>{emi.merchantName}</TableCell>
                <TableCell>{emi.cardProvider} {emi.cardLastFourDigits}</TableCell>
                <TableCell align="right">{formatCurrency(emi.totalAmount)}</TableCell>
                <TableCell align="right">{emi.totalTenure} months</TableCell>
                <TableCell>{formatDate(emi.completedDate)}</TableCell>
                <TableCell><Chip label="Completed" color="success" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CompletedEMIsTab;
