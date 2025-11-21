import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, TrendingUp, Calendar } from 'lucide-react';

const BlogPage = () => {
  const navigate = useNavigate();

  const posts = [
    {
      title: 'Top 10 Money-Saving Tips for 2025',
      excerpt: 'Discover proven strategies to boost your savings this year',
      date: 'Jan 15, 2025',
      category: 'Savings'
    },
    {
      title: 'Understanding Investment Portfolio Diversification',
      excerpt: 'Learn how to build a balanced investment portfolio',
      date: 'Jan 10, 2025',
      category: 'Investments'
    },
    {
      title: 'Tax Planning Guide for Small Businesses',
      excerpt: 'Essential tax strategies for entrepreneurs',
      date: 'Jan 5, 2025',
      category: 'Business'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>

        <div className="mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Financial Insights Blog
          </h1>
          <p className="text-xl text-gray-600">
            Expert advice, tips, and insights on personal finance and wealth management
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-20 h-20 text-white opacity-50" />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-blue-600 font-semibold">{post.category}</span>
                  <span className="text-sm text-gray-500 flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{post.date}</span>
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <button className="text-blue-600 font-semibold hover:text-blue-700 flex items-center space-x-2">
                  <span>Read More</span>
                  <TrendingUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
