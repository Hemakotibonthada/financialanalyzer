import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  Flag as FlagIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { API_URL } from '../services/api';

const GOAL_CATEGORIES = [
  { value: 'retirement', label: 'Retirement', icon: '🏖️' },
  { value: 'emergency_fund', label: 'Emergency Fund', icon: '🚨' },
  { value: 'home_purchase', label: 'Home Purchase', icon: '🏠' },
  { value: 'car_purchase', label: 'Car Purchase', icon: '🚗' },
  { value: 'education', label: 'Education', icon: '🎓' },
  { value: 'wedding', label: 'Wedding', icon: '💒' },
  { value: 'vacation', label: 'Vacation', icon: '✈️' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'debt_free', label: 'Debt Free', icon: '💳' },
  { value: 'wealth_creation', label: 'Wealth Creation', icon: '💰' },
  { value: 'other', label: 'Other', icon: '📌' }
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SAVINGS_STRATEGIES = ['lump_sum', 'monthly', 'weekly', 'variable'];

function FinancialGoals() {
  const { isCollapsed } = useSidebar();
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openContributeDialog, setOpenContributeDialog] = useState(false);
  const [openMilestoneDialog, setOpenMilestoneDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'emergency_fund',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    priority: 'medium',
    savingsStrategy: 'monthly',
    monthlySavingsTarget: '',
    autoAllocate: false
  });

  const [contributionData, setContributionData] = useState({
    amount: '',
    source: 'Manual',
    notes: ''
  });

  const [milestoneData, setMilestoneData] = useState({
    name: '',
    amount: '',
    date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [goalsRes, summaryRes] = await Promise.all([
  axios.get(`${API_URL}/goals`, { headers }),
  axios.get(`${API_URL}/goals/summary`, { headers })
      ]);

      setGoals(goalsRes.data.data || []);
      setSummary(summaryRes.data.data || {});
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (editingGoal) {
        await axios.put(
          `${API_URL}/goals/${editingGoal.id}`,
          formData,
          { headers }
        );
      } else {
        await axios.post(
          `${API_URL}/goals`,
          formData,
          { headers }
        );
      }

      setOpenDialog(false);
      setEditingGoal(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/goals/${goalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleAddContribution = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/goals/${selectedGoal.id}/contribute`,
        contributionData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOpenContributeDialog(false);
      setContributionData({ amount: '', source: 'Manual', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding contribution:', error);
    }
  };

  const handleAddMilestone = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/goals/${selectedGoal.id}/milestone`,
        milestoneData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOpenMilestoneDialog(false);
      setMilestoneData({ name: '', amount: '', date: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding milestone:', error);
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate?.split('T')[0],
      priority: goal.priority,
      savingsStrategy: goal.savingsStrategy,
      monthlySavingsTarget: goal.monthlySavingsTarget || '',
      autoAllocate: goal.autoAllocate || false
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'emergency_fund',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      priority: 'medium',
      savingsStrategy: 'monthly',
      monthlySavingsTarget: '',
      autoAllocate: false
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'default',
      medium: 'info',
      high: 'warning',
      critical: 'error'
    };
    return colors[priority] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'primary',
      completed: 'success',
      paused: 'warning',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const getCategoryIcon = (category) => {
    const cat = GOAL_CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : '📌';
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <Box className={`${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'} min-h-screen bg-gray-50 flex items-center justify-center transition-all duration-300`}>
          <Typography>Loading goals...</Typography>
        </Box>
      </>
    );
  }

  const totalTarget = summary?.totalTargetAmount || 0;
  const totalSaved = summary?.totalCurrentAmount || 0;
  const totalProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <>
      <Sidebar />
      <Box className={`${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'} min-h-screen bg-gray-50 pb-8 transition-all duration-300`}>
        {/* Enhanced Header with Gradient */}
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
                  🎯 Financial Goals
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Set, track, and achieve your financial aspirations
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  resetForm();
                  setOpenDialog(true);
                }}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                }}
              >
                Add Goal
              </Button>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl">
          {/* Enhanced Summary Cards with Gradients */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.3s' }
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Total Target
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {formatCurrency(totalTarget)}
                      </Typography>
                    </Box>
                    <FlagIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white',
                '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.3s' }
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Current Progress
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {formatCurrency(totalSaved)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {totalProgress.toFixed(1)}% Complete
                      </Typography>
                    </Box>
                    <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.3s' }
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Remaining
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {formatCurrency(totalTarget - totalSaved)}
                      </Typography>
                    </Box>
                    <AttachMoneyIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.3s' }
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        Active Goals
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {goals.length}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {goals.filter(g => g.status === 'completed').length} Completed
                      </Typography>
                    </Box>
                    <TrophyIcon sx={{ fontSize: 40, opacity: 0.7 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <TrophyIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No financial goals yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start by creating your first financial goal to track your progress
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setOpenDialog(true);
            }}
          >
            Create Your First Goal
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {goals.map((goal) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={goal.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { boxShadow: 4 }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Goal Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h4">{getCategoryIcon(goal.category)}</Typography>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {goal.name}
                        </Typography>
                        <Chip
                          label={GOAL_CATEGORIES.find(c => c.value === goal.category)?.label}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEditGoal(goal)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteGoal(goal.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Description */}
                  {goal.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {goal.description}
                    </Typography>
                  )}

                  {/* Progress */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {goal.progressPercentage?.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(goal.progressPercentage || 0, 100)} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(goal.currentAmount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(goal.targetAmount)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Metrics */}
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid size={6}>
                      <Paper variant="outlined" sx={{ p: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Shortfall
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(goal.remainingAmount)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={6}>
                      <Paper variant="outlined" sx={{ p: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Days Left
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {goal.daysRemaining || 'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={12}>
                      <Paper variant="outlined" sx={{ p: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Monthly Target
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(goal.monthlySavingsTarget || 0)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Status & Priority */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={goal.status}
                      size="small"
                      color={getStatusColor(goal.status)}
                    />
                    <Chip
                      label={goal.priority}
                      size="small"
                      color={getPriorityColor(goal.priority)}
                    />
                  </Box>

                  {/* Target Date */}
                  {goal.targetDate && (
                    <Typography variant="caption" color="text.secondary">
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>

                {/* Actions */}
                <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedGoal(goal);
                      setOpenContributeDialog(true);
                    }}
                  >
                    Add Contribution
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedGoal(goal);
                      setOpenMilestoneDialog(true);
                    }}
                  >
                    Add Milestone
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Goal Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setEditingGoal(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingGoal ? 'Edit Goal' : 'Create New Goal'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Goal Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Category *</InputLabel>
                <Select
                  value={formData.category}
                  label="Category *"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {GOAL_CATEGORIES.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Priority *</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority *"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  {PRIORITIES.map(priority => (
                    <MenuItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Target Amount *"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Current Amount"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Target Date *"
                InputLabelProps={{ shrink: true }}
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Savings Strategy</InputLabel>
                <Select
                  value={formData.savingsStrategy}
                  label="Savings Strategy"
                  onChange={(e) => setFormData({ ...formData, savingsStrategy: e.target.value })}
                >
                  {SAVINGS_STRATEGIES.map(strategy => (
                    <MenuItem key={strategy} value={strategy}>
                      {strategy.charAt(0).toUpperCase() + strategy.slice(1).replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Monthly Savings Target"
                value={formData.monthlySavingsTarget}
                onChange={(e) => setFormData({ ...formData, monthlySavingsTarget: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            setEditingGoal(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveGoal} 
            variant="contained"
            disabled={!formData.name || !formData.targetAmount || !formData.targetDate}
          >
            {editingGoal ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Contribution Dialog */}
      <Dialog
        open={openContributeDialog}
        onClose={() => setOpenContributeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Contribution</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                type="number"
                label="Amount *"
                value={contributionData.amount}
                onChange={(e) => setContributionData({ ...contributionData, amount: e.target.value })}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label="Source"
                value={contributionData.source}
                onChange={(e) => setContributionData({ ...contributionData, source: e.target.value })}
                placeholder="e.g., Salary, Bonus, Investment Returns"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                value={contributionData.notes}
                onChange={(e) => setContributionData({ ...contributionData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenContributeDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddContribution} 
            variant="contained"
            disabled={!contributionData.amount}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog
        open={openMilestoneDialog}
        onClose={() => setOpenMilestoneDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Milestone</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Milestone Name *"
                value={milestoneData.name}
                onChange={(e) => setMilestoneData({ ...milestoneData, name: e.target.value })}
                placeholder="e.g., 25% Complete"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Amount *"
                value={milestoneData.amount}
                onChange={(e) => setMilestoneData({ ...milestoneData, amount: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Target Date *"
                InputLabelProps={{ shrink: true }}
                value={milestoneData.date}
                onChange={(e) => setMilestoneData({ ...milestoneData, date: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMilestoneDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddMilestone} 
            variant="contained"
            disabled={!milestoneData.name || !milestoneData.amount || !milestoneData.date}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
        </Container>
      </Box>
    </>
  );
}

export default FinancialGoals;
