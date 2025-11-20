import { useState } from 'react';
import * as api from './api';

export const usePersonalLoans = () => {
  const [personalLoans, setPersonalLoans] = useState([]);
  const [personalLoansSummary, setPersonalLoansSummary] = useState(null);
  const [personalLoansLoading, setPersonalLoansLoading] = useState(false);
  const [personalLoanDialogOpen, setPersonalLoanDialogOpen] = useState(false);
  const [selectedPersonalLoan, setSelectedPersonalLoan] = useState(null);
  const [personalLoanFormData, setPersonalLoanFormData] = useState({
    lenderName: '',
    relationship: 'Friend',
    principalAmount: '',
    loanTakenDate: new Date().toISOString().split('T')[0],
    interestRate: 0,
    interestType: 'none',
    purpose: '',
    contactDetails: {
      phone: '',
      email: ''
    },
    notes: '',
    priority: 'medium',
    tags: []
  });
  const [personalLoanRepaymentDialogOpen, setPersonalLoanRepaymentDialogOpen] = useState(false);
  const [personalLoanRepaymentData, setPersonalLoanRepaymentData] = useState({
    amount: '',
    notes: ''
  });

  const fetchPersonalLoans = async () => {
    setPersonalLoansLoading(true);
    try {
      const data = await api.fetchPersonalLoans();
      setPersonalLoans(data.loans || []);
      setPersonalLoansSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching personal loans:', err);
      alert('Failed to fetch personal loans');
    } finally {
      setPersonalLoansLoading(false);
    }
  };

  const handleSavePersonalLoan = async () => {
    try {
      await api.createOrUpdatePersonalLoan(personalLoanFormData, selectedPersonalLoan?.id);
      setPersonalLoanDialogOpen(false);
      setSelectedPersonalLoan(null);
      setPersonalLoanFormData({
        lenderName: '',
        relationship: 'Friend',
        principalAmount: '',
        loanTakenDate: new Date().toISOString().split('T')[0],
        interestRate: 0,
        interestType: 'none',
        purpose: '',
        contactDetails: { phone: '', email: '' },
        notes: '',
        priority: 'medium',
        tags: []
      });
      fetchPersonalLoans();
      alert(selectedPersonalLoan ? 'Loan updated successfully!' : 'Personal loan created successfully!');
    } catch (err) {
      console.error('Error saving personal loan:', err);
      alert(err.response?.data?.message || 'Failed to save personal loan');
    }
  };

  const handleAddPersonalLoanRepayment = async () => {
    if (!selectedPersonalLoan) return;
    try {
      await api.addPersonalLoanRepayment(selectedPersonalLoan.id, personalLoanRepaymentData);
      setPersonalLoanRepaymentDialogOpen(false);
      setPersonalLoanRepaymentData({
        amount: '',
        notes: ''
      });
      fetchPersonalLoans();
      alert('Repayment added successfully!');
    } catch (err) {
      console.error('Error adding repayment:', err);
      alert(err.response?.data?.message || 'Failed to add repayment');
    }
  };

  const handleMarkPersonalLoanRepaid = async (loanId) => {
    if (!window.confirm('Mark this loan as fully repaid?')) return;
    try {
      await api.markPersonalLoanAsRepaid(loanId);
      fetchPersonalLoans();
      alert('Loan marked as repaid successfully!');
    } catch (err) {
      console.error('Error marking loan as repaid:', err);
      alert(err.response?.data?.message || 'Failed to mark loan as repaid');
    }
  };

  const handleDeletePersonalLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this loan?')) return;
    try {
      await api.deletePersonalLoan(loanId);
      fetchPersonalLoans();
      alert('Personal loan deleted successfully!');
    } catch (err) {
      console.error('Error deleting personal loan:', err);
      alert(err.response?.data?.message || 'Failed to delete loan');
    }
  };

  return {
    personalLoans,
    personalLoansSummary,
    personalLoansLoading,
    personalLoanDialogOpen,
    selectedPersonalLoan,
    personalLoanFormData,
    personalLoanRepaymentDialogOpen,
    personalLoanRepaymentData,
    setPersonalLoanDialogOpen,
    setSelectedPersonalLoan,
    setPersonalLoanFormData,
    setPersonalLoanRepaymentDialogOpen,
    setPersonalLoanRepaymentData,
    fetchPersonalLoans,
    handleSavePersonalLoan,
    handleAddPersonalLoanRepayment,
    handleMarkPersonalLoanRepaid,
    handleDeletePersonalLoan
  };
};
