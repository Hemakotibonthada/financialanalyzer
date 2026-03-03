/* =============================================================================
   FINANCIAL ANALYZER — PREMIUM LANDING PAGE
   Full-featured showcase with scroll-reveal animations, SVG illustrations,
   glassmorphism cards, interactive feature deep-dives, and premium UI/UX.
   ============================================================================= */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/landing.css';

import {
  Brain, Shield, TrendingUp, Target, Receipt, Building2,
  Mail, Wallet, PieChart, CreditCard, Globe, Cloud,
  Search, Users, Landmark, HeartPulse,
  ArrowRight, CheckCircle2, ChevronDown,
  Sparkles, Zap, Star, Play, Menu, X,
  BarChart3, Lock, Bell,
  BadgeCheck, Quote,
  MousePointerClick
} from 'lucide-react';

// ─── Typewriter Hook ─────────────────────────────────────────────────────────
function useTypewriter(words, typingSpeed = 80, pause = 2000) {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(word.substring(0, charIdx + 1));
        if (charIdx + 1 === word.length) {
          setTimeout(() => setDeleting(true), pause);
        } else {
          setCharIdx(c => c + 1);
        }
      } else {
        setText(word.substring(0, charIdx));
        if (charIdx === 0) {
          setDeleting(false);
          setWordIdx((wordIdx + 1) % words.length);
        } else {
          setCharIdx(c => c - 1);
        }
      }
    }, deleting ? typingSpeed / 2 : typingSpeed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, typingSpeed, pause]);

  return text;
}

// ─── Animated Counter Hook ───────────────────────────────────────────────────
function useCounter(end, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStarted(true); obs.unobserve(el); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);

  return [count, ref];
}

// ─── DATA ────────────────────────────────────────────────────────────────────
const FEATURES_DEEP = [
  {
    icon: Brain, accent: '#3b82f6',
    title: 'AI-Powered Financial Insights',
    tagline: 'Your personal AI financial advisor that never sleeps',
    description: 'Our machine-learning engine analyzes your spending patterns, predicts future expenses, detects anomalies, and provides actionable recommendations — all in real time.',
    bullets: ['Smart spending pattern recognition', 'Anomaly & fraud detection alerts', 'Personalized savings recommendations', 'Predictive cash-flow forecasting'],
    stat: { value: '97%', label: 'Prediction accuracy' },
    mockup: 'ai'
  },
  {
    icon: Mail, accent: '#06b6d4',
    title: 'Gmail Transaction Intelligence',
    tagline: 'Automatically detect every transaction from your inbox',
    description: 'Connect your Gmail and let our parser extract bank alerts, UPI confirmations, credit-card charges, EMI debits, salary credits, NEFT/RTGS/IMPS transfers — all formats from every major Indian bank.',
    bullets: ['Auto-sync every 15 minutes', 'Supports 40+ email formats', 'Zero manual data entry', 'Smart duplicate detection'],
    stat: { value: '40+', label: 'Bank formats supported' },
    mockup: 'gmail'
  },
  {
    icon: BarChart3, accent: '#8b5cf6',
    title: 'Enterprise Dashboard & Analytics',
    tagline: 'Beautiful charts that tell your financial story',
    description: 'Interactive charts, heat maps, trend lines, and category breakdowns give you a 360° view of your finances. Drill down into any time period, compare months, and export reports.',
    bullets: ['10+ chart types with drill-down', 'Real-time data streaming', 'Custom date-range comparisons', 'One-click PDF / CSV export'],
    stat: { value: '360°', label: 'Financial visibility' },
    mockup: 'dashboard'
  },
  {
    icon: Target, accent: '#22c55e',
    title: 'Budget Intelligence & Goals',
    tagline: 'Set goals, track progress, celebrate milestones',
    description: 'Create budgets per category, set savings goals with target dates, and watch animated progress rings fill up as you get closer. Smart nudges keep you on track.',
    bullets: ['Category-wise budget limits', 'Visual progress tracking', 'Smart overspend alerts', 'Milestone celebrations & streaks'],
    stat: { value: '3×', label: 'Faster goal achievement' },
    mockup: 'goals'
  },
  {
    icon: CreditCard, accent: '#f97316',
    title: 'EMI, Debt & Investment Tracking',
    tagline: 'Master your loans and grow your portfolio',
    description: 'Track every EMI, loan, and credit-card balance in one place. Monitor your investment portfolio, calculate returns, and see your net-worth trend over time.',
    bullets: ['Auto EMI schedule tracking', 'Debt snowball / avalanche planner', 'Portfolio performance dashboard', 'Net-worth trend visualization'],
    stat: { value: '₹2.4L', label: 'Avg. user savings / year' },
    mockup: 'debt'
  },
  {
    icon: Shield, accent: '#64748b',
    title: 'Bank-Grade Security & Privacy',
    tagline: 'Your data is encrypted, private, and yours alone',
    description: "AES-256 encryption at rest, TLS 1.3 in transit, two-factor authentication, and OAuth 2.0 — all backed by Firebase's enterprise security infrastructure. We never sell your data.",
    bullets: ['AES-256 encryption at rest', 'Two-factor authentication (TOTP)', 'OAuth 2.0 secure sign-in', 'SOC 2 compliant infrastructure'],
    stat: { value: '0', label: 'Data breaches ever' },
    mockup: 'security'
  }
];

