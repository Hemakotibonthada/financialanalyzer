import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Chip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PaymentIcon from '@mui/icons-material/Payment';
import { formatCurrency, formatDate } from '../utils/formatters';

const LoansGivenTab = ({ loansGivenData, onAddLoan, onEditLoan, onAddRepayment }) => {
  if (!loansGivenData || !loansGivenData.loans || loansGivenData.loans.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" action={<IconButton onClick={onAddLoan}><AddIcon /></IconButton>}>No loans given yet. Click + to add</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Loans Given</Typography>
        <IconButton onClick={onAddLoan} color="primary" size="large"><AddIcon /></IconButton>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell sx={{ fontWeight: 700 }}>Borrower</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Relationship</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Loan Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Expected Return</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loansGivenData.loans.map((loan, index) => (
              <TableRow key={index} hover>
                <TableCell>{loan.borrowerName}</TableCell>
                <TableCell>{loan.relationship}</TableCell>
                <TableCell align="right">{formatCurrency(loan.amount)}</TableCell>
                <TableCell align="right">{formatCurrency(loan.remainingAmount)}</TableCell>
                <TableCell>{formatDate(loan.loanDate)}</TableCell>
                <TableCell>{formatDate(loan.expectedRepaymentDate)}</TableCell>
                <TableCell><Chip label={loan.status || 'Active'} color={loan.remainingAmount > 0 ? 'warning' : 'success'} size="small" /></TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => onEditLoan(loan)}><EditIcon /></IconButton>
                  <IconButton size="small" color="success" onClick={() => onAddRepayment(loan)}><PaymentIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LoansGivenTab;
