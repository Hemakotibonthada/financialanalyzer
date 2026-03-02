import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, IconButton,
  TextField, InputAdornment, LinearProgress, Avatar, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  ToggleButton, ToggleButtonGroup, Tooltip, Alert, Badge
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Search, FilterList, School, BookmarkBorder,
  Bookmark, PlayArrow, CheckCircle, Timer, Star, Share, ThumbUp,
  ArrowForward, EmojiObjects, AccountBalance, CreditCard, ShowChart,
  Savings, Security, Home, Receipt, Calculate, PieChart, AutoGraph,
  LocalAtm, Assessment, NavigateBefore, NavigateNext, Lightbulb,
  MenuBook, Quiz, VideoLibrary, Article
} from '@mui/icons-material';
import '../styles/animations.css';

// ============================================================
// Feature #98: Financial Education & Tips Page
// ============================================================

// Financial tips database
const FINANCIAL_TIPS = [
  {
    id: 1, category: 'savings', title: 'The 50/30/20 Budget Rule',
    content: 'Allocate 50% of income to needs, 30% to wants, and 20% to savings. This simple rule provides a clear framework for managing your money effectively.',
    icon: '💰', difficulty: 'beginner', readTime: 3, likes: 234, bookmarked: false,
    tags: ['budgeting', 'savings', 'planning'],
    detailedContent: 'The 50/30/20 rule is a budgeting framework that divides after-tax income into three categories:\n\n• **50% Needs**: Rent, groceries, utilities, insurance, minimum loan payments\n• **30% Wants**: Dining out, entertainment, shopping, subscriptions\n• **20% Savings**: Emergency fund, investments, extra debt payments\n\nThis rule works well as a starting point. Adjust percentages based on your situation - in high-cost cities, needs might take 60%, while aggressive savers might target 30%+ savings.',
  },
  {
    id: 2, category: 'investing', title: 'Start SIP with Just ₹500/month',
    content: 'Systematic Investment Plans (SIPs) let you invest small amounts regularly. Even ₹500/month in ELSS can grow to ₹2.8L in 10 years at 12% returns.',
    icon: '📈', difficulty: 'beginner', readTime: 5, likes: 456, bookmarked: false,
    tags: ['investing', 'SIP', 'mutual-funds'],
    detailedContent: 'SIP (Systematic Investment Plan) is the best way to start investing:\n\n• **Rupee Cost Averaging**: Buy more units when markets are low, fewer when high\n• **Power of Compounding**: ₹5,000/month at 12% = ~₹1.17 Cr in 30 years\n• **Discipline**: Automatic debit ensures regular investing\n• **Flexibility**: Start with ₹500, increase as income grows\n\n**Best SIP Categories for Beginners:**\n1. Large Cap Index Fund\n2. Flexi Cap Fund\n3. ELSS (for tax saving)\n\nStart early - even small amounts compound significantly over decades.',
  },
  {
    id: 3, category: 'tax', title: 'Section 80C: Save Up to ₹46,800 in Tax',
    content: 'Invest ₹1.5 lakh in 80C instruments to save up to ₹46,800 (30% bracket). Best options: ELSS (3yr lock-in), PPF (safe), NPS (extra ₹50K under 80CCD1B).',
    icon: '🏛️', difficulty: 'intermediate', readTime: 7, likes: 789, bookmarked: false,
    tags: ['tax-saving', '80C', 'deductions'],
    detailedContent: 'Section 80C allows ₹1,50,000 deduction from taxable income. Tax saved depends on your bracket:\n\n• 5% bracket: ₹7,500 saved\n• 20% bracket: ₹30,000 saved\n• 30% bracket: ₹46,800 saved (including cess)\n\n**Best 80C Investments (ranked by returns):**\n\n1. **ELSS Mutual Funds** — 12-15% returns, 3-year lock-in, equity exposure\n2. **PPF** — 7.1% guaranteed, 15-year lock-in, EEE tax status\n3. **NPS** — Extra ₹50K under 80CCD(1B), market-linked\n4. **Sukanya Samriddhi** — 8.2% for girl child, EEE status\n5. **5-Year Tax FD** — 6-7% guaranteed, safest option',
  },
  {
    id: 4, category: 'debt', title: 'Debt Snowball vs Avalanche Method',
    content: 'Snowball: Pay smallest debts first for psychological wins. Avalanche: Pay highest interest first to save money. Choose based on your personality.',
    icon: '❄️', difficulty: 'intermediate', readTime: 6, likes: 345, bookmarked: false,
    tags: ['debt', 'repayment', 'strategy'],
    detailedContent: '**Debt Snowball Method:**\n1. List debts from smallest to largest balance\n2. Pay minimum on all debts\n3. Put extra money toward smallest debt\n4. When paid off, roll payment into next smallest\n✅ Pros: Quick wins, motivation boost\n❌ Cons: May pay more interest overall\n\n**Debt Avalanche Method:**\n1. List debts from highest to lowest interest rate\n2. Pay minimum on all debts\n3. Put extra money toward highest interest debt\n4. When paid off, move to next highest rate\n✅ Pros: Saves the most money\n❌ Cons: Slower initial progress\n\n**Tip:** If your highest-interest debt is also the largest, combine both methods.',
  },
  {
    id: 5, category: 'insurance', title: 'Term Insurance: The Best Life Cover',
    content: 'Get 10x annual income as term cover. A 30-year-old can get ₹1 Cr cover for just ₹700-900/month. It\'s the most affordable life insurance.',
    icon: '🛡️', difficulty: 'beginner', readTime: 4, likes: 567, bookmarked: false,
    tags: ['insurance', 'term-plan', 'protection'],
    detailedContent: '**Why Term Insurance is Essential:**\n\n• **Pure Protection**: Unlike ULIPs/endowment, 100% of premium goes to cover\n• **Affordable**: ₹1 Cr cover costs ₹700-1200/month for a 30-year-old\n• **Rule of Thumb**: Cover = 10-15x annual income\n\n**How to Choose:**\n1. Coverage: At least 10x annual income\n2. Term: Cover until age 60-65\n3. Claim Settlement Ratio: Look for 95%+\n4. Company Stability: Choose established insurers\n5. Riders: Critical illness, accidental death\n\n**Top Term Insurance Plans:**\n- HDFC Click 2 Protect\n- ICICI iProtect Smart\n- LIC Tech Term\n- Max Life Online Term\n\n**When to Buy:** As early as possible — premiums increase with age!',
  },
  {
    id: 6, category: 'investing', title: 'Emergency Fund: Your Financial Safety Net',
    content: 'Keep 3-6 months of expenses in a liquid fund or savings account. This protects you from job loss, medical emergencies, or unexpected expenses.',
    icon: '🏥', difficulty: 'beginner', readTime: 4, likes: 678, bookmarked: false,
    tags: ['emergency-fund', 'safety', 'basics'],
    detailedContent: '**Building Your Emergency Fund:**\n\n**How Much?**\n- Single income household: 6 months expenses\n- Dual income: 3 months expenses\n- Freelancers: 9-12 months expenses\n\n**Where to Keep It?**\n1. **Liquid Mutual Fund**: 5-6% returns, 1-day withdrawal\n2. **Savings Account**: 3-4%, instant access\n3. **Short-term FD**: 6-7%, break with minor penalty\n\n**How to Build:**\n1. Start with ₹1,000/month\n2. Direct 50% of any bonus/windfall\n3. Keep in a separate account (out of sight)\n4. Replenish immediately after use\n\n**Rule: Never invest your emergency fund in stocks or long-term instruments!**',
  },
  {
    id: 7, category: 'savings', title: 'Automate Your Finances for Success',
    content: 'Set up auto-debit for SIPs, bills, and savings on salary day. Automation removes temptation and ensures you pay yourself first.',
    icon: '🤖', difficulty: 'beginner', readTime: 3, likes: 432, bookmarked: false,
    tags: ['automation', 'habits', 'productivity'],
    detailedContent: '**Automate on Salary Day (Day 1):**\n\n1. **EMIs & Loans**: Auto-debit (avoid penalties)\n2. **SIP Investments**: Auto-invest 20%+ of income\n3. **Insurance Premiums**: Annual auto-pay\n4. **Emergency Fund**: Auto-transfer until target reached\n5. **Bills**: Utility, phone, subscriptions\n\n**Remaining amount is your spending money!**\n\n**Tools for Automation:**\n- Bank standing instructions\n- AMC website SIP setup\n- BBPS for bill payments\n- UPI auto-pay\n\n**Benefits:**\n- Eliminates forgotten payments\n- Forces savings discipline\n- Reduces financial stress\n- Say goodbye to late fees!',
  },
  {
    id: 8, category: 'investing', title: 'Index Funds: The Smart Investor\'s Choice',
    content: 'Index funds track market indices like Nifty 50 with ultra-low expense ratios (0.1-0.3%). Over 10+ years, most active funds fail to beat index funds.',
    icon: '📊', difficulty: 'intermediate', readTime: 6, likes: 321, bookmarked: false,
    tags: ['index-funds', 'passive-investing', 'nifty'],
    detailedContent: '**Why Index Funds Win:**\n\n• **Low Costs**: 0.1-0.3% expense ratio vs 1-2.5% for active funds\n• **Broad Diversification**: Own 50-500 companies in one fund\n• **Consistency**: Track market returns without fund manager risk\n• **Tax Efficient**: Lower turnover = fewer taxable events\n\n**Best Index Funds in India:**\n1. UTI Nifty 50 Index Fund (0.10% ER)\n2. HDFC Index S&P BSE Sensex (0.10% ER)\n3. Motilal Oswal Nifty Next 50 (0.15% ER)\n4. Navi Nifty 50 Index Fund (0.06% ER)\n\n**Facts:**\n- Over 15 years, 87% of active large-cap funds underperformed Nifty 50\n- Warren Buffett recommends index funds for most investors\n- Start with Nifty 50 Index Fund as your core holding',
  },
  {
    id: 9, category: 'credit', title: 'Build and Maintain a Good Credit Score',
    content: 'A CIBIL score of 750+ gets you the best loan rates. Pay bills on time, keep credit utilization below 30%, and avoid too many applications.',
    icon: '💳', difficulty: 'intermediate', readTime: 5, likes: 543, bookmarked: false,
    tags: ['credit-score', 'CIBIL', 'loans'],
    detailedContent: '**Credit Score Factors (CIBIL):**\n\n1. **Payment History (35%)**: Pay all EMIs and cards on time\n2. **Credit Utilization (30%)**: Keep below 30% of limit\n3. **Credit History Length (15%)**: Don\'t close old cards\n4. **Credit Mix (10%)**: Have both secured and unsecured\n5. **New Credit (10%)**: Don\'t apply for too many loans\n\n**Quick Tips to Improve Score:**\n✅ Set auto-pay for minimum due\n✅ Request credit limit increase (lowers utilization)\n✅ Check report annually for errors\n✅ Keep oldest credit card active\n❌ Don\'t co-sign loans carelessly\n❌ Don\'t apply to multiple lenders simultaneously\n\n**Score Ranges:**\n- 750-900: Excellent\n- 700-749: Good\n- 650-699: Fair\n- Below 650: Poor',
  },
  {
    id: 10, category: 'retirement', title: 'The Power of Starting Early (Compounding)',
    content: 'Starting at 25 vs 35: ₹5,000/month at 12% grows to ₹3.2 Cr vs ₹95 L by age 60. Those 10 extra years mean 3x more wealth!',
    icon: '⏰', difficulty: 'beginner', readTime: 5, likes: 876, bookmarked: false,
    tags: ['compounding', 'retirement', 'early-investing'],
    detailedContent: '**The Magic of Compounding:**\n\n**₹5,000/month at 12% annual returns:**\n- Start at 25, retire at 60: ₹3.24 Crore\n- Start at 30, retire at 60: ₹1.76 Crore\n- Start at 35, retire at 60: ₹94.88 Lakh\n- Start at 40, retire at 60: ₹49.96 Lakh\n\n**Key Insight:** Each year you delay costs you exponentially more later.\n\n**Rule of 72:** Divide 72 by annual return rate to find how many years it takes to double your money.\n- At 12%: Money doubles every 6 years\n- At 8%: Money doubles every 9 years\n- At 6%: Money doubles every 12 years\n\n**Action: Start investing TODAY, even if it\'s just ₹500!**',
  },
  {
    id: 11, category: 'tax', title: 'New vs Old Tax Regime: Which is Better?',
    content: 'If your deductions exceed ₹3.75L, old regime may be better. Below that, new regime wins. Use our tax calculator for exact comparison.',
    icon: '⚖️', difficulty: 'advanced', readTime: 8, likes: 654, bookmarked: false,
    tags: ['tax-regime', 'income-tax', 'comparison'],
    detailedContent: '**New Tax Regime (Default from FY 2023-24):**\n- Lower slab rates\n- ₹75,000 standard deduction\n- Very few deductions allowed\n- Best for: Low savings, no home loan, simple tax situation\n\n**Old Tax Regime:**\n- Higher slab rates\n- ₹50,000 standard deduction\n- All deductions available (80C, 80D, HRA, etc.)\n- Best for: High deductions, home loan interest, HRA claimers\n\n**Break-even Analysis:**\n| Income | Break-even Deductions |\n|--------|---------------------|\n| ₹10L   | ₹3.75L              |\n| ₹15L   | ₹4.25L              |\n| ₹20L   | ₹4.75L              |\n\n**If your total deductions exceed the break-even point, choose old regime.**',
  },
  {
    id: 12, category: 'investing', title: 'Asset Allocation by Age',
    content: 'Classic rule: Equity allocation = 100 - your age. At 30, keep 70% in equity, 20% in debt, 10% in gold. Rebalance annually.',
    icon: '🎯', difficulty: 'intermediate', readTime: 6, likes: 432, bookmarked: false,
    tags: ['asset-allocation', 'diversification', 'portfolio'],
    detailedContent: '**Age-Based Asset Allocation (Indian Context):**\n\n**Age 20-30 (Aggressive):**\n- Equity: 70-80% (Large + Mid Cap)\n- Debt: 10-20% (PPF, Govt Bonds)\n- Gold: 5-10%\n- Cash: 5%\n\n**Age 30-40 (Growth):**\n- Equity: 60-70%\n- Debt: 20-25%\n- Gold: 5-10%\n- Real Estate: 0-10%\n\n**Age 40-50 (Balanced):**\n- Equity: 50-60%\n- Debt: 25-35%\n- Gold: 5-10%\n- Real Estate: 5-15%\n\n**Age 50-60 (Conservative):**\n- Equity: 30-40%\n- Debt: 40-50%\n- Gold: 10%\n- Cash: 5-10%\n\n**Post-Retirement:**\n- Equity: 20-30%\n- Debt: 50-60% (SCSS, bonds)\n- Gold: 10%\n- Cash: 10-15%\n\n**Key Rule:** Rebalance annually to maintain target allocation.',
  },
];

