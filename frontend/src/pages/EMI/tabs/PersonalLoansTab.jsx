import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, Chip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PaymentIcon from '@mui/icons-material/Payment';
import { formatCurrency, formatDate } from '../utils/formatters';

const PersonalLoansTab = ({ personalLoansData, onAddLoan, onEditLoan, onAddRepayment }) => {
  if (!personalLoansData || !personalLoansData.loans || personalLoansData.loans.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" action={<IconButton onClick={onAddLoan}><AddIcon /></IconButton>}>No personal loans yet. Click + to add</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Personal Loans (Taken)</Typography>
        <IconButton onClick={onAddLoan} color="primary" size="large"><AddIcon /></IconButton>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'warning.light' }}>
              <TableCell sx={{ fontWeight: 700 }}>Lender</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Relationship</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Principal</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Outstanding</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Interest</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Taken On</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {personalLoansData.loans.map((loan, index) => (
              <TableRow key={index} hover>
                <TableCell>{loan.lenderName}</TableCell>
                <TableCell>{loan.relationship}</TableCell>
                <TableCell align="right">{formatCurrency(loan.principalAmount)}</TableCell>
                <TableCell align="right">{formatCurrency(loan.outstandingAmount)}</TableCell>
                <TableCell align="right">{loan.interestRate ? `${loan.interestRate}%` : 'None'}</TableCell>
                <TableCell>{formatDate(loan.loanTakenDate)}</TableCell>
                <TableCell><Chip label={loan.priority} color={loan.priority === 'high' ? 'error' : 'default'} size="small" /></TableCell>
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

export default PersonalLoansTab;
