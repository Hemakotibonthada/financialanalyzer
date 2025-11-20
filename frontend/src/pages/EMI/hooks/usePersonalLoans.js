import { useState } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';

const API_URL = API_BASE;

export const usePersonalLoans = () => {
  const [personalLoans, setPersonalLoans] = useState([]);
  const [personalLoansSummary, setPersonalLoansSummary] = useState(null);
  const [personalLoansLoading, setPersonalLoansLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPersonalLoans = async () => {
    try {
      setPersonalLoansLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const [loansRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/personal-loans`, config),
        axios.get(`${API_URL}/personal-loans/summary`, config)
      ]);
      
      setPersonalLoans(loansRes.data.data || []);
      setPersonalLoansSummary(summaryRes.data.data || null);
    } catch (err) {
      console.error('Error fetching personal loans:', err);
      setError(err.response?.data?.message || 'Failed to fetch personal loans');
    } finally {
      setPersonalLoansLoading(false);
    }
  };

  const savePersonalLoan = async (loanData, selectedLoan) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      if (selectedLoan) {
        await axios.put(`${API_URL}/personal-loans/${selectedLoan.id}`, loanData, config);
        return { success: true, message: 'Personal loan updated successfully!' };
      } else {
        await axios.post(`${API_URL}/personal-loans`, loanData, config);
        return { success: true, message: 'Personal loan added successfully!' };
      }
    } catch (err) {
      console.error('Error saving personal loan:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to save personal loan' };
    }
  };

  const addPersonalLoanRepayment = async (loanId, amount) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(
        `${API_URL}/personal-loans/${loanId}/repayment`, 
        { amount: parseFloat(amount) },
        config
      );
      return { success: true, message: 'Repayment added successfully!' };
    } catch (err) {
      console.error('Error adding repayment:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to add repayment' };
    }
  };

  const markPersonalLoanRepaid = async (loanId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.put(`${API_URL}/personal-loans/${loanId}/mark-repaid`, {}, config);
      return { success: true, message: 'Loan marked as repaid successfully!' };
    } catch (err) {
      console.error('Error marking loan as repaid:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to mark loan as repaid' };
    }
  };

  const deletePersonalLoan = async (loanId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.delete(`${API_URL}/personal-loans/${loanId}`, config);
      return { success: true, message: 'Personal loan deleted successfully!' };
    } catch (err) {
      console.error('Error deleting personal loan:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to delete personal loan' };
    }
  };

  return {
    personalLoans,
    personalLoansSummary,
    personalLoansLoading,
    error,
    fetchPersonalLoans,
    savePersonalLoan,
    addPersonalLoanRepayment,
    markPersonalLoanRepaid,
    deletePersonalLoan
  };
};
