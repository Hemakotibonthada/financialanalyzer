import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from './sections/Header';
import FeaturesSection from './sections/FeaturesSection';
import Footer from './sections/Footer';

const FeaturesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to specific category if provided in state
  useEffect(() => {
    if (location.state?.scrollToCategory) {
      setTimeout(() => {
        const categoryElement = document.getElementById(`category-${location.state.scrollToCategory}`);
        if (categoryElement) {
          categoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header 
        scrolled={scrolled} 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        navigate={navigate}
      />
      
      {/* Page Header */}
      <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Explore All Features
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover 45+ powerful features designed to help you manage your finances with ease
            </p>
          </div>
        </div>
      </div>

      <FeaturesSection navigate={navigate} />
      <Footer navigate={navigate} />
    </div>
  );
};

export default FeaturesPage;