// Learning modules
const LEARNING_MODULES = [
  {
    id: 'module-1',
    title: 'Personal Finance Basics',
    description: 'Master the fundamentals of managing your money',
    icon: '📖',
    lessons: 8,
    duration: '2 hours',
    difficulty: 'beginner',
    progress: 0,
    topics: ['Income vs Expenses', 'Budgeting 101', 'Banking Basics', 'Digital Payments', 'Financial Goals', 'Time Value of Money', 'Inflation', 'Net Worth'],
  },
  {
    id: 'module-2',
    title: 'Investment Fundamentals',
    description: 'Learn how to grow your wealth through smart investing',
    icon: '📈',
    lessons: 10,
    duration: '3 hours',
    difficulty: 'beginner',
    progress: 0,
    topics: ['Why Invest?', 'Risk vs Return', 'Mutual Funds', 'SIP vs Lumpsum', 'Index Funds', 'Fixed Income', 'Gold', 'Real Estate', 'Portfolio Building', 'Asset Allocation'],
  },
  {
    id: 'module-3',
    title: 'Tax Planning Masterclass',
    description: 'Optimize your taxes legally and save more',
    icon: '🏛️',
    lessons: 7,
    duration: '2.5 hours',
    difficulty: 'intermediate',
    progress: 0,
    topics: ['Income Tax Basics', 'Tax Slabs & Regimes', 'Section 80C', 'Section 80D & Others', 'HRA & Home Loan', 'Capital Gains', 'ITR Filing'],
  },
  {
    id: 'module-4',
    title: 'Debt Management',
    description: 'Strategies to manage and eliminate debt effectively',
    icon: '💳',
    lessons: 6,
    duration: '1.5 hours',
    difficulty: 'intermediate',
    progress: 0,
    topics: ['Good Debt vs Bad Debt', 'EMI Management', 'Credit Score', 'Debt Repayment Strategies', 'Loan Refinancing', 'Debt-Free Living'],
  },
  {
    id: 'module-5',
    title: 'Retirement Planning',
    description: 'Plan for a comfortable and secure retirement',
    icon: '🏖️',
    lessons: 8,
    duration: '2.5 hours',
    difficulty: 'advanced',
    progress: 0,
    topics: ['Retirement Corpus Calculation', 'EPF & PPF', 'NPS Deep Dive', 'Annuity Plans', 'Pension Funds', 'Healthcare Planning', 'Estate Planning', 'FIRE Movement'],
  },
  {
    id: 'module-6',
    title: 'Stock Market for Beginners',
    description: 'Understand equity markets and start your journey',
    icon: '🏪',
    lessons: 12,
    duration: '4 hours',
    difficulty: 'intermediate',
    progress: 0,
    topics: ['How Stock Markets Work', 'BSE vs NSE', 'Demat & Trading Accounts', 'Fundamental Analysis', 'Technical Analysis', 'IPOs', 'Indices', 'Risks', 'Blue Chip Stocks', 'Sector Analysis', 'Dividend Investing', 'Long-term Wealth'],
  },
];

