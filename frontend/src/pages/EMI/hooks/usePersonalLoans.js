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
      
      console.log('Personal loans response:', loansRes.data);
      console.log('Personal loans summary response:', summaryRes.data);
      
      setPersonalLoans(loansRes.data.loans || loansRes.data.data || []);
      setPersonalLoansSummary(summaryRes.data.summary || summaryRes.data.data || null);
    } catch (err) {
      console.error('Error fetching personal loans:', err);
      setPersonalLoans([]);
      setPersonalLoansSummary(null);
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
