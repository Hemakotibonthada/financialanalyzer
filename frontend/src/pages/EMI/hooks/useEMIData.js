import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';

const API_URL = API_BASE;

export const useEMIData = (selectedPeriod, trendsMonths) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [upcomingPayments, setUpcomingPayments] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [overviewRes, upcomingRes, chartsRes, insightsRes] = await Promise.all([
        axios.get(`${API_URL}/emi/overview`, config),
        axios.get(`${API_URL}/emi/upcoming?months=36`, config),
        axios.get(`${API_URL}/emi/charts`, config),
        axios.get(`${API_URL}/emi/insights`, config)
      ]);

      setOverview(overviewRes.data.data);
      setUpcomingPayments(upcomingRes.data.data);
      setChartData(chartsRes.data.data);
      setInsights(insightsRes.data.data);

      console.debug('EMI fetchAllData - API_URL:', API_URL, {
        overviewCount: overviewRes.data?.data ? Object.keys(overviewRes.data.data).length : 0,
        upcomingMonths: upcomingRes.data?.data?.monthlyBreakdown?.length ?? 0,
        chartsKeys: chartsRes.data?.data ? Object.keys(chartsRes.data.data) : [],
        insightsCount: insightsRes.data?.data?.length ?? 0
      });
    } catch (err) {
      console.error('Error fetching EMI data:', err);
      setError(err.response?.data?.message || 'Failed to fetch EMI data');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchAllData();
    fetchMonthlyTrends(trendsMonths);
  }, [selectedPeriod, trendsMonths]);

  return {
    loading,
    error,
    setError,
    overview,
    upcomingPayments,
    setUpcomingPayments,
    chartData,
    insights,
    monthlyTrends,
    trendsLoading,
    fetchAllData,
    fetchMonthlyTrends
  };
};
