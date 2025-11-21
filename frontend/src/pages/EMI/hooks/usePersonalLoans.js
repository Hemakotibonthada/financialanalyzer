import { useState } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';

const API_URL = API_BASE;

export const usePersonalLoans = () => {
  const [personalLoans, setPersonalLoans] = useState([]);
  const [personalLoansSummary, setPersonalLoansSummary] = useState(null);
  const [personalLoansLoading, setPersonalLoansLoading] = useState(false);

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
      throw err;
    } finally {
      setPersonalLoansLoading(false);
    }
  };

  return {
    personalLoans,
    personalLoansSummary,
    personalLoansLoading,
    fetchPersonalLoans
  };
};
