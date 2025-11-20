import { useState } from 'react';
import * as api from './apiHandlers';

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

  const loadPersonalLoans = async () => {
    try {
      setPersonalLoansLoading(true);
      const data = await api.fetchPersonalLoans();
      setPersonalLoans(data.loans);
      setPersonalLoansSummary(data.summary);
    } catch (err) {
      alert('Failed to fetch personal loans');
    } finally {
      setPersonalLoansLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const action = await api.savePersonalLoan(personalLoanFormData, selectedPersonalLoan);
      alert(action === 'updated' ? 'Personal loan updated successfully!' : 'Personal loan added successfully!');
      
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
        contactDetails: {
          phone: '',
          email: ''
        },
        notes: '',
        priority: 'medium',
        tags: []
      });
      loadPersonalLoans();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save personal loan');
    }
  };

  const handleAddRepayment = async () => {
    if (!selectedPersonalLoan) return;
    
    try {
      await api.addPersonalLoanRepayment(selectedPersonalLoan.id, personalLoanRepaymentData.amount);
      
      alert('Repayment added successfully!');
      setPersonalLoanRepaymentDialogOpen(false);
      setSelectedPersonalLoan(null);
      setPersonalLoanRepaymentData({
        amount: '',
        notes: ''
      });
      loadPersonalLoans();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add repayment');
    }
  };

  const handleMarkRepaid = async (loanId) => {
    if (!confirm('Mark this loan as fully repaid?')) return;
    
    try {
      await api.markPersonalLoanRepaid(loanId);
      alert('Loan marked as repaid successfully!');
      loadPersonalLoans();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark loan as repaid');
    }
  };

  const handleDelete = async (loanId) => {
    if (!confirm('Are you sure you want to delete this personal loan?')) return;
    
    try {
      await api.deletePersonalLoan(loanId);
      alert('Personal loan deleted successfully!');
      loadPersonalLoans();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete personal loan');
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
    loadPersonalLoans,
    handleSave,
    handleAddRepayment,
    handleMarkRepaid,
    handleDelete
  };
};