const ALL_FEATURES = [
  { icon: Brain,        title: 'AI Insights',        desc: 'ML-powered spending analysis' },
  { icon: Mail,         title: 'Gmail Sync',          desc: 'Auto-detect email transactions' },
  { icon: BarChart3,    title: 'Live Dashboard',      desc: 'Real-time financial overview' },
  { icon: Target,       title: 'Goal Tracker',        desc: 'Visual savings milestones' },
  { icon: Wallet,       title: 'Budget Manager',      desc: 'Category-wise spending limits' },
  { icon: CreditCard,   title: 'EMI Tracker',         desc: 'Auto schedule & reminders' },
  { icon: TrendingUp,   title: 'Investments',         desc: 'Portfolio performance monitoring' },
  { icon: Receipt,      title: 'Tax Planner',         desc: 'Smart tax-saving suggestions' },
  { icon: PieChart,     title: 'Cash Flow',           desc: 'Future cash-flow forecasting' },
  { icon: HeartPulse,   title: 'Credit Score',        desc: 'CIBIL monitoring & tips' },
  { icon: Globe,        title: 'Multi-Currency',      desc: 'Track in 50+ currencies' },
  { icon: Cloud,        title: 'Cloud Sync',          desc: 'Auto backup & restore' },
  { icon: Building2,    title: 'Business Mode',       desc: 'Team expense management' },
  { icon: Search,       title: 'Smart Search',        desc: 'Find any transaction instantly' },
  { icon: Bell,         title: 'Smart Alerts',        desc: 'Bill reminders & notifications' },
  { icon: Landmark,     title: 'Retirement Plan',     desc: 'Long-term wealth planning' },
];

const STEPS = [
  { num: '01', title: 'Create Your Account', desc: 'Sign up in 30 seconds with email or Google. No credit card required.', icon: MousePointerClick },
  { num: '02', title: 'Connect Your Data',   desc: 'Link Gmail for auto-sync, upload bank statements, or enter manually.', icon: Zap },
  { num: '03', title: 'Get AI Insights',     desc: 'Watch your dashboard come alive with charts, predictions, and recommendations.', icon: Sparkles },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Product Manager, Bangalore', text: 'This app completely changed how I manage money. The Gmail auto-sync alone saves me 2 hours a week of manual entry. The AI insights caught a subscription I forgot about — saved me ₹6,000/year!', rating: 5, avatar: 'PS' },
  { name: 'Rahul Verma',  role: 'Startup Founder, Mumbai',    text: 'We use the Business Mode for our 15-person team. Expense tracking, budget alerts, tax planning — everything in one place. The dashboard is gorgeous and the export feature is a lifesaver during audits.', rating: 5, avatar: 'RV' },
  { name: 'Anjali Patel',  role: 'Freelance Designer, Pune',  text: 'As a freelancer with irregular income, the cash-flow forecasting feature is incredible. I can see 6 months ahead and plan accordingly. The credit score monitoring helped me improve from 650 to 780!', rating: 5, avatar: 'AP' },
  { name: 'Vikram Singh',  role: 'Data Scientist, Hyderabad',  text: "The AI model behind the spending predictions is surprisingly accurate. I've tested several fintech apps and this one's recommendation engine is the most relevant. The API is clean too.", rating: 5, avatar: 'VS' },
];

