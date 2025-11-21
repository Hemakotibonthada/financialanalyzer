import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from './sections/Header';
import HeroSection from './sections/HeroSection';
import StatsSection from './sections/StatsSection';
import FeaturesSection from './sections/FeaturesSection';
import AboutSection from './sections/AboutSection';
import TestimonialsSection from './sections/TestimonialsSection';
import PricingSection from './sections/PricingSection';
import FAQSection from './sections/FAQSection';
import TrustBadgesSection from './sections/TrustBadgesSection';
import CTASection from './sections/CTASection';
import Footer from './sections/Footer';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header 
        scrolled={scrolled} 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        navigate={navigate}
      />
      <HeroSection navigate={navigate} />
      <StatsSection />
      {/* FeaturesSection is now accessible only via dropdown navigation */}
      <AboutSection navigate={navigate} />
      <TestimonialsSection />
      <PricingSection navigate={navigate} />
      <FAQSection />
      <TrustBadgesSection />
      <CTASection navigate={navigate} />
      <Footer navigate={navigate} />
    </div>
  );
};

export default LandingPage;
