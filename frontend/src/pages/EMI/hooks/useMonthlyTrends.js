import { useState } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';

const API_URL = API_BASE;

export const useMonthlyTrends = () => {
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [trendsMonths, setTrendsMonths] = useState(6);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMonthlyTrends = async (months = 6) => {
    setTrendsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const response = await axios.get(`${API_URL}/emi/monthly-trends?months=${months}`, config);
      setMonthlyTrends(response.data.data);

      console.debug('EMI fetchMonthlyTrends - API_URL:', API_URL, 'months:', months, 'items:', response.data?.data?.monthlyTrends?.length ?? 0);
    } catch (err) {
      console.error('Error fetching monthly trends:', err);
      setError(err.response?.data?.message || 'Failed to fetch monthly trends');
    } finally {
      setTrendsLoading(false);
    }
  };

  return {
    monthlyTrends,
    trendsMonths,
    setTrendsMonths,
    trendsLoading,
    fetchMonthlyTrends,
    error
  };
};
