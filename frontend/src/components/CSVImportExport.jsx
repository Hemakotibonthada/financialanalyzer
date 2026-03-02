import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Divider,
  TextField,
  Tab,
  Tabs,
  TableContainer,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  CheckCircle as SuccessIcon,
  CheckCircle,
  Error as ErrorIcon,
  Info as InfoIcon,
  GetApp as TemplateIcon,
  FileUpload as FileUploadIcon,
  InsertDriveFile as FileIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import axios from 'axios';

import { API_URL as API_BASE_URL } from '../services/api';

/**
 * CSVImportExport Component
 * Comprehensive CSV import/export functionality with preview and validation
 */
const CSVImportExport = () => {
  const [activeTab, setActiveTab] = useState('import'); // 'import' or 'export'
  const [importStep, setImportStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [bankFormat, setBankFormat] = useState('generic');
  const [availableFormats, setAvailableFormats] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [validateData, setValidateData] = useState(true);

  // Export options
  const [exportFilters, setExportFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    category: ''
  });

  const steps = ['Upload File', 'Preview & Validate', 'Import'];

  // Fetch available formats on mount
  useEffect(() => {
    fetchFormats();
  }, []);

  const fetchFormats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/csv/formats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAvailableFormats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch formats:', error);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImportStep(0);
      setPreviewData(null);
      setValidationResult(null);
      setImportResult(null);
    }
  };

  // Preview CSV file
  const handlePreview = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('rows', '10');

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/csv/preview`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setPreviewData(response.data.data);
        setBankFormat(response.data.data.detectedFormat);
        setImportStep(1);
      }
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to preview CSV file');
    } finally {
      setLoading(false);
    }
  };

  // Validate CSV file
  const handleValidate = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('bankFormat', bankFormat);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/csv/validate`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setValidationResult(response.data.data);
        setImportStep(2);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Failed to validate CSV file');
    } finally {
      setLoading(false);
    }
  };

  // Import CSV file
  const handleImport = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('bankFormat', bankFormat);
      formData.append('skipDuplicates', skipDuplicates);
      formData.append('validateData', validateData);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/csv/import`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setImportResult(response.data.data);
        // Reset form after successful import
        setTimeout(() => {
          setImportStep(0);
          setSelectedFile(null);
          setPreviewData(null);
          setValidationResult(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import CSV file');
    } finally {
      setLoading(false);
    }
  };

  // Export transactions
  const handleExport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = {};
      
      if (exportFilters.startDate) params.startDate = exportFilters.startDate;
      if (exportFilters.endDate) params.endDate = exportFilters.endDate;
      if (exportFilters.type) params.type = exportFilters.type;
      if (exportFilters.category) params.category = exportFilters.category;

      const response = await axios.get(`${API_BASE_URL}/csv/export`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export transactions');
    } finally {
      setLoading(false);
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/csv/template`, {
        params: { format: bankFormat },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template_${bankFormat}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Template download failed:', error);
      alert('Failed to download template');
    }
  };

  // Render import tab
  const renderImportTab = () => (
    <Box>
      <Stepper activeStep={importStep} sx={{ mb: 4 }} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {importStep === 0 && (
        <Box>
          {/* File Upload Section */}
          <Paper 
            sx={{ 
              p: 4, 
              mb: 3, 
              border: '2px dashed', 
              borderColor: selectedFile ? 'success.main' : 'grey.300',
              bgcolor: selectedFile ? 'success.50' : 'grey.50',
              textAlign: 'center',
              transition: 'all 0.3s'
            }}
          >
            <input
              accept=".csv"
              style={{ display: 'none' }}
              id="csv-file-input"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="csv-file-input">
              <FileUploadIcon 
                sx={{ 
                  fontSize: 64, 
                  color: selectedFile ? 'success.main' : 'grey.400', 
                  mb: 2 
                }} 
              />
              <Typography variant="h6" gutterBottom>
                {selectedFile ? 'File Selected' : 'Drop CSV file here or click to browse'}
              </Typography>
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                size="large"
                sx={{ mt: 2 }}
              >
                {selectedFile ? 'Change File' : 'Select CSV File'}
              </Button>
            </label>
          </Paper>

          {selectedFile && (
            <Alert 
              severity="success" 
              sx={{ mb: 3 }}
              icon={<CheckCircle />}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                {selectedFile.name}
              </Typography>
              <Typography variant="body2">
                Size: {(selectedFile.size / 1024).toFixed(2)} KB
              </Typography>
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Bank Statement Format</InputLabel>
            <Select
              value={bankFormat}
              onChange={(e) => setBankFormat(e.target.value)}
              label="Bank Statement Format"
            >
              {availableFormats.map((format) => (
                <MenuItem key={format.id} value={format.id}>
                  {format.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Button
                variant="outlined"
                startIcon={<TemplateIcon />}
                onClick={handleDownloadTemplate}
                fullWidth
                size="large"
              >
                Download Template
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Button
                variant="contained"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={!selectedFile || loading}
                fullWidth
                size="large"
              >
                {loading ? <CircularProgress size={24} /> : 'Preview & Continue'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {importStep === 1 && previewData && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }} icon={<InfoIcon />}>
            <Typography variant="subtitle2" fontWeight="bold">
              File Preview - {selectedFile?.name}
            </Typography>
            <Typography variant="body2">
              Detected Format: <Chip label={previewData.detectedFormat} size="small" color="primary" sx={{ ml: 1 }} />
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Showing first 5 rows of your data
            </Typography>
          </Alert>

          <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {previewData.headers.map((header, index) => (
                    <TableCell 
                      key={index}
                      sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.preview.map((row, rowIndex) => (
                  <TableRow 
                    key={rowIndex}
                    sx={{ '&:nth-of-type(odd)': { bgcolor: 'grey.50' } }}
                  >
                    {previewData.headers.map((header, colIndex) => (
                      <TableCell key={colIndex}>{row[header]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button
                variant="outlined"
                onClick={() => setImportStep(0)}
                disabled={loading}
                fullWidth
                size="large"
              >
                Back
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Button
                variant="contained"
                onClick={handleValidate}
                disabled={loading}
                fullWidth
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
              >
                {loading ? 'Validating...' : 'Validate & Continue'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      )}

      {importStep === 2 && validationResult && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {validationResult.total}
                </Typography>
                <Typography variant="caption">Total Rows</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {validationResult.valid}
                </Typography>
                <Typography variant="caption">Valid</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {validationResult.invalid}
                </Typography>
                <Typography variant="caption">Invalid</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {Math.round((validationResult.valid / validationResult.total) * 100)}%
                </Typography>
                <Typography variant="caption">Success Rate</Typography>
              </Paper>
            </Grid>
          </Grid>

          {validationResult.validationErrors && validationResult.validationErrors.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Validation Errors (showing first 10):</Typography>
              {validationResult.validationErrors.map((error, index) => (
                <Typography key={index} variant="body2">
                  Row {error.row}: {error.errors.join(', ')}
                </Typography>
              ))}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                />
              }
              label="Skip duplicate transactions"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={validateData}
                  onChange={(e) => setValidateData(e.target.checked)}
                />
              }
              label="Validate data before import"
            />
          </Box>

          {importResult ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Import Successful!</Typography>
              <Typography variant="body2">
                Imported: {importResult.imported} / Total: {importResult.total}
              </Typography>
              {importResult.skipped > 0 && (
                <Typography variant="body2">
                  Skipped (duplicates): {importResult.skipped}
                </Typography>
              )}
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setImportStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<SuccessIcon />}
                onClick={handleImport}
                disabled={loading || validationResult.valid === 0}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : `Import ${validationResult.valid} Transactions`}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );

  // Render export tab
  const renderExportTab = () => (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        Export Transactions to CSV
      </Typography>

      <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold" sx={{ mb: 2 }}>
          Filter Options (Optional)
        </Typography>
        
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={exportFilters.startDate}
              onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={exportFilters.endDate}
              onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={exportFilters.type}
                onChange={(e) => setExportFilters({ ...exportFilters, type: e.target.value })}
                label="Transaction Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="debit">Debit Only</MenuItem>
                <MenuItem value="credit">Credit Only</MenuItem>
                <MenuItem value="transfer">Transfers Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Category Filter"
              value={exportFilters.category}
              onChange={(e) => setExportFilters({ ...exportFilters, category: e.target.value })}
              placeholder="e.g., Food, Transport"
            />
          </Grid>
        </Grid>
      </Paper>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Leave filters empty to export all transactions. The exported file will be in CSV format compatible with Excel and other spreadsheet applications.
        </Typography>
      </Alert>

      <Button
        variant="contained"
        color="primary"
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
        onClick={handleExport}
        disabled={loading}
        fullWidth
        size="large"
        sx={{ py: 1.5 }}
      >
        {loading ? 'Generating Export...' : 'Export to CSV'}
      </Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', pt: 12 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <AssessmentIcon sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
            <Typography variant="h3" fontWeight="bold" color="primary">
              CSV Import/Export
            </Typography>
          </Box>
          <Typography variant="subtitle1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Seamlessly import transactions from bank statements or export your data for analysis
          </Typography>
        </Box>

        {/* Tab Navigation */}
        <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            sx={{
              bgcolor: 'background.paper',
              '& .MuiTab-root': {
                fontSize: '1rem',
                fontWeight: 600,
                py: 2
              }
            }}
          >
            <Tab 
              value="import" 
              label="Import Data" 
              icon={<UploadIcon />} 
              iconPosition="start"
            />
            <Tab 
              value="export" 
              label="Export Data" 
              icon={<DownloadIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Content Card */}
        <Card 
          elevation={3} 
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {activeTab === 'import' ? renderImportTab() : renderExportTab()}
          </CardContent>
        </Card>

        {/* Info Section */}
        <Paper sx={{ mt: 3, p: 3, borderRadius: 2, bgcolor: 'info.50' }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <FileUploadIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Multiple Formats
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Support for various bank statement formats
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Data Validation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Automatic validation and error detection
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <FileIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Templates Available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Download templates for easy formatting
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Box>
  );
};

export default CSVImportExport;
