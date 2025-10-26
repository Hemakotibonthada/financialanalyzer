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
  TextField
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  GetApp as TemplateIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
      <Stepper activeStep={importStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {importStep === 0 && (
        <Box>
          <input
            accept=".csv"
            style={{ display: 'none' }}
            id="csv-file-input"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="csv-file-input">
            <Button
              variant="contained"
              component="span"
              startIcon={<UploadIcon />}
              fullWidth
              size="large"
              sx={{ mb: 2 }}
            >
              Select CSV File
            </Button>
          </label>

          {selectedFile && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Bank Format</InputLabel>
            <Select
              value={bankFormat}
              onChange={(e) => setBankFormat(e.target.value)}
              label="Bank Format"
            >
              {availableFormats.map((format) => (
                <MenuItem key={format.id} value={format.id}>
                  {format.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<TemplateIcon />}
            onClick={handleDownloadTemplate}
            fullWidth
            sx={{ mb: 2 }}
          >
            Download CSV Template
          </Button>

          <Button
            variant="contained"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            disabled={!selectedFile || loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : 'Preview File'}
          </Button>
        </Box>
      )}

      {importStep === 1 && previewData && (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">File Preview</Typography>
            <Typography variant="body2">
              Detected Format: <strong>{previewData.detectedFormat}</strong>
            </Typography>
          </Alert>

          <Paper sx={{ overflow: 'auto', mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {previewData.headers.map((header, index) => (
                    <TableCell key={index}>
                      <strong>{header}</strong>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.preview.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {previewData.headers.map((header, colIndex) => (
                      <TableCell key={colIndex}>{row[header]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setImportStep(0)}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleValidate}
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Validate & Continue'}
            </Button>
          </Box>
        </Box>
      )}

      {importStep === 2 && validationResult && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {validationResult.total}
                </Typography>
                <Typography variant="caption">Total Rows</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {validationResult.valid}
                </Typography>
                <Typography variant="caption">Valid</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {validationResult.invalid}
                </Typography>
                <Typography variant="caption">Invalid</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
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
      <Typography variant="h6" gutterBottom>
        Export Transactions to CSV
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={exportFilters.startDate}
            onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={exportFilters.endDate}
            onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Transaction Type</InputLabel>
            <Select
              value={exportFilters.type}
              onChange={(e) => setExportFilters({ ...exportFilters, type: e.target.value })}
              label="Transaction Type"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="debit">Debit</MenuItem>
              <MenuItem value="credit">Credit</MenuItem>
              <MenuItem value="transfer">Transfer</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Category"
            value={exportFilters.category}
            onChange={(e) => setExportFilters({ ...exportFilters, category: e.target.value })}
          />
        </Grid>
      </Grid>

      <Button
        variant="contained"
        color="primary"
        startIcon={<DownloadIcon />}
        onClick={handleExport}
        disabled={loading}
        fullWidth
        size="large"
      >
        {loading ? <CircularProgress size={24} /> : 'Export to CSV'}
      </Button>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CSV Import/Export
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Button
          variant={activeTab === 'import' ? 'contained' : 'text'}
          onClick={() => setActiveTab('import')}
          sx={{ mr: 1 }}
        >
          Import
        </Button>
        <Button
          variant={activeTab === 'export' ? 'contained' : 'text'}
          onClick={() => setActiveTab('export')}
        >
          Export
        </Button>
      </Box>

      <Card>
        <CardContent>
          {activeTab === 'import' ? renderImportTab() : renderExportTab()}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CSVImportExport;