const PRICING = [
  {
    name: 'Free', price: '₹0', period: 'forever', featured: false,
    features: ['5 bank accounts', 'Basic dashboard', 'Manual entry', '30-day history', 'Email support', 'Community access'],
    cta: 'Get Started Free'
  },
  {
    name: 'Pro', price: '₹299', period: '/month', featured: true,
    features: ['Unlimited accounts', 'AI-powered insights', 'Gmail auto-sync', 'Unlimited history', 'Priority support', 'Export reports', 'Custom categories', 'Multi-currency'],
    cta: 'Start 14-Day Free Trial'
  },
  {
    name: 'Enterprise', price: 'Custom', period: 'per team', featured: false,
    features: ['Everything in Pro', 'Team management', 'Admin dashboard', 'API access', 'SSO / SAML', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
    cta: 'Contact Sales'
  }
];

const FAQ_DATA = [
  { q: 'Is my financial data secure?',              a: 'Absolutely. We use AES-256 encryption, TLS 1.3, and store data on SOC 2-compliant Firebase infrastructure. We never sell or share your data with third parties. Two-factor authentication adds an extra layer of security.' },
  { q: 'How does Gmail auto-sync work?',             a: 'After you grant read-only access via Google OAuth 2.0, our parser scans your inbox for bank alerts, UPI confirmations, credit-card statements, and more. It supports 40+ email formats from all major Indian banks and auto-syncs every 15 minutes.' },
  { q: 'Can I use it for my business?',              a: 'Yes! Our Business Mode supports team expense management, admin dashboards, role-based access, and multi-user budgets. Enterprise plans include API access, SSO, and dedicated support.' },
  { q: 'What banks and formats are supported?',      a: 'We support SBI, HDFC, ICICI, Axis, Kotak, Yes Bank, PNB, BOB, and 30+ more Indian banks. Our parser handles UPI, NEFT, RTGS, IMPS, credit-card charges, EMI debits, salary credits, and bill payments.' },
  { q: 'Is there a mobile app?',                     a: 'Yes! Our React Native mobile app is available for iOS and Android, with full feature parity including biometric login, push notifications, and offline mode.' },
  { q: 'Can I cancel anytime?',                      a: 'Yes, you can cancel your Pro subscription at any time with no questions asked. Your data remains accessible on the Free plan. We also offer a 14-day free trial for Pro.' },
];

// ─── SVG ILLUSTRATIONS ───────────────────────────────────────────────────────

const DashboardMockupSVG = () => (
  <svg viewBox="0 0 480 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    <rect x="0" y="0" width="480" height="320" rx="16" fill="#0f172a" stroke="#1e293b" strokeWidth="1"/>
    <circle cx="20" cy="16" r="5" fill="#ef4444"/>
    <circle cx="36" cy="16" r="5" fill="#eab308"/>
    <circle cx="52" cy="16" r="5" fill="#22c55e"/>
    <rect x="0" y="30" width="480" height="1" fill="#1e293b"/>
    {/* Sidebar */}
    <rect x="0" y="31" width="72" height="289" fill="#0c1322"/>
    <rect x="16" y="48" width="40" height="6" rx="3" fill="#3b82f6" opacity="0.8"/>
    <rect x="20" y="68" width="32" height="4" rx="2" fill="#334155"/>
    <rect x="20" y="82" width="32" height="4" rx="2" fill="#334155"/>
    <rect x="20" y="96" width="32" height="4" rx="2" fill="#3b82f6" opacity="0.4"/>
    <rect x="20" y="110" width="32" height="4" rx="2" fill="#334155"/>
    <rect x="20" y="124" width="32" height="4" rx="2" fill="#334155"/>
    {/* Stat cards */}
    <rect x="88" y="46" width="90" height="52" rx="10" fill="#1e293b"/>
    <rect x="96" y="54" width="36" height="4" rx="2" fill="#64748b"/>
    <text x="96" y="82" fill="#22c55e" fontSize="16" fontWeight="700" fontFamily="monospace">₹4.2L</text>
    <rect x="190" y="46" width="90" height="52" rx="10" fill="#1e293b"/>
    <rect x="198" y="54" width="36" height="4" rx="2" fill="#64748b"/>
    <text x="198" y="82" fill="#3b82f6" fontSize="16" fontWeight="700" fontFamily="monospace">₹1.8L</text>
    <rect x="292" y="46" width="90" height="52" rx="10" fill="#1e293b"/>
    <rect x="300" y="54" width="36" height="4" rx="2" fill="#64748b"/>
    <text x="300" y="82" fill="#f97316" fontSize="16" fontWeight="700" fontFamily="monospace">₹62K</text>
    <rect x="394" y="46" width="72" height="52" rx="10" fill="#1e293b"/>
    <rect x="402" y="54" width="28" height="4" rx="2" fill="#64748b"/>
    <text x="402" y="82" fill="#8b5cf6" fontSize="14" fontWeight="700" fontFamily="monospace">780</text>
    {/* Bar chart */}
    <rect x="88" y="112" width="196" height="120" rx="10" fill="#1e293b"/>
    <rect x="100" y="120" width="52" height="4" rx="2" fill="#64748b"/>
    <rect x="108" y="190" width="14" height="28" rx="3" fill="#3b82f6" className="land-chart-bar" style={{animationDelay:'0.1s'}}/>
    <rect x="128" y="172" width="14" height="46" rx="3" fill="#3b82f6" className="land-chart-bar" style={{animationDelay:'0.2s'}}/>
    <rect x="148" y="180" width="14" height="38" rx="3" fill="#3b82f6" className="land-chart-bar" style={{animationDelay:'0.3s'}}/>
    <rect x="168" y="158" width="14" height="60" rx="3" fill="#8b5cf6" className="land-chart-bar" style={{animationDelay:'0.4s'}}/>
    <rect x="188" y="168" width="14" height="50" rx="3" fill="#3b82f6" className="land-chart-bar" style={{animationDelay:'0.5s'}}/>
    <rect x="208" y="148" width="14" height="70" rx="3" fill="#22c55e" className="land-chart-bar" style={{animationDelay:'0.6s'}}/>
    <rect x="228" y="162" width="14" height="56" rx="3" fill="#3b82f6" className="land-chart-bar" style={{animationDelay:'0.7s'}}/>
    <rect x="248" y="142" width="14" height="76" rx="3" fill="#8b5cf6" className="land-chart-bar" style={{animationDelay:'0.8s'}}/>
    {/* Donut chart */}
    <rect x="296" y="112" width="170" height="120" rx="10" fill="#1e293b"/>
    <rect x="308" y="120" width="52" height="4" rx="2" fill="#64748b"/>
    <circle cx="381" cy="180" r="36" fill="none" stroke="#1e293b" strokeWidth="12"/>
    <circle cx="381" cy="180" r="36" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="90 226" strokeLinecap="round" transform="rotate(-90 381 180)"/>
    <circle cx="381" cy="180" r="36" fill="none" stroke="#8b5cf6" strokeWidth="12" strokeDasharray="56 226" strokeDashoffset="-90" strokeLinecap="round" transform="rotate(-90 381 180)"/>
    <circle cx="381" cy="180" r="36" fill="none" stroke="#22c55e" strokeWidth="12" strokeDasharray="40 226" strokeDashoffset="-146" strokeLinecap="round" transform="rotate(-90 381 180)"/>
    <circle cx="381" cy="180" r="36" fill="none" stroke="#f97316" strokeWidth="12" strokeDasharray="30 226" strokeDashoffset="-186" strokeLinecap="round" transform="rotate(-90 381 180)"/>
    {/* Transaction list */}
    <rect x="88" y="244" width="378" height="64" rx="10" fill="#1e293b"/>
    <rect x="100" y="252" width="64" height="4" rx="2" fill="#64748b"/>
    <rect x="100" y="266" width="280" height="6" rx="3" fill="#1e3a5f"/>
    <rect x="100" y="266" width="180" height="6" rx="3" fill="#3b82f6" opacity="0.7"/>
    <rect x="100" y="282" width="280" height="6" rx="3" fill="#1e3a5f"/>
    <rect x="100" y="282" width="220" height="6" rx="3" fill="#22c55e" opacity="0.7"/>
    <rect x="100" y="298" width="280" height="6" rx="3" fill="#1e3a5f"/>
    <rect x="100" y="298" width="140" height="6" rx="3" fill="#8b5cf6" opacity="0.7"/>
  </svg>
);

const AIBrainSVG = () => (
  <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Neural network nodes — Input layer */}
    <circle cx="40" cy="50"  r="12" fill="#1e293b" stroke="#3b82f6" strokeWidth="2"/><circle cx="40" cy="50" r="4" fill="#3b82f6"/>
    <circle cx="40" cy="110" r="12" fill="#1e293b" stroke="#3b82f6" strokeWidth="2"/><circle cx="40" cy="110" r="4" fill="#3b82f6"/>
    <circle cx="40" cy="170" r="12" fill="#1e293b" stroke="#3b82f6" strokeWidth="2"/><circle cx="40" cy="170" r="4" fill="#3b82f6"/>
    {/* Hidden layer 1 */}
    <circle cx="120" cy="40"  r="14" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2"/><circle cx="120" cy="40" r="5" fill="#8b5cf6"/>
    <circle cx="120" cy="90"  r="14" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2"/><circle cx="120" cy="90" r="5" fill="#8b5cf6"/>
    <circle cx="120" cy="140" r="14" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2"/><circle cx="120" cy="140" r="5" fill="#8b5cf6"/>
    <circle cx="120" cy="185" r="14" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2"/><circle cx="120" cy="185" r="5" fill="#8b5cf6"/>
    {/* Hidden layer 2 */}
    <circle cx="200" cy="60"  r="14" fill="#1e293b" stroke="#ec4899" strokeWidth="2"/><circle cx="200" cy="60" r="5" fill="#ec4899"/>
    <circle cx="200" cy="120" r="14" fill="#1e293b" stroke="#ec4899" strokeWidth="2"/><circle cx="200" cy="120" r="5" fill="#ec4899"/>
    <circle cx="200" cy="175" r="14" fill="#1e293b" stroke="#ec4899" strokeWidth="2"/><circle cx="200" cy="175" r="5" fill="#ec4899"/>
    {/* Output */}
    <circle cx="260" cy="110" r="16" fill="#1e293b" stroke="#22c55e" strokeWidth="2.5"/><circle cx="260" cy="110" r="6" fill="#22c55e"/>
    {/* Connections */}
    <line x1="52" y1="50" x2="106" y2="40" stroke="#3b82f6" strokeWidth="1" opacity="0.3"/>
    <line x1="52" y1="50" x2="106" y2="90" stroke="#3b82f6" strokeWidth="1" opacity="0.3"/>
    <line x1="52" y1="110" x2="106" y2="90" stroke="#3b82f6" strokeWidth="1.5" opacity="0.5"/>
    <line x1="52" y1="110" x2="106" y2="140" stroke="#3b82f6" strokeWidth="1" opacity="0.3"/>
    <line x1="52" y1="170" x2="106" y2="140" stroke="#3b82f6" strokeWidth="1" opacity="0.3"/>
    <line x1="52" y1="170" x2="106" y2="185" stroke="#3b82f6" strokeWidth="1.5" opacity="0.5"/>
    <line x1="134" y1="40" x2="186" y2="60" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.5"/>
    <line x1="134" y1="90" x2="186" y2="60" stroke="#8b5cf6" strokeWidth="1" opacity="0.3"/>
    <line x1="134" y1="90" x2="186" y2="120" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.5"/>
    <line x1="134" y1="140" x2="186" y2="120" stroke="#8b5cf6" strokeWidth="1" opacity="0.3"/>
    <line x1="134" y1="140" x2="186" y2="175" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.5"/>
    <line x1="134" y1="185" x2="186" y2="175" stroke="#8b5cf6" strokeWidth="1" opacity="0.3"/>
    <line x1="214" y1="60" x2="244" y2="110" stroke="#ec4899" strokeWidth="1.5" opacity="0.5"/>
    <line x1="214" y1="120" x2="244" y2="110" stroke="#ec4899" strokeWidth="2" opacity="0.7"/>
    <line x1="214" y1="175" x2="244" y2="110" stroke="#ec4899" strokeWidth="1" opacity="0.3"/>
    {/* Animated data traveling */}
    <circle r="3" fill="#3b82f6"><animateMotion dur="2s" repeatCount="indefinite" path="M52,50 L106,90"/></circle>
    <circle r="3" fill="#8b5cf6"><animateMotion dur="2.5s" repeatCount="indefinite" path="M134,90 L186,120"/></circle>
    <circle r="3" fill="#ec4899"><animateMotion dur="1.8s" repeatCount="indefinite" path="M214,120 L244,110"/></circle>
    {/* Labels */}
    <text x="20" y="212" fill="#64748b" fontSize="9" fontFamily="monospace">INPUT</text>
    <text x="96" y="212" fill="#64748b" fontSize="9" fontFamily="monospace">LAYER 1</text>
    <text x="176" y="212" fill="#64748b" fontSize="9" fontFamily="monospace">LAYER 2</text>
    <text x="235" y="145" fill="#64748b" fontSize="9" fontFamily="monospace">OUTPUT</text>
  </svg>
);

