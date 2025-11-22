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
      console.log('🔑 Token exists:', !!token, 'Length:', token?.length);
      
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      console.log('📡 Fetching EMI data from:', API_URL);

      const [overviewRes, upcomingRes, chartsRes, insightsRes] = await Promise.all([
        axios.get(`${API_URL}/emi/overview`, config),
        axios.get(`${API_URL}/emi/upcoming?months=36`, config),
        axios.get(`${API_URL}/emi/charts`, config),
        axios.get(`${API_URL}/emi/insights`, config)
      ]);

      console.log('📥 Raw API Responses:', {
        overview: overviewRes.data,
        upcoming: upcomingRes.data,
        charts: chartsRes.data,
        insights: insightsRes.data
      });

      // Backend returns: { success: true, data: { overview: {...}, activeEMIs: [...], completedEMIs: [...] } }
      // We need to destructure the data properly
      const overviewData = overviewRes.data.data;
      console.log('📊 Overview data structure:', overviewData);
      
      // Transform insights from object to array format expected by InsightsSection
      const insightsData = insightsRes.data.data;
      const insightsArray = [];
      
      if (insightsData && typeof insightsData === 'object') {
        // Add recommendations as insights
        if (insightsData.recommendations && Array.isArray(insightsData.recommendations)) {
          insightsData.recommendations.forEach(rec => {
            insightsArray.push({
              title: 'Recommendation',
              description: rec,
              severity: 'info',
              action: 'Review'
            });
          });
        }
        
        // Add other insights based on data
        if (insightsData.totalMonthlyBurden > 0) {
          insightsArray.push({
            title: 'Monthly EMI Burden',
            description: `Your total monthly EMI obligation is ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(insightsData.totalMonthlyBurden)}`,
            severity: insightsData.totalMonthlyBurden > 50000 ? 'warning' : 'success'
          });
        }
        
        if (insightsData.avgInterestRate > 0) {
          insightsArray.push({
            title: 'Average Interest Rate',
            description: `Your average EMI interest rate is ${insightsData.avgInterestRate.toFixed(2)}% p.a.`,
            severity: insightsData.avgInterestRate > 15 ? 'warning' : 'info'
          });
        }
        
        if (insightsData.totalOutstanding > 0) {
          insightsArray.push({
            title: 'Total Outstanding',
            description: `Total remaining amount across all EMIs: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(insightsData.totalOutstanding)}`,
            severity: 'info'
          });
        }
      }
      
      // Set the complete overview object (includes overview stats, activeEMIs, completedEMIs)
      setOverview(overviewData);
      setUpcomingPayments(upcomingRes.data.data);
      setChartData(chartsRes.data.data);
      setInsights(insightsArray); // Use transformed array

      console.log('📊 EMI Data Loaded:', {
        overview: overviewRes.data.data,
        activeEMIs: overviewRes.data.data?.activeEMIs?.length || 0,
        completedEMIs: overviewRes.data.data?.completedEMIs?.length || 0,
        upcomingPayments: upcomingRes.data.data,
        chartData: chartsRes.data.data,
        insights: insightsRes.data.data
      });

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
