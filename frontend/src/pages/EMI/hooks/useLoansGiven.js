import { useState } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';

const API_URL = API_BASE;

export const useLoansGiven = () => {
  const [loansGiven, setLoansGiven] = useState([]);
  const [loansGivenSummary, setLoansGivenSummary] = useState(null);
  const [loansGivenLoading, setLoansGivenLoading] = useState(false);

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
      throw err;
    } finally {
      setLoansGivenLoading(false);
    }
  };

  return {
    loansGiven,
    loansGivenSummary,
    loansGivenLoading,
    fetchLoansGiven
  };
};
