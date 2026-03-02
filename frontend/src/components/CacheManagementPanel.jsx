import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Refresh,
  Delete,
  DeleteSweep,
  Search,
  Storage,
  TrendingUp,
  TrendingDown,
  Speed,
  Memory
} from '@mui/icons-material';
import api from '../services/api';

const CacheManagementPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchKey, setSearchKey] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [deletePattern, setDeletePattern] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, title: '', message: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cache/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
      setError('Failed to fetch cache statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchKey = async () => {
    if (!searchKey.trim()) {
      setError('Please enter a cache key');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/cache/get/${encodeURIComponent(searchKey)}`);
      if (response.data.success) {
        setSearchResult({
          key: searchKey,
          value: response.data.data.value,
          exists: response.data.data.exists
        });
        setSuccess('Cache key found');
      }
    } catch (error) {
      setSearchResult({ key: searchKey, exists: false });
      setError('Cache key not found or error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (key) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.delete(`/cache/delete/${encodeURIComponent(key)}`);
      if (response.data.success) {
        setSuccess(`Cache key "${key}" deleted successfully`);
        setSearchResult(null);
        fetchStats();
      }
    } catch (error) {
      setError('Failed to delete cache key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePattern = async () => {
    if (!deletePattern.trim()) {
      setError('Please enter a pattern');
      return;
    }

    setConfirmDialog({
      open: true,
      action: async () => {
        try {
          setLoading(true);
          setError('');
          const response = await api.delete(`/cache/pattern/${encodeURIComponent(deletePattern)}`);
          if (response.data.success) {
            setSuccess(`Deleted ${response.data.data.deletedCount} keys matching pattern "${deletePattern}"`);
            setDeletePattern('');
            fetchStats();
          }
        } catch (error) {
          setError('Failed to delete keys by pattern');
        } finally {
          setLoading(false);
          setConfirmDialog({ open: false, action: null, title: '', message: '' });
        }
      },
      title: 'Confirm Pattern Delete',
      message: `Are you sure you want to delete all keys matching pattern "${deletePattern}"? This action cannot be undone.`
    });
  };

  const handleClearCache = (scope) => {
    const scopeMessages = {
      all: 'entire cache',
      user: 'all user-specific caches',
      dashboard: 'dashboard cache',
      budget: 'budget cache',
      analytics: 'analytics cache'
    };

    setConfirmDialog({
      open: true,
      action: async () => {
        try {
          setLoading(true);
          setError('');
          
          let endpoint;
          switch (scope) {
            case 'all':
              endpoint = '/cache/clear';
              break;
            case 'user':
              endpoint = '/cache/user';
              break;
            case 'dashboard':
              endpoint = '/cache/dashboard';
              break;
            case 'budget':
              endpoint = '/cache/budget';
              break;
            case 'analytics':
              endpoint = '/cache/analytics';
              break;
            default:
              throw new Error('Invalid scope');
          }

          const method = scope === 'all' ? 'post' : 'delete';
          const response = await api[method](endpoint);
          
          if (response.data.success) {
            setSuccess(`Successfully cleared ${scopeMessages[scope]}`);
            fetchStats();
          }
        } catch (error) {
          setError(`Failed to clear ${scopeMessages[scope]}`);
        } finally {
          setLoading(false);
          setConfirmDialog({ open: false, action: null, title: '', message: '' });
        }
      },
      title: `Clear ${scopeMessages[scope]}?`,
      message: `Are you sure you want to clear the ${scopeMessages[scope]}? This will temporarily impact performance until the cache is rebuilt.`
    });
  };

  const calculateHitRate = () => {
    if (!stats || !stats.hits || !stats.misses) return 0;
    const total = stats.hits + stats.misses;
    return total > 0 ? ((stats.hits / total) * 100).toFixed(2) : 0;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Cache Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchStats}
          disabled={loading}
        >
          Refresh Stats
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Cache Type
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {stats?.type || 'Unknown'}
                  </Typography>
                </Box>
                <Memory color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Keys
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {stats?.keys || 0}
                  </Typography>
                </Box>
                <Storage color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Hit Rate
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                    {calculateHitRate()}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats?.hits || 0} hits / {stats?.misses || 0} misses
                  </Typography>
                </Box>
                <TrendingUp color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Memory Used
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatBytes(stats?.memoryUsed)}
                  </Typography>
                </Box>
                <Speed color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Cache Key */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Search Cache Key
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Cache Key"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchKey()}
              placeholder="e.g., dashboard:user:123"
            />
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={handleSearchKey}
              disabled={loading}
            >
              Search
            </Button>
          </Box>

          {searchResult && (
            <Box sx={{ mt: 2 }}>
              {searchResult.exists ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label="Found" color="success" size="small" />
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteKey(searchResult.key)}
                    >
                      Delete
                    </Button>
                  </Box>
                  <Paper sx={{ p: 2, bgcolor: 'grey.100', maxHeight: 300, overflow: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                      {JSON.stringify(searchResult.value, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              ) : (
                <Alert severity="info">Cache key not found</Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Delete by Pattern */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Delete Keys by Pattern
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Pattern"
              value={deletePattern}
              onChange={(e) => setDeletePattern(e.target.value)}
              placeholder="e.g., dashboard:* or user:*"
              helperText="Use * as wildcard. Example: dashboard:* will delete all dashboard cache keys"
            />
            <Button
              variant="contained"
              color="warning"
              startIcon={<DeleteSweep />}
              onClick={handleDeletePattern}
              disabled={loading}
            >
              Delete
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<DeleteSweep />}
                onClick={() => handleClearCache('all')}
                disabled={loading}
              >
                Clear All Cache
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Button
                fullWidth
                variant="outlined"
                color="warning"
                startIcon={<Delete />}
                onClick={() => handleClearCache('user')}
                disabled={loading}
              >
                Clear User Caches
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Delete />}
                onClick={() => handleClearCache('dashboard')}
                disabled={loading}
              >
                Clear Dashboard Cache
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Delete />}
                onClick={() => handleClearCache('budget')}
                disabled={loading}
              >
                Clear Budget Cache
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Delete />}
                onClick={() => handleClearCache('analytics')}
                disabled={loading}
              >
                Clear Analytics Cache
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDialog.action}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CacheManagementPanel;
