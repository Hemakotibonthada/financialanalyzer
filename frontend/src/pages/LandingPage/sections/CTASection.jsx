import React from 'react';
import { CheckCircle, ArrowRight, Download } from 'lucide-react';

const CTASection = ({ navigate }) => {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      
      <div className="max-w-4xl mx-auto text-center text-white relative z-10">
        <h2 className="text-5xl font-bold mb-6 animate-fade-in-up">
          Ready to Transform Your Financial Life?
        </h2>
        <p className="text-2xl mb-8 opacity-90">
          Join 50,000+ users who are already taking control of their finances
        </p>
        <div className="flex items-center justify-center space-x-4 mb-8 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6" />
            <span>30-day free trial</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6" />
            <span>Cancel anytime</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:shadow-2xl transition transform hover:scale-105 flex items-center justify-center space-x-2 text-lg font-semibold"
          >
            <span>Start Your Free Trial</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-xl hover:bg-white hover:text-blue-600 transition flex items-center justify-center space-x-2 text-lg font-semibold">
            <Download className="w-5 h-5" />
            <span>Download App</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
