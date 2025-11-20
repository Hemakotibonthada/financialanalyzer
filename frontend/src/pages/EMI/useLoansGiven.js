import { useState } from 'react';
import * as api from './apiHandlers';

export const useLoansGiven = () => {
  const [loansGiven, setLoansGiven] = useState([]);
  const [loansGivenSummary, setLoansGivenSummary] = useState(null);
  const [loansGivenLoading, setLoansGivenLoading] = useState(false);
  const [loanGivenDialogOpen, setLoanGivenDialogOpen] = useState(false);
  const [selectedLoanGiven, setSelectedLoanGiven] = useState(null);
  const [loanGivenFormData, setLoanGivenFormData] = useState({
    borrowerName: '',
    relationship: 'Friend',
    amount: '',
    loanDate: new Date().toISOString().split('T')[0],
    expectedRepaymentDate: '',
    purpose: '',
    contactDetails: {
      phone: '',
      email: ''
    },
    hasInterest: false,
    interestRate: 0,
    notes: '',
    priority: 'medium',
    tags: []
  });
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false);
  const [repaymentData, setRepaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    transactionId: '',
    notes: ''
  });

  const loadLoansGiven = async () => {
    setLoansGivenLoading(true);
    try {
      const data = await api.fetchLoansGiven();
      setLoansGiven(data.loans);
      setLoansGivenSummary(data.summary);
    } catch (err) {
      alert('Failed to fetch loans given');
    } finally {
      setLoansGivenLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const action = await api.saveLoanGiven(loanGivenFormData, selectedLoanGiven);
      alert(action === 'updated' ? 'Loan updated successfully!' : 'Loan recorded successfully!');
      
      setLoanGivenDialogOpen(false);
      setSelectedLoanGiven(null);
      setLoanGivenFormData({
        borrowerName: '',
        relationship: 'Friend',
        amount: '',
        loanDate: new Date().toISOString().split('T')[0],
        expectedRepaymentDate: '',
        purpose: '',
        contactDetails: { phone: '', email: '' },
        hasInterest: false,
        interestRate: 0,
        notes: '',
        priority: 'medium',
        tags: []
      });
      loadLoansGiven();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save loan');
    }
  };

  const handleAddRepayment = async () => {
    try {
      await api.addRepayment(selectedLoanGiven.id, repaymentData);
      alert('Repayment added successfully!');
      
      setRepaymentDialogOpen(false);
      setRepaymentData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'cash',
        transactionId: '',
        notes: ''
      });
      loadLoansGiven();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add repayment');
    }
  };

  const handleDelete = async (loanId) => {
    if (!confirm('Are you sure you want to delete this loan record?')) return;
    
    try {
      await api.deleteLoanGiven(loanId);
      alert('Loan deleted successfully!');
      loadLoansGiven();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete loan');
    }
  };

  const handleWriteOff = async (loanId) => {
    if (!confirm('Are you sure you want to write off this loan? This action marks it as unrecoverable.')) return;
    
    try {
      await api.writeOffLoan(loanId);
      alert('Loan written off successfully!');
      loadLoansGiven();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to write off loan');
    }
  };

  return {
    loansGiven,
    loansGivenSummary,
    loansGivenLoading,
    loanGivenDialogOpen,
    selectedLoanGiven,
    loanGivenFormData,
    repaymentDialogOpen,
    repaymentData,
    setLoanGivenDialogOpen,
    setSelectedLoanGiven,
    setLoanGivenFormData,
    setRepaymentDialogOpen,
    setRepaymentData,
    loadLoansGiven,
    handleSave,
    handleAddRepayment,
    handleDelete,
    handleWriteOff
  };
};
