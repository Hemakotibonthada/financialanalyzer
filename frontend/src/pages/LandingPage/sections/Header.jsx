import React, { useState } from 'react';
import { DollarSign, Menu, X, ChevronDown } from 'lucide-react';
import { featureCategories } from '../data';

const Header = ({ scrolled, mobileMenuOpen, setMobileMenuOpen, navigate }) => {
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  const [mobileFeatureExpanded, setMobileFeaturesExpanded] = useState(false);

  const scrollToFeature = (categoryName) => {
    setFeaturesDropdownOpen(false);
    setMobileMenuOpen(false);
    setMobileFeaturesExpanded(false);
    
    // Navigate to features page with category
    navigate('/features', { state: { scrollToCategory: categoryName } });
  };

  return (
    <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Financial Analyzer
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-baseline gap-8">
            {/* Features Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setFeaturesDropdownOpen(true)}
              onMouseLeave={() => setFeaturesDropdownOpen(false)}
            >
              <button className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-base flex items-center gap-1">
                Features
                <ChevronDown className={`w-4 h-4 transition-transform ${
                  featuresDropdownOpen ? 'rotate-180' : ''
                }`} />
              </button>
              
              {/* Dropdown Menu */}
              {featuresDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-4 animate-fade-in-up">
                  <div className="px-4 pb-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Feature Categories</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {featureCategories.map((category) => (
                      <button
                        key={category.name}
                        onClick={() => scrollToFeature(category.name)}
                        className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-gray-700 group-hover:bg-gradient-to-r group-hover:${category.color} group-hover:bg-clip-text group-hover:text-transparent transition-all`}>
                            {category.title}
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-base">
              About Us
            </a>
            <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-base">
              Pricing
            </a>
            <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-base">
              Reviews
            </a>
            <button 
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors text-base"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105 font-medium text-base"
            >
              Get Started Free
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-4 space-y-3">
            {/* Mobile Features Accordion */}
            <div>
              <button 
                onClick={() => setMobileFeaturesExpanded(!mobileFeatureExpanded)}
                className="flex items-center justify-between w-full text-gray-700 hover:text-blue-600 font-medium"
              >
                <span>Features</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${
                  mobileFeatureExpanded ? 'rotate-180' : ''
                }`} />
              </button>
              {mobileFeatureExpanded && (
                <div className="ml-4 mt-2 space-y-2">
                  {featureCategories.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => scrollToFeature(category.name)}
                      className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 py-1"
                    >
                      {category.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a href="#about" className="block text-gray-700 hover:text-blue-600">About Us</a>
            <a href="#pricing" className="block text-gray-700 hover:text-blue-600">Pricing</a>
            <a href="#testimonials" className="block text-gray-700 hover:text-blue-600">Reviews</a>
            <button 
              onClick={() => navigate('/login')}
              className="block w-full text-left text-blue-600 font-medium"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="block w-full px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-center"
            >
              Get Started Free
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
