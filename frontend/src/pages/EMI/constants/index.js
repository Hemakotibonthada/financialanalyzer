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

// Card Providers
export const CARD_PROVIDERS = [
  { value: 'ICICI', label: 'ICICI Bank' },
  { value: 'HDFC', label: 'HDFC Bank' },
  { value: 'SBI', label: 'State Bank of India' },
  { value: 'AXIS', label: 'Axis Bank' },
  { value: 'KOTAK', label: 'Kotak Mahindra' },
  { value: 'CITI', label: 'Citi Bank' },
  { value: 'AMEX', label: 'American Express' },
  { value: 'STANDARD CHARTERED', label: 'Standard Chartered' },
  { value: 'INDUSIND', label: 'IndusInd Bank' },
  { value: 'YES BANK', label: 'Yes Bank' },
  { value: 'PAYTM', label: 'Paytm' },
  { value: 'BAJAJ FINSERV', label: 'Bajaj Finserv' },
  { value: 'IDFC FIRST', label: 'IDFC First Bank' },
  { value: 'RBL', label: 'RBL Bank' },
  { value: 'HSBC', label: 'HSBC Bank' },
  { value: 'BOB', label: 'Bank of Baroda' },
  { value: 'PNB', label: 'Punjab National Bank' },
  { value: 'CANARA', label: 'Canara Bank' },
  { value: 'UNION BANK', label: 'Union Bank' },
  { value: 'IDBI', label: 'IDBI Bank' },
  { value: 'OTHER', label: 'Other' }
];

// Purchase Categories
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

// Relationship Types
export const RELATIONSHIP_TYPES = [
  { value: 'Friend', label: 'Friend' },
  { value: 'Family', label: 'Family' },
  { value: 'Colleague', label: 'Colleague' },
  { value: 'Relative', label: 'Relative' },
  { value: 'Other', label: 'Other' }
];

// Priority Levels
export const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

// Payment Methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' }
];

// Interest Types
export const INTEREST_TYPES = [
  { value: 'none', label: 'No Interest' },
  { value: 'simple', label: 'Simple Interest' }
];
