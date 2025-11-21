import { useState } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';

const API_URL = API_BASE;

export const usePersonalLoansHandlers = ({ fetchPersonalLoans }) => {
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
    contactDetails: { phone: '', email: '' },
    notes: '',
    priority: 'medium',
    tags: []
  });
  const [personalLoanRepaymentDialogOpen, setPersonalLoanRepaymentDialogOpen] = useState(false);
  const [personalLoanRepaymentData, setPersonalLoanRepaymentData] = useState({
    amount: '',
    notes: ''
  });

  const handleSavePersonalLoan = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (selectedPersonalLoan) {
        await axios.put(`${API_URL}/personal-loans/${selectedPersonalLoan.id}`, personalLoanFormData, config);
        alert('Personal loan updated successfully!');
      } else {
        await axios.post(`${API_URL}/personal-loans`, personalLoanFormData, config);
        alert('Personal loan added successfully!');
      }
      
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
    } catch (err) {
      console.error('Error saving personal loan:', err);
      alert(err.response?.data?.message || 'Failed to save personal loan');
    }
  };

  const handleAddPersonalLoanRepayment = async () => {
    if (!selectedPersonalLoan) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.post(
        `${API_URL}/personal-loans/${selectedPersonalLoan.id}/repayment`, 
        { amount: parseFloat(personalLoanRepaymentData.amount) },
        config
      );
      
      alert('Repayment added successfully!');
      setPersonalLoanRepaymentDialogOpen(false);
      setSelectedPersonalLoan(null);
      setPersonalLoanRepaymentData({ amount: '', notes: '' });
      fetchPersonalLoans();
    } catch (err) {
      console.error('Error adding repayment:', err);
      alert(err.response?.data?.message || 'Failed to add repayment');
    }
  };

  const handleMarkPersonalLoanRepaid = async (loanId) => {
    if (!confirm('Mark this loan as fully repaid?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.put(`${API_URL}/personal-loans/${loanId}/mark-repaid`, {}, config);
      alert('Loan marked as repaid successfully!');
      fetchPersonalLoans();
    } catch (err) {
      console.error('Error marking loan as repaid:', err);
      alert(err.response?.data?.message || 'Failed to mark loan as repaid');
    }
  };

  const handleDeletePersonalLoan = async (loanId) => {
    if (!confirm('Are you sure you want to delete this personal loan record?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.delete(`${API_URL}/personal-loans/${loanId}`, config);
      alert('Personal loan deleted successfully!');
      fetchPersonalLoans();
    } catch (err) {
      console.error('Error deleting personal loan:', err);
      alert(err.response?.data?.message || 'Failed to delete personal loan');
    }
  };

  return {
    personalLoanDialogProps: {
      open: personalLoanDialogOpen,
      onClose: () => setPersonalLoanDialogOpen(false),
      onSave: handleSavePersonalLoan,
      selectedLoan: selectedPersonalLoan,
      formData: personalLoanFormData,
      setFormData: setPersonalLoanFormData
    },
    repaymentDialogProps: {
      open: personalLoanRepaymentDialogOpen,
      onClose: () => setPersonalLoanRepaymentDialogOpen(false),
      onSave: handleAddPersonalLoanRepayment,
      selectedLoan: selectedPersonalLoan,
      formData: personalLoanRepaymentData,
      setFormData: setPersonalLoanRepaymentData
    },
    openAddDialog: () => {
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
      setPersonalLoanDialogOpen(true);
    },
    openEditDialog: (loan) => {
      setSelectedPersonalLoan(loan);
      setPersonalLoanFormData({
        ...loan,
        loanTakenDate: new Date(loan.loanTakenDate).toISOString().split('T')[0]
      });
      setPersonalLoanDialogOpen(true);
    },
    openRepaymentDialog: (loan) => {
      setSelectedPersonalLoan(loan);
      setPersonalLoanRepaymentData({ amount: '', notes: '' });
      setPersonalLoanRepaymentDialogOpen(true);
    },
    handleMarkPersonalLoanRepaid,
    handleDeletePersonalLoan
  };
};
