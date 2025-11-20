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

// Card provider options
export const CARD_PROVIDERS = [
  'ICICI',
  'HDFC',
  'SBI',
  'AXIS',
  'KOTAK',
  'CITI',
  'AMEX',
  'STANDARD CHARTERED',
  'INDUSIND',
  'YES BANK',
  'PAYTM',
  'BAJAJ FINSERV',
  'IDFC FIRST',
  'RBL',
  'HSBC',
  'BOB',
  'PNB',
  'CANARA',
  'UNION BANK',
  'IDBI',
  'OTHER'
];

// Purchase categories
export const PURCHASE_CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'appliances', label: 'Home Appliances' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'education', label: 'Education' },
  { value: 'travel', label: 'Travel' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' }
];

// Relationship types
export const RELATIONSHIPS = ['Friend', 'Family', 'Colleague', 'Relative', 'Other'];

// Priority levels
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// Payment methods
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'cheque', 'other'];

// Interest types
export const INTEREST_TYPES = [
  { value: 'none', label: 'No Interest' },
  { value: 'simple', label: 'Simple Interest' }
];
