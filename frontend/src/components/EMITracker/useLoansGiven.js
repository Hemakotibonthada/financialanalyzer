import { useState } from 'react';
import * as api from './api';

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

  const fetchLoansGiven = async () => {
    setLoansGivenLoading(true);
    try {
      const data = await api.fetchLoansGiven();
      setLoansGiven(data.loans || []);
      setLoansGivenSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching loans given:', err);
      alert('Failed to fetch loans given');
    } finally {
      setLoansGivenLoading(false);
    }
  };

  const handleSaveLoanGiven = async () => {
    try {
      await api.createOrUpdateLoanGiven(loanGivenFormData, selectedLoanGiven?.id);
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
      fetchLoansGiven();
      alert(selectedLoanGiven ? 'Loan updated successfully!' : 'Loan given created successfully!');
    } catch (err) {
      console.error('Error saving loan given:', err);
      alert(err.response?.data?.message || 'Failed to save loan');
    }
  };

  const handleAddRepayment = async () => {
    if (!selectedLoanGiven) return;
    try {
      await api.addRepaymentToLoan(selectedLoanGiven.id, repaymentData);
      setRepaymentDialogOpen(false);
      setRepaymentData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'cash',
        transactionId: '',
        notes: ''
      });
      fetchLoansGiven();
      alert('Repayment added successfully!');
    } catch (err) {
      console.error('Error adding repayment:', err);
      alert(err.response?.data?.message || 'Failed to add repayment');
    }
  };

  const handleDeleteLoanGiven = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this loan?')) return;
    try {
      await api.deleteLoanGiven(loanId);
      fetchLoansGiven();
      alert('Loan deleted successfully!');
    } catch (err) {
      console.error('Error deleting loan:', err);
      alert(err.response?.data?.message || 'Failed to delete loan');
    }
  };

  const handleWriteOffLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to write off this loan? This action cannot be undone.')) return;
    try {
      await api.writeOffLoan(loanId);
      fetchLoansGiven();
      alert('Loan written off successfully!');
    } catch (err) {
      console.error('Error writing off loan:', err);
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
    fetchLoansGiven,
    handleSaveLoanGiven,
    handleAddRepayment,
    handleDeleteLoanGiven,
    handleWriteOffLoan
  };
};