const GmailFlowSVG = () => (
  <svg viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Envelope */}
    <rect x="20" y="40" width="70" height="50" rx="6" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5"/>
    <path d="M20 46 L55 70 L90 46" stroke="#06b6d4" strokeWidth="1.5" fill="none"/>
    <text x="36" y="82" fill="#64748b" fontSize="8" fontFamily="monospace">GMAIL</text>
    {/* Arrow 1 */}
    <path d="M100 65 L130 65" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 3">
      <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite"/>
    </path>
    <polygon points="130,60 140,65 130,70" fill="#06b6d4"/>
    {/* Parser box */}
    <rect x="145" y="40" width="70" height="50" rx="6" fill="#1e293b" stroke="#8b5cf6" strokeWidth="1.5"/>
    <text x="150" y="60" fill="#8b5cf6" fontSize="8" fontWeight="600" fontFamily="monospace">AI PARSER</text>
    <rect x="155" y="66" width="50" height="3" rx="1" fill="#334155"/>
    <rect x="155" y="66" width="32" height="3" rx="1" fill="#8b5cf6" opacity="0.7"/>
    <rect x="155" y="73" width="50" height="3" rx="1" fill="#334155"/>
    <rect x="155" y="73" width="44" height="3" rx="1" fill="#8b5cf6" opacity="0.5"/>
    <rect x="155" y="80" width="50" height="3" rx="1" fill="#334155"/>
    <rect x="155" y="80" width="26" height="3" rx="1" fill="#8b5cf6" opacity="0.6"/>
    {/* Arrow 2 */}
    <path d="M225 65 L255 65" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3">
      <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite"/>
    </path>
    <polygon points="255,60 265,65 255,70" fill="#22c55e"/>
    {/* Dashboard mini */}
    <rect x="270" y="30" width="25" height="70" rx="4" fill="#1e293b" stroke="#22c55e" strokeWidth="1.5"/>
    <rect x="274" y="38" width="17" height="4" rx="1" fill="#22c55e" opacity="0.4"/>
    <rect x="274" y="48" width="17" height="18" rx="2" fill="#0c1322"/>
    <rect x="276" y="60" width="4" height="6" rx="1" fill="#3b82f6"/>
    <rect x="282" y="56" width="4" height="10" rx="1" fill="#22c55e"/>
    <rect x="274" y="72" width="17" height="3" rx="1" fill="#334155"/>
    <rect x="274" y="78" width="17" height="3" rx="1" fill="#334155"/>
    <rect x="274" y="84" width="17" height="3" rx="1" fill="#334155"/>
    {/* Labels */}
    <text x="24" y="110" fill="#94a3b8" fontSize="7.5" fontFamily="sans-serif">Your Inbox</text>
    <text x="145" y="110" fill="#94a3b8" fontSize="7.5" fontFamily="sans-serif">Smart Extraction</text>
    <text x="262" y="110" fill="#94a3b8" fontSize="7.5" fontFamily="sans-serif">Dashboard</text>
    {/* Transaction type badges */}
    <rect x="20" y="125" width="265" height="60" rx="8" fill="#0f172a" stroke="#1e293b" strokeWidth="1"/>
    <text x="30" y="142" fill="#64748b" fontSize="8" fontFamily="monospace">Detected Transactions:</text>
    {[
      {x:30, y:150, label:'UPI', color:'#06b6d4'},
      {x:86, y:150, label:'NEFT', color:'#3b82f6'},
      {x:142,y:150, label:'EMI', color:'#8b5cf6'},
      {x:198,y:150, label:'Salary', color:'#22c55e'},
      {x:30, y:170, label:'CC', color:'#f97316'},
      {x:86, y:170, label:'RTGS', color:'#ec4899'},
      {x:142,y:170, label:'IMPS', color:'#eab308'},
      {x:198,y:170, label:'Bills', color:'#64748b'},
    ].map((t, i) => (
      <g key={i}>
        <rect x={t.x} y={t.y} width="50" height="16" rx="4" fill={t.color + '20'} stroke={t.color} strokeWidth="0.5"/>
        <text x={t.x + 8} y={t.y + 11} fill={t.color} fontSize="7" fontFamily="monospace">{t.label}</text>
      </g>
    ))}
  </svg>
);