// Quiz questions
const QUIZZES = [
  {
    id: 'quiz-1',
    title: 'Personal Finance Basics',
    questions: [
      { q: 'What percentage of income should ideally go to savings under the 50/30/20 rule?', options: ['10%', '20%', '30%', '50%'], correct: 1 },
      { q: 'How many months of expenses should your emergency fund cover?', options: ['1 month', '3-6 months', '12 months', '24 months'], correct: 1 },
      { q: 'What is the maximum deduction under Section 80C?', options: ['₹1,00,000', '₹1,50,000', '₹2,00,000', '₹2,50,000'], correct: 1 },
      { q: 'What is the Rule of 72 used for?', options: ['Tax calculation', 'Estimating doubling time', 'EMI calculation', 'Insurance premium'], correct: 1 },
      { q: 'Which investment has the shortest lock-in for tax saving?', options: ['PPF', 'ELSS', '5-year FD', 'NSC'], correct: 1 },
    ],
    difficulty: 'beginner',
    timeLimit: 300,
  },
  {
    id: 'quiz-2',
    title: 'Investment Knowledge',
    questions: [
      { q: 'What does SIP stand for?', options: ['Savings Interest Plan', 'Systematic Investment Plan', 'Standard Insurance Policy', 'Simple Interest Payment'], correct: 1 },
      { q: 'LTCG on equity above ₹1 lakh is taxed at what rate?', options: ['5%', '10%', '15%', '20%'], correct: 1 },
      { q: 'What is the expense ratio of a typical index fund?', options: ['0.1-0.3%', '1-2%', '3-5%', '5-10%'], correct: 0 },
      { q: 'NPS additional deduction under 80CCD(1B) is up to?', options: ['₹25,000', '₹50,000', '₹1,00,000', '₹1,50,000'], correct: 1 },
      { q: 'What credit score is considered excellent?', options: ['500-600', '600-700', '700-750', '750-900'], correct: 3 },
    ],
    difficulty: 'intermediate',
    timeLimit: 300,
  },
];

