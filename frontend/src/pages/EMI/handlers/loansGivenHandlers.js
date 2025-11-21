import { useState } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';

const API_URL = API_BASE;

export const useLoansGivenHandlers = ({ fetchLoansGiven }) => {
  const [loanGivenDialogOpen, setLoanGivenDialogOpen] = useState(false);
  const [selectedLoanGiven, setSelectedLoanGiven] = useState(null);
  const [loanGivenFormData, setLoanGivenFormData] = useState({
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
  const [repaymentDialogOpen, setRepaymentDialogOpen] = useState(false);
  const [repaymentData, setRepaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    transactionId: '',
    notes: ''
  });

  const handleSaveLoanGiven = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (selectedLoanGiven) {
        await axios.put(`${API_URL}/loans-given/${selectedLoanGiven.id}`, loanGivenFormData, config);
        alert('Loan updated successfully!');
      } else {
        await axios.post(`${API_URL}/loans-given`, loanGivenFormData, config);
        alert('Loan recorded successfully!');
      }
      
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
    } catch (err) {
      console.error('Error saving loan:', err);
      alert(err.response?.data?.message || 'Failed to save loan');
    }
  };

  const handleAddRepayment = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.post(`${API_URL}/loans-given/${selectedLoanGiven.id}/repayment`, repaymentData, config);
      alert('Repayment added successfully!');
      
      setRepaymentDialogOpen(false);
      setRepaymentData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'cash',
        transactionId: '',
        notes: ''
      });
      fetchLoansGiven();
    } catch (err) {
      console.error('Error adding repayment:', err);
      alert(err.response?.data?.message || 'Failed to add repayment');
    }
  };

  const handleDeleteLoanGiven = async (loanId) => {
    if (!confirm('Are you sure you want to delete this loan record?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.delete(`${API_URL}/loans-given/${loanId}`, config);
      alert('Loan deleted successfully!');
      fetchLoansGiven();
    } catch (err) {
      console.error('Error deleting loan:', err);
      alert(err.response?.data?.message || 'Failed to delete loan');
    }
  };

  const handleWriteOffLoan = async (loanId) => {
    if (!confirm('Are you sure you want to write off this loan?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.put(`${API_URL}/loans-given/${loanId}/write-off`, {}, config);
      alert('Loan written off successfully!');
      fetchLoansGiven();
    } catch (err) {
      console.error('Error writing off loan:', err);
      alert(err.response?.data?.message || 'Failed to write off loan');
    }
  };

  return {
    loanGivenDialogProps: {
      open: loanGivenDialogOpen,
      onClose: () => setLoanGivenDialogOpen(false),
      onSave: handleSaveLoanGiven,
      selectedLoan: selectedLoanGiven,
      formData: loanGivenFormData,
      setFormData: setLoanGivenFormData
    },
    repaymentDialogProps: {
      open: repaymentDialogOpen,
      onClose: () => setRepaymentDialogOpen(false),
      onSave: handleAddRepayment,
      selectedLoan: selectedLoanGiven,
      formData: repaymentData,
      setFormData: setRepaymentData
    },
    openAddDialog: () => {
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
      setLoanGivenDialogOpen(true);
    },
    openEditDialog: (loan) => {
      setSelectedLoanGiven(loan);
      setLoanGivenFormData({
        ...loan,
        loanDate: new Date(loan.loanDate).toISOString().split('T')[0],
        expectedRepaymentDate: loan.expectedRepaymentDate ? 
          new Date(loan.expectedRepaymentDate).toISOString().split('T')[0] : ''
      });
      setLoanGivenDialogOpen(true);
    },
    openRepaymentDialog: (loan) => {
      setSelectedLoanGiven(loan);
      setRepaymentDialogOpen(true);
    },
    handleDeleteLoanGiven,
    handleWriteOffLoan
  };
};