const GoalsSVG = () => (
  <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {[
      { y: 10, label: 'Emergency Fund', amount: '₹4,20,000 / ₹5,00,000', pct: '84%', width: 142, color: '#22c55e', emoji: '₹' },
      { y: 72, label: 'Dream Vacation',  amount: '₹1,20,000 / ₹2,00,000', pct: '60%', width: 102, color: '#3b82f6', emoji: '✈' },
      { y: 134, label: 'New Car Down Payment', amount: '₹90,000 / ₹3,00,000', pct: '30%', width: 51, color: '#8b5cf6', emoji: '🚗' },
    ].map((g, i) => (
      <g key={i}>
        <rect x="10" y={g.y} width="240" height="52" rx="10" fill="#1e293b" stroke={g.color} strokeWidth="1" opacity="0.8"/>
        <circle cx="36" cy={g.y + 26} r="16" fill="#0c1322" stroke={g.color} strokeWidth="2"/>
        <text x="30" y={g.y + 30} fill={g.color} fontSize="10" fontWeight="700" fontFamily="monospace">{g.emoji}</text>
        <text x="60" y={g.y + 20} fill="#e2e8f0" fontSize="10" fontWeight="600">{g.label}</text>
        <text x="60" y={g.y + 34} fill="#64748b" fontSize="8">{g.amount}</text>
        <rect x="60" y={g.y + 40} width="170" height="5" rx="2.5" fill="#1e3a5f"/>
        <rect x="60" y={g.y + 40} width={g.width} height="5" rx="2.5" fill={g.color}>
          <animate attributeName="width" from="0" to={g.width} dur="1.5s" fill="freeze"/>
        </rect>
        <text x="210" y={g.y + 34} fill={g.color} fontSize="9" fontWeight="700">{g.pct}</text>
      </g>
    ))}
  </svg>
);

const DebtSVG = () => (
  <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Portfolio pie */}
    <rect x="10" y="10" width="120" height="90" rx="10" fill="#1e293b" stroke="#f97316" strokeWidth="1"/>
    <text x="20" y="28" fill="#f97316" fontSize="8" fontWeight="600" fontFamily="monospace">PORTFOLIO</text>
    <circle cx="70" cy="62" r="25" fill="none" stroke="#1e293b" strokeWidth="8"/>
    <circle cx="70" cy="62" r="25" fill="none" stroke="#f97316" strokeWidth="8" strokeDasharray="62 157" strokeLinecap="round" transform="rotate(-90 70 62)"/>
    <circle cx="70" cy="62" r="25" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="40 157" strokeDashoffset="-62" strokeLinecap="round" transform="rotate(-90 70 62)"/>
    <circle cx="70" cy="62" r="25" fill="none" stroke="#22c55e" strokeWidth="8" strokeDasharray="30 157" strokeDashoffset="-102" strokeLinecap="round" transform="rotate(-90 70 62)"/>
    <text x="58" y="66" fill="#e2e8f0" fontSize="10" fontWeight="700">₹18L</text>
    {/* Net worth trend */}
    <rect x="140" y="10" width="130" height="90" rx="10" fill="#1e293b" stroke="#22c55e" strokeWidth="1"/>
    <text x="150" y="28" fill="#22c55e" fontSize="8" fontWeight="600" fontFamily="monospace">NET WORTH</text>
    <polyline points="155,75 175,68 195,55 215,60 235,45 255,35" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="230" y="30" fill="#22c55e" fontSize="9" fontWeight="700">↑ 12%</text>
    {/* EMI Schedule */}
    <rect x="10" y="110" width="260" height="80" rx="10" fill="#1e293b" stroke="#8b5cf6" strokeWidth="1"/>
    <text x="20" y="128" fill="#8b5cf6" fontSize="8" fontWeight="600" fontFamily="monospace">EMI SCHEDULE</text>
    {[
      { y: 138, name: 'Home Loan', amount: '₹42,500/mo', color: '#f97316' },
      { y: 156, name: 'Car Loan', amount: '₹18,200/mo', color: '#3b82f6' },
      { y: 174, name: 'Personal Loan', amount: '₹12,800/mo', color: '#8b5cf6' },
    ].map((row, i) => (
      <g key={i}>
        <rect x="20" y={row.y} width="240" height="14" rx="4" fill="#0c1322"/>
        <text x="25" y={row.y + 11} fill="#94a3b8" fontSize="7" fontFamily="monospace">{row.name}</text>
        <text x="180" y={row.y + 11} fill={row.color} fontSize="7" fontWeight="600" fontFamily="monospace">{row.amount}</text>
      </g>
    ))}
  </svg>
);