const categories = [
  { id: 'all', label: 'All', icon: '📚' },
  { id: 'savings', label: 'Savings', icon: '💰' },
  { id: 'investing', label: 'Investing', icon: '📈' },
  { id: 'tax', label: 'Tax', icon: '🏛️' },
  { id: 'debt', label: 'Debt', icon: '💳' },
  { id: 'insurance', label: 'Insurance', icon: '🛡️' },
  { id: 'credit', label: 'Credit', icon: '💳' },
  { id: 'retirement', label: 'Retirement', icon: '🏖️' },
];

const FinancialEducation = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedTips, setBookmarkedTips] = useState(new Set());
  const [selectedTip, setSelectedTip] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [difficulty, setDifficulty] = useState('all');

  const filteredTips = useMemo(() => {
    return FINANCIAL_TIPS.filter(tip => {
      if (selectedCategory !== 'all' && tip.category !== selectedCategory) return false;
      if (difficulty !== 'all' && tip.difficulty !== difficulty) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return tip.title.toLowerCase().includes(query) || 
               tip.content.toLowerCase().includes(query) ||
               tip.tags.some(t => t.includes(query));
      }
      return true;
    });
  }, [selectedCategory, searchQuery, difficulty]);

  const toggleBookmark = (tipId) => {
    setBookmarkedTips(prev => {
      const next = new Set(prev);
      if (next.has(tipId)) next.delete(tipId);
      else next.add(tipId);
      return next;
    });
  };

  const handleQuizAnswer = (questionIndex, answerIndex) => {
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const getQuizScore = () => {
    if (!activeQuiz) return 0;
    return activeQuiz.questions.reduce((score, q, i) => {
      return score + (quizAnswers[i] === q.correct ? 1 : 0);
    }, 0);
  };

  return (
    <Box sx={{ p: 3, animation: 'fadeInUp 0.6s ease-out' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Financial Education</Typography>
          <Typography color="text.secondary">Learn, grow, and master your finances</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip icon={<Star />} label={`${bookmarkedTips.size} Saved`} variant="outlined" />
          <Chip icon={<CheckCircle />} label="3 Completed" color="success" variant="outlined" />
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Article />} label="Tips & Articles" iconPosition="start" />
        <Tab icon={<MenuBook />} label="Learning Modules" iconPosition="start" />
        <Tab icon={<Quiz />} label="Quizzes" iconPosition="start" />
        <Tab icon={<VideoLibrary />} label="Resources" iconPosition="start" />
      </Tabs>

      {/* Tips Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Search and Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search tips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              sx={{ minWidth: 250 }}
            />
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <Chip
                  key={cat.id}
                  label={`${cat.icon} ${cat.label}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
                  color={selectedCategory === cat.id ? 'primary' : 'default'}
                  size="small"
                />
              ))}
            </Box>
            <ToggleButtonGroup size="small" value={difficulty} exclusive onChange={(_, v) => v && setDifficulty(v)}>
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="beginner">Beginner</ToggleButton>
              <ToggleButton value="intermediate">Intermediate</ToggleButton>
              <ToggleButton value="advanced">Advanced</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Tips Grid */}
          <Grid container spacing={2}>
            {filteredTips.map(tip => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tip.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onClick={() => setSelectedTip(tip)}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h3" component="span">{tip.icon}</Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(tip.id); }}
                      >
                        {bookmarkedTips.has(tip.id) ? <Bookmark color="primary" /> : <BookmarkBorder />}
                      </IconButton>
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: '1rem' }}>
                      {tip.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {tip.content}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      {tip.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                      ))}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={tip.difficulty}
                          size="small"
                          color={tip.difficulty === 'beginner' ? 'success' : tip.difficulty === 'intermediate' ? 'warning' : 'error'}
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          <Timer sx={{ fontSize: 12, mr: 0.3 }} />{tip.readTime} min
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ThumbUp sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">{tip.likes}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          {filteredTips.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary">No tips found</Typography>
              <Typography variant="body2" color="text.secondary">Try adjusting your filters</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Learning Modules Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {LEARNING_MODULES.map(module => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={module.id}>
              <Card sx={{ transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h2" component="span">{module.icon}</Typography>
                    <Chip
                      label={module.difficulty}
                      size="small"
                      color={module.difficulty === 'beginner' ? 'success' : module.difficulty === 'intermediate' ? 'warning' : 'error'}
                    />
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>{module.title}</Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{module.description}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">📖 {module.lessons} Lessons</Typography>
                    <Typography variant="caption" color="text.secondary">⏱️ {module.duration}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={module.progress} sx={{ mb: 1, borderRadius: 1, height: 6 }} />
                  <Typography variant="caption" color="text.secondary">{module.progress}% Complete</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      fullWidth
                      variant={module.progress > 0 ? 'contained' : 'outlined'}
                      startIcon={module.progress > 0 ? <PlayArrow /> : <School />}
                      onClick={() => setSelectedModule(module)}
                    >
                      {module.progress > 0 ? 'Continue' : 'Start Learning'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Quizzes Tab */}
      {activeTab === 2 && (
        <Box>
          {!activeQuiz ? (
            <Grid container spacing={3}>
              {QUIZZES.map(quiz => (
                <Grid size={{ xs: 12, sm: 6 }} key={quiz.id}>
                  <Card sx={{ transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" fontWeight={600}>{quiz.title}</Typography>
                        <Chip
                          label={quiz.difficulty}
                          size="small"
                          color={quiz.difficulty === 'beginner' ? 'success' : 'warning'}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">📝 {quiz.questions.length} Questions</Typography>
                        <Typography variant="body2" color="text.secondary">⏱️ {quiz.timeLimit / 60} min</Typography>
                      </Box>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PlayArrow />}
                        onClick={() => { setActiveQuiz(quiz); setQuizAnswers({}); setQuizSubmitted(false); }}
                      >
                        Start Quiz
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5" fontWeight={600}>{activeQuiz.title}</Typography>
                  <Button variant="outlined" onClick={() => setActiveQuiz(null)}>Back to Quizzes</Button>
                </Box>

                {quizSubmitted ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h2" sx={{ mb: 2 }}>
                      {getQuizScore() === activeQuiz.questions.length ? '🏆' : getQuizScore() >= activeQuiz.questions.length * 0.6 ? '👍' : '📚'}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                      {getQuizScore()} / {activeQuiz.questions.length}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      {getQuizScore() === activeQuiz.questions.length ? 'Perfect Score!' : getQuizScore() >= activeQuiz.questions.length * 0.6 ? 'Good Job!' : 'Keep Learning!'}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(getQuizScore() / activeQuiz.questions.length) * 100}
                      sx={{ height: 10, borderRadius: 5, my: 3, maxWidth: 400, mx: 'auto' }}
                      color={getQuizScore() === activeQuiz.questions.length ? 'success' : 'primary'}
                    />
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                      <Button variant="outlined" onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}>Retry</Button>
                      <Button variant="contained" onClick={() => setActiveQuiz(null)}>Back to Quizzes</Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    {activeQuiz.questions.map((question, qi) => (
                      <Box key={qi} sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          {qi + 1}. {question.q}
                        </Typography>
                        <Grid container spacing={1}>
                          {question.options.map((option, oi) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={oi}>
                              <Button
                                fullWidth
                                variant={quizAnswers[qi] === oi ? 'contained' : 'outlined'}
                                onClick={() => handleQuizAnswer(qi, oi)}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                              >
                                {String.fromCharCode(65 + oi)}. {option}
                              </Button>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    ))}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => setQuizSubmitted(true)}
                        disabled={Object.keys(quizAnswers).length < activeQuiz.questions.length}
                      >
                        Submit Quiz ({Object.keys(quizAnswers).length}/{activeQuiz.questions.length} answered)
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Resources Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          {[
            { title: 'SEBI Investor Education', url: 'https://investor.sebi.gov.in', icon: '🏛️', description: 'Official securities regulator education portal' },
            { title: 'Income Tax India', url: 'https://incometaxindia.gov.in', icon: '📋', description: 'Official income tax filing and learning portal' },
            { title: 'AMFI - Mutual Funds', url: 'https://www.amfiindia.com', icon: '📊', description: 'Official mutual fund industry body' },
            { title: 'RBI Financial Education', url: 'https://rbi.org.in', icon: '🏦', description: 'Reserve Bank of India resources' },
            { title: 'Zerodha Varsity', url: 'https://zerodha.com/varsity', icon: '📖', description: 'Free stock market education modules' },
            { title: 'CIBIL Score Check', url: 'https://www.cibil.com', icon: '💳', description: 'Check and monitor your credit score' },
          ].map((resource, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
              <Card sx={{ transition: 'all 0.3s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                <CardContent>
                  <Typography variant="h2" component="span">{resource.icon}</Typography>
                  <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 1 }}>{resource.title}</Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{resource.description}</Typography>
                  <Button variant="outlined" size="small" endIcon={<ArrowForward />} sx={{ mt: 1 }}>
                    Visit Resource
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tip Detail Dialog */}
      <Dialog open={!!selectedTip} onClose={() => setSelectedTip(null)} maxWidth="md" fullWidth>
        {selectedTip && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h4" component="span">{selectedTip.icon}</Typography>
                  <Typography variant="h6" fontWeight={700}>{selectedTip.title}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={() => toggleBookmark(selectedTip.id)}>
                    {bookmarkedTips.has(selectedTip.id) ? <Bookmark color="primary" /> : <BookmarkBorder />}
                  </IconButton>
                  <IconButton><Share /></IconButton>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip label={selectedTip.difficulty} size="small" color={selectedTip.difficulty === 'beginner' ? 'success' : selectedTip.difficulty === 'intermediate' ? 'warning' : 'error'} />
                <Chip label={`${selectedTip.readTime} min read`} size="small" variant="outlined" />
                <Chip label={selectedTip.category} size="small" variant="outlined" />
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
                {selectedTip.detailedContent}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedTip.tags.map(tag => (
                  <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" />
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedTip(null)}>Close</Button>
              <Button variant="contained" startIcon={<ThumbUp />}>Helpful ({selectedTip.likes})</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Module Detail Dialog */}
      <Dialog open={!!selectedModule} onClose={() => setSelectedModule(null)} maxWidth="sm" fullWidth>
        {selectedModule && (
          <>
            <DialogTitle>
              <Typography variant="h6" fontWeight={700}>{selectedModule.icon} {selectedModule.title}</Typography>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>{selectedModule.description}</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Lessons:</Typography>
              {selectedModule.topics.map((topic, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: 'primary.main' }}>{idx + 1}</Avatar>
                  <Typography variant="body2">{topic}</Typography>
                  <Box sx={{ flex: 1 }} />
                  {idx < 2 && <CheckCircle color="success" sx={{ fontSize: 18 }} />}
                </Box>
              ))}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedModule(null)}>Close</Button>
              <Button variant="contained" startIcon={<PlayArrow />}>Start Learning</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default FinancialEducation;
