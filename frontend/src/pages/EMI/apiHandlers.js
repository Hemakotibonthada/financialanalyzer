import axios from 'axios';
import { API_URL } from './constants';
import { showPasswordNotification, extractPasswordFromResponse, downloadFileWithPassword } from '../../utils/documentPasswordNotification';

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// ==================== CORE EMI FUNCTIONS ====================
export const fetchUserProfile = async () => {
  try {
    const response = await axios.get(`${API_URL}/profile`, getAuthHeaders());
    console.log('Profile data loaded:', response.data.data);
    return response.data.data;
  } catch (err) {
    console.error('Error fetching profile:', err);
    throw err;
  }
};

export const fetchAllData = async (selectedPeriod = 12) => {
  try {
    const config = getAuthHeaders();

    const [overviewRes, upcomingRes, chartsRes, insightsRes] = await Promise.all([
      axios.get(`${API_URL}/emi/overview`, config),
      axios.get(`${API_URL}/emi/upcoming?months=36`, config),
      axios.get(`${API_URL}/emi/charts`, config),
      axios.get(`${API_URL}/emi/insights`, config)
    ]);

    console.debug('EMI fetchAllData - API_URL:', API_URL, {
      overviewCount: overviewRes.data?.data ? Object.keys(overviewRes.data.data).length : 0,
      upcomingMonths: upcomingRes.data?.data?.monthlyBreakdown?.length ?? 0,
      chartsKeys: chartsRes.data?.data ? Object.keys(chartsRes.data.data) : [],
      insightsCount: insightsRes.data?.data?.length ?? 0
    });

    return {
      overview: overviewRes.data.data,
      upcomingPayments: upcomingRes.data.data,
      chartData: chartsRes.data.data,
      insights: insightsRes.data.data
    };
  } catch (err) {
    console.error('Error fetching EMI data:', err);
    throw err;
  }
};

export const fetchMonthlyTrends = async (months = 6) => {
  try {
    const response = await axios.get(`${API_URL}/emi/monthly-trends?months=${months}`, getAuthHeaders());
    console.debug('EMI fetchMonthlyTrends - API_URL:', API_URL, 'months:', months, 'items:', response.data?.data?.monthlyTrends?.length ?? 0);
    return response.data.data;
  } catch (err) {
    console.error('Error fetching monthly trends:', err);
    throw err;
  }
};

export const handleExportMonthlyTrends = async (format, trendsMonths) => {
  try {
    const params = new URLSearchParams({
      months: trendsMonths,
      format: format
    });
    
    const response = await axios.get(`${API_URL}/emi/monthly-trends/export?${params}`, {
      ...getAuthHeaders(),
      responseType: 'blob'
    });
    
    const password = extractPasswordFromResponse(response);
    const fileExtension = format === 'pdf' ? 'pdf' : 'xlsx';
    const fileName = `Monthly_Trends_${trendsMonths}months_${new Date().toISOString().slice(0, 10)}.${fileExtension}`;
    
    downloadFileWithPassword(new Blob([response.data]), fileName, password);
  } catch (err) {
    console.error('Error exporting monthly trends:', err);
    throw err;
  }
};