const SecurityShieldSVG = () => (
  <svg viewBox="0 0 220 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    <path d="M110 20 L190 55 L190 130 Q190 190 110 220 Q30 190 30 130 L30 55 Z" fill="#0f172a" stroke="#3b82f6" strokeWidth="2"/>
    <path d="M110 40 L170 65 L170 125 Q170 175 110 200 Q50 175 50 125 L50 65 Z" fill="#1e293b" stroke="#3b82f6" strokeWidth="1" opacity="0.5"/>
    {/* Lock */}
    <rect x="90" y="105" width="40" height="30" rx="4" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" strokeWidth="1.5"/>
    <path d="M98 105 L98 92 Q98 78 110 78 Q122 78 122 92 L122 105" stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <circle cx="110" cy="118" r="4" fill="#3b82f6"/>
    <line x1="110" y1="122" x2="110" y2="128" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
    {/* Orbiting elements */}
    <g className="land-orbit" style={{'--orbit-r':'70px','--orbit-dur':'8s'}}>
      <circle cx="110" cy="120" r="6" fill="#22c55e" opacity="0.6"/>
    </g>
    <g className="land-orbit" style={{'--orbit-r':'70px','--orbit-dur':'8s', animationDelay:'-2.6s'}}>
      <circle cx="110" cy="120" r="6" fill="#8b5cf6" opacity="0.6"/>
    </g>
    <g className="land-orbit" style={{'--orbit-r':'70px','--orbit-dur':'8s', animationDelay:'-5.3s'}}>
      <circle cx="110" cy="120" r="6" fill="#f97316" opacity="0.6"/>
    </g>
    {/* AES-256 label */}
    <rect x="70" y="155" width="80" height="20" rx="10" fill="#3b82f620" stroke="#3b82f6" strokeWidth="0.5"/>
    <text x="82" y="169" fill="#3b82f6" fontSize="9" fontWeight="600" fontFamily="monospace">AES-256</text>
  </svg>
);

