import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  Tooltip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Fab
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Link as LinkIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as MoneyIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getDemoData = () => [
  {
    _id: '1',
    name: 'Steel Beams',
    description: 'High-grade structural steel beams',
    quantity: 50,
    unit: 'pcs',
    unitPrice: 5000,
    totalPrice: 250000,
    category: 'materials',
    supplier: 'Steel Corp Ltd',
    siteLink: 'https://steelcorp.com/beams',
    siteName: 'SteelCorp.com',
    status: 'ordered',
    priority: 'high',
    createdAt: new Date().toISOString()
  },
  {
    _id: '2',
    name: 'Hydraulic Pumps',
    description: 'Industrial hydraulic pumps - 10HP',
    quantity: 5,
    unit: 'units',
    unitPrice: 45000,
    totalPrice: 225000,
    category: 'equipment',
    supplier: 'HydroTech Systems',
    siteLink: 'https://hydrotech.com/pumps',
    siteName: 'HydroTech.com',
    status: 'pending',
    priority: 'urgent',
    createdAt: new Date().toISOString()
  },
  {
    _id: '3',
    name: 'Welding Consumables',
    description: 'Welding electrodes and consumables',
    quantity: 100,
    unit: 'kg',
    unitPrice: 500,
    totalPrice: 50000,
    category: 'consumables',
    supplier: 'WeldPro Supplies',
    siteLink: 'https://weldpro.com/consumables',
    siteName: 'WeldPro.com',
    status: 'received',
    priority: 'medium',
    createdAt: new Date().toISOString()
  }
];