export const syncStatements = async (maxResults = 50) => {
  try {
    const response = await axios.post(
      `${API_URL}/emi/sync-statements`,
      { maxResults },
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error('Error syncing statements:', err);
    throw err;
  }
};

export const exportReport = async (exportFormat, exportDateRange) => {
  try {
    const response = await axios.post(
      `${API_URL}/emi/export`,
      {
        format: exportFormat,
        startDate: exportDateRange.startDate,
        endDate: exportDateRange.endDate
      },
      {
        ...getAuthHeaders(),
        responseType: 'blob'
      }
    );
    
    const password = extractPasswordFromResponse(response);
    const fileExtension = exportFormat === 'pdf' ? 'pdf' : 'xlsx';
    const fileName = `EMI_Report_${exportDateRange.startDate}_to_${exportDateRange.endDate}.${fileExtension}`;
    
    downloadFileWithPassword(new Blob([response.data]), fileName, password);
  } catch (err) {
    console.error('Error exporting report:', err);
    throw err;
  }
};

// ==================== MANUAL EMI FUNCTIONS ====================
export const createManualEMI = async (manualEMIData) => {
  try {
    const response = await axios.post(
      `${API_URL}/emi/manual`,
      manualEMIData,
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error('Error creating manual EMI:', err);
    throw err;
  }
};

export const deleteEMI = async (emiId) => {
  try {
    await axios.delete(`${API_URL}/emi/${emiId}`, getAuthHeaders());
  } catch (err) {
    console.error('Error deleting EMI:', err);
    throw err;
  }
};

export const markPaymentAsPaid = async (emiId, installmentNumber) => {
  try {
    const response = await axios.post(
      `${API_URL}/emi/${emiId}/mark-paid`,
      { installmentNumber },
      getAuthHeaders()
    );
    return response.data;
  } catch (err) {
    console.error('Error marking payment as paid:', err);
    throw err;
  }
};

// ==================== LOANS GIVEN FUNCTIONS ====================
export const fetchLoansGiven = async () => {
  try {
    const [loansResponse, summaryResponse] = await Promise.all([
      axios.get(`${API_URL}/loans-given`, getAuthHeaders()),
      axios.get(`${API_URL}/loans-given/summary`, getAuthHeaders())
    ]);
    
    return {
      loans: loansResponse.data.data,
      summary: summaryResponse.data.data
    };
  } catch (err) {
    console.error('Error fetching loans given:', err);
    throw err;
  }
};

export const saveLoanGiven = async (loanGivenFormData, selectedLoanGiven) => {
  try {
    if (selectedLoanGiven) {
      await axios.put(`${API_URL}/loans-given/${selectedLoanGiven.id}`, loanGivenFormData, getAuthHeaders());
      return 'updated';
    } else {
      await axios.post(`${API_URL}/loans-given`, loanGivenFormData, getAuthHeaders());
      return 'created';
    }
  } catch (err) {
    console.error('Error saving loan:', err);
    throw err;
  }
};

export const addRepayment = async (loanId, repaymentData) => {
  try {
    await axios.post(`${API_URL}/loans-given/${loanId}/repayment`, repaymentData, getAuthHeaders());
  } catch (err) {
    console.error('Error adding repayment:', err);
    throw err;
  }
};

export const deleteLoanGiven = async (loanId) => {
  try {
    await axios.delete(`${API_URL}/loans-given/${loanId}`, getAuthHeaders());
  } catch (err) {
    console.error('Error deleting loan:', err);
    throw err;
  }
};

export const writeOffLoan = async (loanId) => {
  try {
    await axios.put(`${API_URL}/loans-given/${loanId}/write-off`, {}, getAuthHeaders());
  } catch (err) {
    console.error('Error writing off loan:', err);
    throw err;
  }
};

// ==================== PERSONAL LOANS FUNCTIONS ====================
export const fetchPersonalLoans = async () => {
  try {
    const [loansRes, summaryRes] = await Promise.all([
      axios.get(`${API_URL}/personal-loans`, getAuthHeaders()),
      axios.get(`${API_URL}/personal-loans/summary`, getAuthHeaders())
    ]);
    
    return {
      loans: loansRes.data.data || [],
      summary: summaryRes.data.data || null
    };
  } catch (err) {
    console.error('Error fetching personal loans:', err);
    throw err;
  }
};

export const savePersonalLoan = async (personalLoanFormData, selectedPersonalLoan) => {
  try {
    if (selectedPersonalLoan) {
      await axios.put(`${API_URL}/personal-loans/${selectedPersonalLoan.id}`, personalLoanFormData, getAuthHeaders());
      return 'updated';
    } else {
      await axios.post(`${API_URL}/personal-loans`, personalLoanFormData, getAuthHeaders());
      return 'created';
    }
  } catch (err) {
    console.error('Error saving personal loan:', err);
    throw err;
  }
};

export const addPersonalLoanRepayment = async (loanId, amount) => {
  try {
    await axios.post(
      `${API_URL}/personal-loans/${loanId}/repayment`,
      { amount: parseFloat(amount) },
      getAuthHeaders()
    );
  } catch (err) {
    console.error('Error adding repayment:', err);
    throw err;
  }
};

export const markPersonalLoanRepaid = async (loanId) => {
  try {
    await axios.put(`${API_URL}/personal-loans/${loanId}/mark-repaid`, {}, getAuthHeaders());
  } catch (err) {
    console.error('Error marking loan as repaid:', err);
    throw err;
  }
};

export const deletePersonalLoan = async (loanId) => {
  try {
    await axios.delete(`${API_URL}/personal-loans/${loanId}`, getAuthHeaders());
  } catch (err) {
    console.error('Error deleting personal loan:', err);
    throw err;
  }
};
