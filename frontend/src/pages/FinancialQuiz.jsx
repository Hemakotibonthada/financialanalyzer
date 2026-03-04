import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import MainLayout from '../components/MainLayout';

const QUIZ_CATEGORIES = [
  { id: 'basics', label: 'Financial Basics', icon: '📚', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { id: 'investing', label: 'Investing', icon: '📈', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  { id: 'tax', label: 'Tax Planning', icon: '🧾', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { id: 'insurance', label: 'Insurance', icon: '🛡️', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  { id: 'retirement', label: 'Retirement', icon: '🏖️', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
];

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

const QUESTIONS = {
  basics: [
    { q: 'What does SIP stand for in mutual funds?', options: ['Systematic Investment Plan', 'Simple Interest Payment', 'Standard Investment Protocol', 'Savings Interest Plan'], correct: 0, explanation: 'SIP stands for Systematic Investment Plan, allowing regular periodic investments in mutual funds.' },
    { q: 'What is an emergency fund?', options: ['Money for vacations', 'Money for 3-6 months of expenses', 'Money for stock trading', 'Money for retirement'], correct: 1, explanation: 'An emergency fund typically covers 3-6 months of living expenses for unexpected situations.' },
    { q: 'What is compound interest?', options: ['Interest on principal only', 'Interest on interest', 'A fixed interest rate', 'Government tax on savings'], correct: 1, explanation: 'Compound interest is interest calculated on both the initial principal and the accumulated interest from previous periods.' },
    { q: 'What is inflation?', options: ['Decrease in prices', 'Increase in money supply', 'General rise in price levels', 'A type of tax'], correct: 2, explanation: 'Inflation is the rate at which the general level of prices for goods and services rises, reducing purchasing power.' },
    { q: 'Which is more liquid: fixed deposit or savings account?', options: ['Fixed deposit', 'Savings account', 'Both are equally liquid', 'Neither is liquid'], correct: 1, explanation: 'A savings account provides immediate access to funds, making it more liquid than a fixed deposit which has a lock-in period.' },
  ],
  investing: [
    { q: 'What is diversification in investing?', options: ['Investing all in one stock', 'Spreading investments across assets', 'Buying only bonds', 'Timing the market'], correct: 1, explanation: 'Diversification means spreading investments across different asset classes to reduce risk.' },
    { q: 'What is a P/E ratio?', options: ['Price to Earnings ratio', 'Profit to Expense ratio', 'Payment to Equity ratio', 'Principal to EMI ratio'], correct: 0, explanation: 'The Price-to-Earnings ratio measures a company\'s current share price relative to its earnings per share.' },
    { q: 'What does NAV represent in mutual funds?', options: ['Net Account Value', 'Net Asset Value', 'New Allocation Volume', 'National Average Value'], correct: 1, explanation: 'NAV (Net Asset Value) represents the per-unit market value of all assets held by a mutual fund scheme.' },
    { q: 'Which is generally considered the safest investment?', options: ['Cryptocurrency', 'Small-cap stocks', 'Government bonds', 'Options trading'], correct: 2, explanation: 'Government bonds are backed by the sovereign and are considered among the safest investment options.' },
    { q: 'What is an IPO?', options: ['Internal Portfolio Offering', 'Initial Public Offering', 'Investment Portfolio Option', 'Instant Payment Order'], correct: 1, explanation: 'IPO (Initial Public Offering) is when a company first sells its shares to the public on a stock exchange.' },
  ],
  tax: [
    { q: 'Under which section can you claim tax deduction for life insurance premium in India?', options: ['Section 80C', 'Section 80D', 'Section 80G', 'Section 24'], correct: 0, explanation: 'Section 80C allows deductions up to ₹1.5 lakh for investments including life insurance premiums.' },
    { q: 'What is the maximum deduction under Section 80C?', options: ['₹1 lakh', '₹1.5 lakh', '₹2 lakh', '₹2.5 lakh'], correct: 1, explanation: 'The maximum deduction under Section 80C is ₹1,50,000 per financial year.' },
    { q: 'Which section provides deduction for health insurance premiums?', options: ['80C', '80D', '80E', '80G'], correct: 1, explanation: 'Section 80D provides deductions for medical insurance premiums paid for self, spouse, children, and parents.' },
    { q: 'What is LTCG tax rate on equity investments exceeding ₹1 lakh?', options: ['5%', '10%', '15%', '20%'], correct: 1, explanation: 'Long Term Capital Gains on equity exceeding ₹1 lakh are taxed at 10% without indexation benefit.' },
    { q: 'What is the standard deduction for salaried employees?', options: ['₹40,000', '₹50,000', '₹75,000', '₹1,00,000'], correct: 1, explanation: 'The standard deduction for salaried employees is ₹50,000 per financial year.' },
  ],
  insurance: [
    { q: 'What is the purpose of term life insurance?', options: ['Investment growth', 'Tax saving only', 'Financial protection for dependents', 'Regular income'], correct: 2, explanation: 'Term insurance provides pure life cover to protect your dependents financially in case of your demise.' },
    { q: 'What does the claim settlement ratio indicate?', options: ['Premium amount', 'Percentage of claims paid', 'Policy duration', 'Sum assured'], correct: 1, explanation: 'The claim settlement ratio shows what percentage of claims an insurance company has settled out of total claims received.' },
    { q: 'What is a rider in insurance?', options: ['The insurance agent', 'Additional coverage add-on', 'The beneficiary', 'Premium payment period'], correct: 1, explanation: 'A rider is an add-on benefit that can be attached to the base insurance policy for additional coverage.' },
    { q: 'Which type of insurance covers hospitalization expenses?', options: ['Term insurance', 'Health insurance', 'Motor insurance', 'Travel insurance'], correct: 1, explanation: 'Health insurance specifically covers medical and hospitalization expenses.' },
    { q: 'What is the waiting period in health insurance?', options: ['Time to buy policy', 'Time before claims can be made', 'Time between premiums', 'Time to renew policy'], correct: 1, explanation: 'The waiting period is the initial duration after purchasing a policy during which certain claims cannot be made.' },
  ],
  retirement: [
    { q: 'What is NPS?', options: ['National Payment System', 'National Pension System', 'New Provident Scheme', 'National Profit Sharing'], correct: 1, explanation: 'NPS (National Pension System) is a government-sponsored pension scheme for retirement planning.' },
    { q: 'At what age can you withdraw from EPF without penalty?', options: ['55', '58', '60', '65'], correct: 1, explanation: 'EPF allows penalty-free withdrawal at 58 years of age, though partial withdrawals are allowed earlier.' },
    { q: 'What is the 4% rule in retirement planning?', options: ['Save 4% of income', 'Invest 4% in bonds', 'Withdraw 4% yearly from retirement corpus', 'Grow savings by 4% yearly'], correct: 2, explanation: 'The 4% rule suggests withdrawing 4% of your retirement corpus annually to make it last 30+ years.' },
    { q: 'Which offers additional ₹50,000 tax benefit under 80CCD(1B)?', options: ['PPF', 'NPS', 'EPF', 'FD'], correct: 1, explanation: 'NPS offers an additional ₹50,000 tax deduction under Section 80CCD(1B) over and above 80C limit.' },
    { q: 'What is FIRE in retirement planning?', options: ['Financial Insurance Retirement Equity', 'Financial Independence, Retire Early', 'Fixed Income Retirement Earnings', 'Fund Investment Retirement Estimate'], correct: 1, explanation: 'FIRE stands for Financial Independence, Retire Early - a movement focused on aggressive saving and investing.' },
  ],
};

// Leaderboard will be fetched from the backend API
const LEADERBOARD_DATA = [];

export default function FinancialQuiz() {
  const { mode, isDark, isBlack } = useTheme();
  const dk = isDark || isBlack;
  const [view, setView] = useState('menu'); // menu | quiz | results | leaderboard | certificate
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [difficulty, setDifficulty] = useState('beginner');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [quizHistory, setQuizHistory] = useState([]);
  const [streak, setStreak] = useState(5);
  const [leaderboard, setLeaderboard] = useState(LEADERBOARD_DATA);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get('/achievements/leaderboard');
        if (res.data?.data && Array.isArray(res.data.data)) {
          setLeaderboard(res.data.data);
        }
      } catch (err) {
        console.log('Leaderboard fetch fallback:', err.message);
      }
    };
    fetchLeaderboard();
  }, []);

  const questions = selectedCategory ? QUESTIONS[selectedCategory] : [];
  const currentQuestion = questions[currentQ];

  // Timer
  useEffect(() => {
    if (view === 'quiz' && !showExplanation && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timerRef.current);
    }
    if (view === 'quiz' && timeLeft === 0 && !showExplanation) {
      handleAnswer(-1);
    }
  }, [view, timeLeft, showExplanation]);

  const startQuiz = (catId) => {
    setSelectedCategory(catId);
    setCurrentQ(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setTimeLeft(difficulty === 'beginner' ? 30 : difficulty === 'intermediate' ? 20 : 15);
    setView('quiz');
  };

  const handleAnswer = (idx) => {
    if (showExplanation) return;
    setSelectedAnswer(idx);
    setShowExplanation(true);
    setAnswers(prev => [...prev, idx]);
    clearTimeout(timerRef.current);
  };

  const nextQuestion = async () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(q => q + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(difficulty === 'beginner' ? 30 : difficulty === 'intermediate' ? 20 : 15);
    } else {
      // Submit quiz results to backend
      const finalScore = [...answers].filter((a, i) => a === QUESTIONS[selectedCategory]?.[i]?.correct).length;
      try {
        await api.post('/achievements/check', {
          type: 'quiz',
          category: selectedCategory,
          score: finalScore,
          total: questions.length,
          difficulty,
        });
      } catch (err) {
        console.error('Failed to submit quiz results:', err.message);
      }
      setView('results');
    }
  };

  const score = answers.filter((a, i) => a === QUESTIONS[selectedCategory]?.[i]?.correct).length;
  const scorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const getScoreMessage = () => {
    if (scorePercent === 100) return { text: 'Perfect Score! 🌟', color: 'text-yellow-500' };
    if (scorePercent >= 80) return { text: 'Excellent! 🎉', color: 'text-green-500' };
    if (scorePercent >= 60) return { text: 'Good Job! 👍', color: 'text-blue-500' };
    if (scorePercent >= 40) return { text: 'Keep Learning! 📖', color: 'text-amber-500' };
    return { text: 'Needs Improvement 💪', color: 'text-red-500' };
  };

  return (
    <MainLayout title="Financial Quiz">
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Financial Quiz</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Test and improve your financial knowledge</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-bold text-orange-600">{streak} day streak</span>
            </div>
            <button
              onClick={() => setView(view === 'leaderboard' ? 'menu' : 'leaderboard')}
              className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-4 py-2 transition-colors"
            >
              🏆 Leaderboard
            </button>
          </div>
        </div>

        {/* Quiz Menu */}
        {view === 'menu' && (
          <>
            {/* Difficulty */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Select Difficulty</h2>
              <div className="flex gap-3">
                {DIFFICULTY_LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-1 ${
                      difficulty === level
                        ? level === 'beginner' ? 'bg-green-600 text-white' : level === 'intermediate' ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {QUIZ_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => startQuiz(cat.id)}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-left hover:ring-2 hover:ring-blue-500 transition-all group"
                >
                  <div className="text-4xl mb-3">{cat.icon}</div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600">{cat.label}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{QUESTIONS[cat.id].length} questions</p>
                  <div className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium ${cat.color}`}>
                    Start Quiz →
                  </div>
                </button>
              ))}
            </div>

            {/* Quiz History */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">📜 Recent Quiz History</h2>
              {quizHistory.length === 0 ? (
                <p className="text-sm text-slate-400">No quizzes taken yet. Start one above!</p>
              ) : (
                <div className="space-y-3">
                  {quizHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{QUIZ_CATEGORIES.find(c => c.id === h.category)?.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{QUIZ_CATEGORIES.find(c => c.id === h.category)?.label}</p>
                          <p className="text-xs text-slate-400">{h.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${h.score >= 80 ? 'text-green-600' : h.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {h.score}%
                        </p>
                        <p className="text-xs text-slate-400">{Math.round(h.score * h.total / 100)}/{h.total} correct</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Quiz View */}
        {view === 'quiz' && currentQuestion && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Question {currentQ + 1} of {questions.length}</span>
                <span className={`font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : ''}`}>⏱ {timeLeft}s</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
              </div>
            </div>

            {/* Timer bar */}
            <div className="mb-6">
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${(timeLeft / (difficulty === 'beginner' ? 30 : difficulty === 'intermediate' ? 20 : 15)) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{currentQuestion.q}</h2>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, i) => {
                const isCorrect = i === currentQuestion.correct;
                const isSelected = selectedAnswer === i;
                let optionClass = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-blue-400 cursor-pointer';
                if (showExplanation) {
                  if (isCorrect) optionClass = 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300';
                  else if (isSelected && !isCorrect) optionClass = 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300';
                  else optionClass = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 opacity-60';
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={showExplanation}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${optionClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        showExplanation && isCorrect ? 'bg-green-500 text-white' :
                        showExplanation && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                        'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{option}</span>
                      {showExplanation && isCorrect && <span className="ml-auto text-green-500">✓</span>}
                      {showExplanation && isSelected && !isCorrect && <span className="ml-auto text-red-500">✗</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">📖 Explanation</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Next Button */}
            {showExplanation && (
              <button
                onClick={nextQuestion}
                className="w-full bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 py-3 transition-colors"
              >
                {currentQ < questions.length - 1 ? 'Next Question →' : 'View Results'}
              </button>
            )}
          </div>
        )}

        {/* Results View */}
        {view === 'results' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 text-center space-y-6">
            {/* Animated Score */}
            <div className="py-8">
              <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center border-4 border-blue-500 mb-4 relative">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">{scorePercent}%</span>
              </div>
              <h2 className={`text-2xl font-bold ${getScoreMessage().color}`}>{getScoreMessage().text}</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                You got {score} out of {questions.length} questions correct
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-600">{score}</p>
                <p className="text-xs text-slate-500">Correct</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-red-600">{questions.length - score}</p>
                <p className="text-xs text-slate-500">Incorrect</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-2xl font-bold text-blue-600">+{score * 20}</p>
                <p className="text-xs text-slate-500">Points Earned</p>
              </div>
            </div>

            {/* Answer Review */}
            <div className="text-left space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Answer Review</h3>
              {questions.map((q, i) => (
                <div key={i} className={`p-3 rounded-xl ${answers[i] === q.correct ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800'}`}>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{i + 1}. {q.q}</p>
                  <p className="text-xs mt-1 text-slate-500">
                    Your answer: <span className={answers[i] === q.correct ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {answers[i] >= 0 ? q.options[answers[i]] : 'Time expired'}
                    </span>
                    {answers[i] !== q.correct && <span className="text-green-600 ml-2">Correct: {q.options[q.correct]}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={() => startQuiz(selectedCategory)}
                className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-6 py-2.5 transition-colors"
              >
                Retry Quiz
              </button>
              <button
                onClick={() => setView('menu')}
                className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-600 px-6 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                Back to Menu
              </button>
              {scorePercent >= 80 && (
                <button
                  onClick={() => setView('certificate')}
                  className="bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 px-6 py-2.5 transition-colors"
                >
                  🏅 View Certificate
                </button>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {view === 'leaderboard' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">🏆 Quiz Leaderboard</h2>
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    entry.isUser
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm ${
                      entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                      entry.rank === 2 ? 'bg-slate-300 text-slate-700' :
                      entry.rank === 3 ? 'bg-orange-300 text-orange-800' :
                      'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                    }`}>
                      {entry.rank}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${entry.isUser ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>{entry.name}</p>
                      <p className="text-xs text-slate-400">{entry.quizzes} quizzes • 🔥 {entry.streak} streak</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{entry.score.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <button onClick={() => setView('menu')} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-6 py-2.5 transition-colors">
                Back to Quizzes
              </button>
            </div>
          </div>
        )}

        {/* Certificate */}
        {view === 'certificate' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-4 border-yellow-400 p-8 text-center space-y-4 relative overflow-hidden">
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-yellow-500 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-yellow-500 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-yellow-500 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-yellow-500 rounded-br-2xl" />

            <div className="text-5xl mb-2">🏅</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Certificate of Achievement</h2>
            <p className="text-slate-500 dark:text-slate-400">This certifies that</p>
            <p className="text-xl font-bold text-blue-600">Financial Learner</p>
            <p className="text-slate-500 dark:text-slate-400">has successfully completed the</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {QUIZ_CATEGORIES.find(c => c.id === selectedCategory)?.label} Quiz
            </p>
            <p className="text-slate-500 dark:text-slate-400">with a score of</p>
            <p className="text-3xl font-bold text-green-600">{scorePercent}%</p>
            <p className="text-sm text-slate-400 mt-4">Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

            <div className="flex gap-3 justify-center pt-6">
              <button onClick={() => setView('results')} className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-600 px-6 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                Back to Results
              </button>
              <button onClick={() => setView('menu')} className="bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 px-6 py-2.5 transition-colors">
                More Quizzes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </MainLayout>
  );
}