// ─── Mockup Renderer ─────────────────────────────────────────────────────────
const FeatureMockup = ({ type }) => {
  switch (type) {
    case 'ai':        return <AIBrainSVG />;
    case 'gmail':     return <GmailFlowSVG />;
    case 'dashboard': return <DashboardMockupSVG />;
    case 'goals':     return <GoalsSVG />;
    case 'debt':      return <DebtSVG />;
    case 'security':  return <SecurityShieldSVG />;
    default:          return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const heroTyped = useTypewriter(
    ['Financial Future', 'Spending Habits', 'Investment Portfolio', 'Savings Goals', 'Credit Score'],
    90, 2200
  );

  // Counters
  const [userCount, userRef]   = useCounter(50000, 2200);
  const [txCount, txRef]       = useCounter(1200000, 2400);
  const [savedCount, savedRef] = useCounter(500, 2000);
  const [uptime, uptimeRef]    = useCounter(99, 1800);

  // Redirect if authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/dashboard');
  }, [authLoading, isAuthenticated, navigate]);

  // Scroll handler for sticky header
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Scroll-reveal observer
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.land-reveal, .land-reveal-left, .land-reveal-right, .land-reveal-scale')
      .forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  }, []);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] text-gray-900 dark:text-gray-100 overflow-x-hidden land-grain">

      {/* ═══════════ HEADER ═══════════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-200/50 dark:border-white/5'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollTo('hero')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FinancialAnalyzer
              </span>
            </div>
            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {['features','how-it-works','testimonials','pricing','faq'].map(id => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors capitalize">
                  {id.replace(/-/g, ' ')}
                </button>
              ))}
            </nav>
            {/* CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={() => navigate('/login')}
                className="text-sm font-medium px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Sign In
              </button>
              <button onClick={() => navigate('/register')}
                className="text-sm font-semibold px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
                Start Free Trial
              </button>
            </div>
            {/* Mobile toggle */}
            <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/95 dark:bg-[#020617]/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/5">
            <div className="px-4 py-4 space-y-2">
              {['features','how-it-works','testimonials','pricing','faq'].map(id => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="block w-full text-left px-4 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors capitalize">
                  {id.replace(/-/g, ' ')}
                </button>
              ))}
              <div className="pt-2 flex gap-2">
                <button onClick={() => navigate('/login')} className="flex-1 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-xl">Sign In</button>
                <button onClick={() => navigate('/register')} className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl">Start Free</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section id="hero" className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Mesh gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="land-mesh-blob w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-500/10 -top-40 -left-40" style={{'--mesh-dur':'12s'}} />
          <div className="land-mesh-blob w-[500px] h-[500px] bg-purple-500/20 dark:bg-purple-500/10 top-20 right-0" style={{'--mesh-dur':'15s', animationDelay:'-4s'}} />
          <div className="land-mesh-blob w-[400px] h-[400px] bg-cyan-500/15 dark:bg-cyan-500/[0.08] bottom-0 left-1/3" style={{'--mesh-dur':'10s', animationDelay:'-7s'}} />
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[
            {size:5,x:80,y:120,dx:40,dy:-60,dur:'4s',delay:'0s',color:'rgba(59,130,246,0.4)'},
            {size:4,x:200,y:200,dx:-30,dy:-80,dur:'5s',delay:'1s',color:'rgba(139,92,246,0.4)'},
            {size:6,x:400,y:100,dx:50,dy:-40,dur:'4.5s',delay:'0.5s',color:'rgba(6,182,212,0.3)'},
            {size:3,x:600,y:250,dx:-40,dy:-90,dur:'6s',delay:'2s',color:'rgba(236,72,153,0.3)'},
            {size:5,x:900,y:150,dx:-60,dy:-50,dur:'5.5s',delay:'1.5s',color:'rgba(34,197,94,0.3)'},
          ].map((p, i) => (
            <div key={i} className="land-particle"
              style={{left:p.x,top:p.y,'--size':p.size+'px','--dx':p.dx+'px','--dy':p.dy+'px','--dur':p.dur,'--delay':p.delay,'--pcolor':p.color}} />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 mb-6 land-badge-pop">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 tracking-wide">AI-POWERED FINANCE PLATFORM</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                <span className="text-gray-900 dark:text-white">Take Control of</span><br />
                <span className="text-gray-900 dark:text-white">Your </span>
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent land-gradient-morph bg-[length:300%_300%] land-cursor">
                  {heroTyped}
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                The all-in-one platform that connects your Gmail, analyzes every transaction with AI, and gives you beautiful dashboards, budgets, goals, and predictions — all in real time.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <button onClick={() => navigate('/register')}
                  className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2">
                  Start Free — No Card Required
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => scrollTo('features')}
                  className="group w-full sm:w-auto px-8 py-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <Play className="w-5 h-5" />
                  See How It Works
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-gray-500 dark:text-gray-500">
                {['No credit card required', '14-day free trial', 'Cancel anytime'].map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Dashboard Mockup */}
            <div className="relative land-float-slow">
              <div className="land-border-glow p-1">
                <div className="rounded-[18px] overflow-hidden shadow-2xl shadow-blue-500/10">
                  <DashboardMockupSVG />
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 land-float" style={{animationDelay:'-1s'}}>
                <div className="land-glass px-3 py-2 flex items-center gap-2 shadow-lg">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">Savings</div>
                    <div className="text-sm font-bold text-green-400">+₹24,500</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 land-float" style={{animationDelay:'-3s'}}>
                <div className="land-glass px-3 py-2 flex items-center gap-2 shadow-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">AI Score</div>
                    <div className="text-sm font-bold text-purple-400">97%</div>
                  </div>
                </div>
              </div>
              <div className="absolute top-1/2 -right-8 land-float-rev hidden xl:block">
                <div className="land-glass px-3 py-2 flex items-center gap-2 shadow-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">Gmail Sync</div>
                    <div className="text-sm font-bold text-blue-400">Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS BAR ═══════════ */}
      <section className="relative py-12 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)', backgroundSize:'32px 32px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { ref: userRef,  value: userCount,  suffix: '+',   label: 'Active Users',        Icon: Users },
              { ref: txRef,    value: txCount,    suffix: '+',   label: 'Transactions Tracked', Icon: Receipt },
              { ref: savedRef, value: savedCount, suffix: 'Cr+', label: 'Money Managed (₹)',   Icon: Wallet },
              { ref: uptimeRef,value: uptime,     suffix: '.9%', label: 'Uptime SLA',           Icon: Zap },
            ].map((s, i) => (
              <div key={i} ref={s.ref} className="text-center">
                <s.Icon className="w-6 h-6 mx-auto mb-2 opacity-80" />
                <div className="text-3xl sm:text-4xl font-black tabular-nums">{s.value.toLocaleString()}{s.suffix}</div>
                <div className="text-sm opacity-80 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES DEEP DIVE ═══════════ */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16 lg:mb-24 land-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 mb-4">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 tracking-wide">POWERFUL FEATURES</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Everything You Need to<br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Master Your Finances</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Six powerful modules that work together to give you complete financial control — from AI insights to bank-grade security.
            </p>
          </div>

          {/* Feature blocks — alternating layout */}
          <div className="space-y-24 lg:space-y-36">
            {FEATURES_DEEP.map((feat, idx) => {
              const isEven = idx % 2 === 0;
              const Icon = feat.icon;
              return (
                <div key={idx} className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${isEven ? '' : 'lg:grid-flow-dense'}`}>
                  {/* Text side */}
                  <div className={`${isEven ? 'land-reveal-left' : 'land-reveal-right'} ${!isEven ? 'lg:col-start-2' : ''}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                      style={{background: `${feat.accent}15`}}>
                      <Icon className="w-4 h-4" style={{color: feat.accent}} />
                      <span className="text-xs font-semibold tracking-wide" style={{color: feat.accent}}>
                        {feat.title.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">{feat.title}</h3>
                    <p className="mt-2 text-lg font-medium" style={{color: feat.accent}}>{feat.tagline}</p>
                    <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">{feat.description}</p>
                    <ul className="mt-6 space-y-3">
                      {feat.bullets.map((b, bi) => (
                        <li key={bi} className="flex items-start gap-3">
                          <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{background: `${feat.accent}20`}}>
                            <CheckCircle2 className="w-3.5 h-3.5" style={{color: feat.accent}} />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{b}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      <span className="text-2xl font-black" style={{color: feat.accent}}>{feat.stat.value}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{feat.stat.label}</span>
                    </div>
                  </div>
                  {/* Illustration side */}
                  <div className={`${isEven ? 'land-reveal-right' : 'land-reveal-left'} ${!isEven ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                    <div className="relative">
                      <div className="absolute inset-0 rounded-3xl opacity-30 blur-3xl"
                        style={{background: `radial-gradient(circle, ${feat.accent}40, transparent 70%)`}} />
                      <div className="relative land-glass-light dark:land-glass p-6 sm:p-8 rounded-3xl">
                        <FeatureMockup type={feat.mockup} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ ALL FEATURES GRID ═══════════ */}
      <section className="py-20 lg:py-28 bg-gray-50 dark:bg-[#0c1322]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 land-reveal">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              16+ Features, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">One Platform</span>
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Every tool you need to manage personal or business finances, all working together seamlessly.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {ALL_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="land-reveal land-feature-card land-glass-light dark:land-glass p-5 sm:p-6 text-center group cursor-default"
                  style={{transitionDelay: `${i * 0.04}s`}}>
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-sm sm:text-base">{f.title}</h4>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="py-20 lg:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 land-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 mb-4">
              <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-semibold text-green-700 dark:text-green-300 tracking-wide">QUICK SETUP</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Get Started in <span className="bg-gradient-to-r from-green-500 to-cyan-500 bg-clip-text text-transparent">3 Simple Steps</span>
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              From sign-up to AI insights in under 5 minutes. No complex setup, no learning curve.
            </p>
          </div>
          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500/30 via-blue-500/30 to-purple-500/30 -translate-y-1/2" />
            <div className="grid lg:grid-cols-3 gap-8">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const colors = ['from-green-500 to-emerald-600', 'from-blue-500 to-cyan-600', 'from-purple-500 to-pink-600'];
                return (
                  <div key={i} className="land-reveal relative" style={{transitionDelay: `${i * 0.15}s`}}>
                    <div className="relative land-glass-light dark:land-glass p-8 rounded-3xl text-center group hover:-translate-y-2 transition-all duration-300">
                      <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${colors[i]} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-xs font-bold text-gray-400 tracking-widest mb-2">STEP {s.num}</div>
                      <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="testimonials" className="py-20 lg:py-28 bg-gray-50 dark:bg-[#0c1322]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 land-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 mb-4">
              <Star className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300 tracking-wide">LOVED BY USERS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              What Our Users <span className="bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">Say About Us</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="land-reveal land-feature-card land-glass-light dark:land-glass p-6 rounded-3xl flex flex-col"
                style={{transitionDelay: `${i * 0.1}s`}}>
                <Quote className="w-8 h-8 text-blue-500/20 dark:text-blue-400/20 mb-3" />
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed flex-1">{t.text}</p>
                <div className="flex items-center gap-1 mt-4 mb-3">
                  {Array(t.rating).fill(0).map((_, si) => (
                    <Star key={si} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 land-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 mb-4">
              <BadgeCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 tracking-wide">SIMPLE PRICING</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Plans That <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">Grow With You</span>
            </h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Start free, upgrade when you need more power. No hidden fees, cancel anytime.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
            {PRICING.map((plan, i) => (
              <div key={i} className={`land-reveal land-price-glow relative ${plan.featured ? 'md:-mt-4 md:mb-4' : ''}`}
                style={{transitionDelay: `${i * 0.12}s`}}>
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white text-xs font-bold shadow-lg z-10">
                    MOST POPULAR
                  </div>
                )}
                <div className={`p-8 rounded-3xl ${plan.featured
                    ? 'bg-gradient-to-b from-blue-600 to-purple-700 text-white shadow-2xl shadow-blue-500/30'
                    : 'land-glass-light dark:land-glass'}`}>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className={`text-sm ${plan.featured ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2.5">
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.featured ? 'text-blue-200' : 'text-green-500'}`} />
                        <span className={`text-sm ${plan.featured ? 'text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate('/register')}
                    className={`mt-8 w-full py-3.5 rounded-2xl font-semibold text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                      plan.featured
                        ? 'bg-white text-blue-600 hover:shadow-lg'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25'
                    }`}>
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="py-20 lg:py-28 bg-gray-50 dark:bg-[#0c1322]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 land-reveal">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Frequently Asked <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Questions</span>
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ_DATA.map((item, i) => (
              <div key={i} className="land-reveal land-glass-light dark:land-glass rounded-2xl overflow-hidden"
                style={{transitionDelay: `${i * 0.06}s`}}>
                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left group">
                  <span className="font-semibold text-sm sm:text-base pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 flex-shrink-0 text-gray-400 transition-transform duration-300 ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${activeFaq === i ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="px-6 pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 land-gradient-morph" />
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 2px 2px, white 1px, transparent 1px)', backgroundSize:'40px 40px'}} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white/10 land-float" />
          <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-white/5 land-float-slow" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-xl bg-white/5 land-float-rev rotate-45" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Ready to Transform Your<br />Financial Life?
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-xl mx-auto">
            Join 50,000+ users who have taken control of their finances with AI-powered insights, automated tracking, and beautiful dashboards.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')}
              className="group w-full sm:w-auto px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2">
              Start Your Free Trial Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => scrollTo('features')}
              className="w-full sm:w-auto px-8 py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-2">
              Explore Features
            </button>
          </div>
          <p className="mt-6 text-sm text-blue-200 flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-white dark:bg-[#020617] border-t border-gray-200 dark:border-white/5 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  FinancialAnalyzer
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                AI-powered financial management platform trusted by 50,000+ users across India.
              </p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Security', 'Integrations', 'API Docs'] },
              { title: 'Company', links: ['About Us', 'Blog', 'Careers', 'Press Kit', 'Contact'] },
              { title: 'Legal',   links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'Refund Policy'] },
            ].map((col, ci) => (
              <div key={ci}>
                <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link, li) => (
                    <li key={li}>
                      <a href="#" className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-gray-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} FinancialAnalyzer. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {['X', 'In', 'GH', 'YT'].map((label, si) => (
                <a key={si} href="#" className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                  <span className="text-xs font-bold">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