const BillOfMaterials = () => {
  const [materials, setMaterials] = useState(getDemoData());
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [stats, setStats] = useState({
    totalItems: 0,
    totalCost: 0,
    totalQuantity: 0,
    categories: []
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: 1,
    unit: 'pcs',
    unitPrice: '',
    totalPrice: '',
    category: 'materials',
    supplier: '',
    siteLink: '',
    siteName: '',
    notes: '',
    status: 'pending',
    priority: 'medium'
  });

  const [formErrors, setFormErrors] = useState({});

  const categories = [
    { value: 'materials', label: '🏗️ Raw Materials', color: '#2196F3' },
    { value: 'components', label: '⚙️ Components', color: '#4CAF50' },
    { value: 'tools', label: '🔧 Tools', color: '#FF9800' },
    { value: 'equipment', label: '🏭 Equipment', color: '#9C27B0' },
    { value: 'consumables', label: '📦 Consumables', color: '#F44336' },
    { value: 'services', label: '🛠️ Services', color: '#00BCD4' },
    { value: 'software', label: '💻 Software', color: '#673AB7' },
    { value: 'other', label: '📋 Other', color: '#607D8B' }
  ];

  const units = ['pcs', 'kg', 'lbs', 'meters', 'liters', 'hours', 'boxes', 'sets', 'units'];
  const statuses = ['pending', 'ordered', 'received', 'completed'];
  const priorities = ['low', 'medium', 'high', 'urgent'];

  // Using local state only - no API calls needed

  useEffect(() => {
    calculateStats();
  }, [materials]);

  useEffect(() => {
    // Auto-calculate total price
    if (formData.quantity && formData.unitPrice) {
      const total = parseFloat(formData.quantity) * parseFloat(formData.unitPrice);
      setFormData(prev => ({ ...prev, totalPrice: total.toFixed(2) }));
    }
  }, [formData.quantity, formData.unitPrice]);

  const fetchMaterials = () => {
    // Using local state only - refresh with demo data
    setMaterials(getDemoData());
  };



  const calculateStats = () => {
    const totalItems = materials.length;
    const totalCost = materials.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
    const totalQuantity = materials.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    
    const categoryCount = materials.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    setStats({
      totalItems,
      totalCost,
      totalQuantity,
      categories: Object.entries(categoryCount).map(([key, value]) => ({ name: key, count: value }))
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.quantity || formData.quantity <= 0) errors.quantity = 'Valid quantity required';
    if (!formData.unitPrice || formData.unitPrice <= 0) errors.unitPrice = 'Valid unit price required';
    if (!formData.category) errors.category = 'Category is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddMaterial = () => {
    if (!validateForm()) return;

    const dataToSend = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      unitPrice: parseFloat(formData.unitPrice),
      totalPrice: parseFloat(formData.totalPrice)
    };

    if (editingMaterial) {
      setMaterials(materials.map(m => 
        m._id === editingMaterial._id ? { ...dataToSend, _id: editingMaterial._id, createdAt: m.createdAt } : m
      ));
    } else {
      setMaterials([...materials, { ...dataToSend, _id: Date.now().toString(), createdAt: new Date().toISOString() }]);
    }
    
    setOpenDialog(false);
    setEditingMaterial(null);
    resetForm();
  };

  const handleDeleteMaterial = (id) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    setMaterials(materials.filter(m => m._id !== id));
  };

  const handleEditMaterial = (material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      description: material.description || '',
      quantity: material.quantity,
      unit: material.unit,
      unitPrice: material.unitPrice,
      totalPrice: material.totalPrice,
      category: material.category,
      supplier: material.supplier || '',
      siteLink: material.siteLink || '',
      siteName: material.siteName || '',
      notes: material.notes || '',
      status: material.status,
      priority: material.priority
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: '',
      totalPrice: '',
      category: 'materials',
      supplier: '',
      siteLink: '',
      siteName: '',
      notes: '',
      status: 'pending',
      priority: 'medium'
    });
    setFormErrors({});
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintHTML();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const generatePrintHTML = () => {
    const filteredMaterials = getFilteredMaterials();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill of Materials</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1976d2; border-bottom: 3px solid #1976d2; padding-bottom: 10px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { border: 2px solid #e0e0e0; padding: 15px; border-radius: 8px; }
          .stat-label { color: #666; font-size: 14px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1976d2; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #1976d2; color: white; padding: 12px; text-align: left; }
          td { border: 1px solid #ddd; padding: 10px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .total-row { background-color: #e3f2fd; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>📋 Bill of Materials</h1>
        <div class="header">
          <div>
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
            <strong>Total Items:</strong> ${filteredMaterials.length}
          </div>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-label">Total Items</div>
            <div class="stat-value">${stats.totalItems}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Cost</div>
            <div class="stat-value">₹${stats.totalCost.toLocaleString('en-IN')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Quantity</div>
            <div class="stat-value">${stats.totalQuantity}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Price</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMaterials.map(item => `
              <tr>
                <td><strong>${item.name}</strong><br><small>${item.description || '-'}</small></td>
                <td>${categories.find(c => c.value === item.category)?.label || item.category}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>₹${parseFloat(item.unitPrice).toLocaleString('en-IN')}</td>
                <td>₹${parseFloat(item.totalPrice).toLocaleString('en-IN')}</td>
                <td>${item.supplier || '-'}</td>
                <td>${item.status.toUpperCase()}</td>
                <td>${item.siteName ? `${item.siteName}` : '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" style="text-align: right;"><strong>GRAND TOTAL:</strong></td>
              <td><strong>₹${filteredMaterials.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0).toLocaleString('en-IN')}</strong></td>
              <td colspan="3"></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Generated by Financial Analyzer - Bill of Materials Module</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleExportCSV = () => {
    const filteredMaterials = getFilteredMaterials();
    const headers = ['Name', 'Description', 'Category', 'Quantity', 'Unit', 'Unit Price', 'Total Price', 'Supplier', 'Site Name', 'Site Link', 'Status', 'Priority'];
    
    const csvContent = [
      headers.join(','),
      ...filteredMaterials.map(item => [
        `"${item.name}"`,
        `"${item.description || ''}"`,
        item.category,
        item.quantity,
        item.unit,
        item.unitPrice,
        item.totalPrice,
        `"${item.supplier || ''}"`,
        `"${item.siteName || ''}"`,
        `"${item.siteLink || ''}"`,
        item.status,
        item.priority
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bill-of-materials-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getFilteredMaterials = () => {
    return materials.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const getCategoryColor = (category) => {
    return categories.find(c => c.value === category)?.color || '#607D8B';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      ordered: 'info',
      received: 'success',
      completed: 'default'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'default',
      medium: 'info',
      high: 'warning',
      urgent: 'error'
    };
    return colors[priority] || 'default';
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <Box className="lg:ml-72 min-h-screen bg-gray-50 flex items-center justify-center">
          <Typography>Loading Bill of Materials...</Typography>
        </Box>
      </>
    );
  }

  const filteredMaterials = getFilteredMaterials();

  return (
    <>
      <Sidebar />
      <Box className="lg:ml-72 min-h-screen bg-gray-50 pb-8">
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 0,
            p: 4,
            mb: 3,
            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
          }}
        >
          <Container maxWidth="xl">
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography 
                  variant="h3" 
                  sx={{
                    fontWeight: 800,
                    color: 'white',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  📋 Bill of Materials
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Manage and track your project materials, components, and costs
                </Typography>
              </Box>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={fetchMaterials}
                  sx={{ bgcolor: 'white', color: '#667eea', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={handlePrint}
                  sx={{ bgcolor: 'white', color: '#667eea', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                >
                  Print
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportCSV}
                  sx={{ bgcolor: 'white', color: '#667eea', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                >
                  Export CSV
                </Button>
              </Box>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl">
          {/* Statistics Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
              <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Items
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.totalItems}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Across all categories
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Cost
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    ₹{(stats.totalCost / 100000).toFixed(2)}L
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Complete BOM value
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Quantity
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.totalQuantity}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Units ordered
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
                    Categories
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stats.categories.length}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Different types
                  </Typography>
                </CardContent>
              </Card>
          </Box>

          {/* Search and Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto auto' }, gap: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by name, description, or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Category</InputLabel>
                  <Select
                    value={filterCategory}
                    label="Filter by Category"
                    onChange={(e) => setFilterCategory(e.target.value)}
                    startAdornment={<FilterIcon sx={{ mr: 1, color: 'action.active' }} />}
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {categories.map(cat => (
                      <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    resetForm();
                    setOpenDialog(true);
                  }}
                  sx={{ height: '40px' }}
                >
                  Add Item
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Materials Table */}
          {filteredMaterials.length === 0 ? (
            <Paper sx={{ p: 8, textAlign: 'center' }}>
              <ShoppingCartIcon sx={{ fontSize: 80, color: 'action.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No materials found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm || filterCategory !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Start by adding your first material'}
              </Typography>
              {!searchTerm && filterCategory === 'all' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    resetForm();
                    setOpenDialog(true);
                  }}
                >
                  Add First Material
                </Button>
              )}
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Category</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Quantity</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Unit Price</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Total Price</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Supplier</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Link</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMaterials.map((material) => (
                    <TableRow key={material._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {material.name}
                        </Typography>
                        {material.description && (
                          <Typography variant="caption" color="text.secondary">
                            {material.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={categories.find(c => c.value === material.category)?.label || material.category}
                          size="small"
                          sx={{ 
                            bgcolor: getCategoryColor(material.category),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {material.quantity} {material.unit}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ₹{parseFloat(material.unitPrice).toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          ₹{parseFloat(material.totalPrice).toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {material.supplier || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {material.siteLink ? (
                          <Tooltip title={material.siteLink}>
                            <Chip
                              icon={<LinkIcon />}
                              label={material.siteName || 'Visit'}
                              size="small"
                              clickable
                              component="a"
                              href={material.siteLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              color="info"
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Chip
                            label={material.status.toUpperCase()}
                            size="small"
                            color={getStatusColor(material.status)}
                          />
                          <Chip
                            label={material.priority.toUpperCase()}
                            size="small"
                            color={getPriorityColor(material.priority)}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditMaterial(material)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteMaterial(material._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={4} align="right">
                      <Typography variant="h6" fontWeight="bold">
                        GRAND TOTAL:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        ₹{filteredMaterials.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0).toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Container>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
        >
          <AddIcon />
        </Fab>

        {/* Add/Edit Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => {
            setOpenDialog(false);
            setEditingMaterial(null);
            resetForm();
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                {editingMaterial ? 'Edit Material' : 'Add New Material'}
              </Typography>
              <IconButton
                onClick={() => {
                  setOpenDialog(false);
                  setEditingMaterial(null);
                  resetForm();
                }}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Item Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!formErrors.category}>
                  <InputLabel>Category *</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category *"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map(cat => (
                      <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantity *"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  error={!!formErrors.quantity}
                  helperText={formErrors.quantity}
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={formData.unit}
                    label="Unit"
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    {units.map(unit => (
                      <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Unit Price (₹) *"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  error={!!formErrors.unitPrice}
                  helperText={formErrors.unitPrice}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><MoneyIcon /></InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2" fontWeight="bold">
                    Total Price: ₹{formData.totalPrice ? parseFloat(formData.totalPrice).toLocaleString('en-IN') : '0'}
                  </Typography>
                </Alert>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Site Name"
                  value={formData.siteName}
                  onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                  placeholder="e.g., Amazon, Flipkart"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Site Link"
                  value={formData.siteLink}
                  onChange={(e) => setFormData({ ...formData, siteLink: e.target.value })}
                  placeholder="https://example.com/product"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LinkIcon /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statuses.map(status => (
                      <MenuItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    label="Priority"
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {priorities.map(priority => (
                      <MenuItem key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or specifications"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => {
                setOpenDialog(false);
                setEditingMaterial(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddMaterial} 
              variant="contained"
              disabled={!formData.name || !formData.quantity || !formData.unitPrice}
            >
              {editingMaterial ? 'Update' : 'Add'} Material
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
};

export default BillOfMaterials;
