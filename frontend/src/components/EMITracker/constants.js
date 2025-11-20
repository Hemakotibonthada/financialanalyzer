// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Color palette for charts
export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

// Enhanced chart card styling
export const chartCardHoverEffect = {
  bgcolor: 'white',
  borderRadius: 4,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '1px solid',
  borderColor: 'divider',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
    borderColor: 'primary.main',
    '& .chart-title': {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      backgroundClip: 'text',
      textFillColor: 'transparent',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      transform: 'translateX(8px)'
    },
    '& .chart-header': {
      borderColor: 'primary.main'
    }
  }
};
