import { useState } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';

const API_URL = API_BASE;

export const useLoansGiven = () => {
  const [loansGiven, setLoansGiven] = useState([]);
  const [loansGivenSummary, setLoansGivenSummary] = useState(null);
  const [loansGivenLoading, setLoansGivenLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLoansGiven = async () => {
    setLoansGivenLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const [loansResponse, summaryResponse] = await Promise.all([
        axios.get(`${API_URL}/loans-given`, config),
        axios.get(`${API_URL}/loans-given/summary`, config)
      ]);
      
      setLoansGiven(loansResponse.data.data);
      setLoansGivenSummary(summaryResponse.data.data);
    } catch (err) {
      console.error('Error fetching loans given:', err);
      setError(err.response?.data?.message || 'Failed to fetch loans given');
    } finally {
      setLoansGivenLoading(false);
    }
  };

  const saveLoanGiven = async (loanData, selectedLoan) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      if (selectedLoan) {
        await axios.put(`${API_URL}/loans-given/${selectedLoan.id}`, loanData, config);
        return { success: true, message: 'Loan updated successfully!' };
      } else {
        await axios.post(`${API_URL}/loans-given`, loanData, config);
        return { success: true, message: 'Loan recorded successfully!' };
      }
    } catch (err) {
      console.error('Error saving loan:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to save loan' };
    }
  };

  const addRepayment = async (loanId, repaymentData) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(`${API_URL}/loans-given/${loanId}/repayment`, repaymentData, config);
      return { success: true, message: 'Repayment added successfully!' };
    } catch (err) {
      console.error('Error adding repayment:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to add repayment' };
    }
  };

  const deleteLoanGiven = async (loanId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.delete(`${API_URL}/loans-given/${loanId}`, config);
      return { success: true, message: 'Loan deleted successfully!' };
    } catch (err) {
      console.error('Error deleting loan:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to delete loan' };
    }
  };

  const writeOffLoan = async (loanId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.put(`${API_URL}/loans-given/${loanId}/write-off`, {}, config);
      return { success: true, message: 'Loan written off successfully!' };
    } catch (err) {
      console.error('Error writing off loan:', err);
      return { success: false, message: err.response?.data?.message || 'Failed to write off loan' };
    }
  };

  return {
    loansGiven,
    loansGivenSummary,
    loansGivenLoading,
    error,
    fetchLoansGiven,
    saveLoanGiven,
    addRepayment,
    deleteLoanGiven,
    writeOffLoan
  };
};
