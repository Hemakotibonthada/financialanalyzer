import React, { useEffect, useState, useRef } from 'react';
import { Box, Container, Typography, Button, Grid, Card, CardContent, IconButton, LinearProgress, TextField, MenuItem, FormControl, InputLabel, Select, Chip, Stack, Alert } from '@mui/material';
import { CloudUpload, Delete as DeleteIcon, Visibility as VisibilityIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import api, { API_URL } from '../services/api';

const humanFileSize = (size) => {
  if (!size) return '-';
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(1)} ${['B','KB','MB','GB','TB'][i]}`;
};

const PersonalDocs = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [category, setCategory] = useState('other');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const categories = [
    'bank_statement','credit_card','receipt','invoice','tax_document','investment','insurance','loans','receipts','other'
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents', err);
      setError(err.message || 'Failed to fetch documents');
    }
  };

  const onFilesSelected = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const upload = async () => {
    if (!files.length) return setError('Select files to upload');
    setUploading(true);
    setProgress(0);
    setError(null);

    const form = new FormData();
    files.forEach(f => form.append('documents', f));
    form.append('category', category);
    if (password) form.append('password', password);

    try {
      const res = await api.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) setProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      });

      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchDocuments();
    } catch (err) {
      console.error('Upload error', err);
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 700);
    }
  };

  const handleView = (doc) => {
    // Document files are served statically at /uploads
    const url = `${API_URL.replace(/\/api\/?$/, '')}/uploads/financial/${doc.userId || 'unknown'}/${doc.fileName || ''}`;
    window.open(url, '_blank');
  };

  const handleProcess = async (docId) => {
    try {
      await api.post(`/documents/${docId}/process`);
      fetchDocuments();
    } catch (err) {
      console.error('Process error', err);
      setError(err.response?.data?.message || 'Failed to process');
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await api.delete(`/documents/${docId}`);
      fetchDocuments();
    } catch (err) {
      console.error('Delete error', err);
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <Box component="main" sx={{ p: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>Personal Documents</Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6">Upload Documents</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Upload financial & insurance documents (PDFs, images, spreadsheets). Files are private to your account.</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <Button variant="outlined" component="label" startIcon={<CloudUpload />} fullWidth>
                  Select files
                  <input hidden ref={fileInputRef} multiple type="file" onChange={onFilesSelected} />
                </Button>
                {files.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {files.map((f, i) => (
                      <Chip key={i} label={`${f.name} (${humanFileSize(f.size)})`} />
                    ))}
                  </Stack>
                )}
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                    {categories.map(c => <MenuItem key={c} value={c}>{c.replace('_',' ')}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField label="Password (optional)" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <Button variant="contained" onClick={upload} disabled={uploading || files.length === 0} fullWidth>Upload</Button>
              </Grid>
            </Grid>

            {uploading && <LinearProgress variant="determinate" value={progress} sx={{ mt: 2 }} />}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Your Documents</Typography>
              <Box>
                <Button startIcon={<RefreshIcon />} onClick={fetchDocuments}>Refresh</Button>
              </Box>
            </Box>

            {documents.length === 0 ? (
              <Typography color="text.secondary">No documents uploaded yet. Upload a file to get started.</Typography>
            ) : (
              <Grid container spacing={2}>
                {documents.map(doc => (
                  <Grid item xs={12} sm={6} md={4} key={doc.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box>
                            <Typography variant="subtitle1" noWrap>{doc.originalName}</Typography>
                            <Typography variant="caption" color="text.secondary">{doc.fileType?.toUpperCase()} • {humanFileSize(doc.fileSize)}</Typography>
                            <Box sx={{ mt: 1 }}>
                              <Chip label={doc.category || 'other'} size="small" />
                              {doc.processingStatus && <Chip label={doc.processingStatus} size="small" sx={{ ml: 1 }} />}
                            </Box>
                          </Box>
                          <Box>
                            <IconButton onClick={() => handleView(doc)} title="View"><VisibilityIcon /></IconButton>
                            <IconButton onClick={() => handleProcess(doc.id)} title="Process"><RefreshIcon /></IconButton>
                            <IconButton onClick={() => handleDelete(doc.id)} title="Delete"><DeleteIcon /></IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default PersonalDocs;
