import React from 'react';
import { CheckCircle, ArrowRight, Download, Sparkles, TrendingUp, Shield } from 'lucide-react';

const CTASection = ({ navigate }) => {
  return (
    <section className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-yellow-300/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      
      {/* Floating particles */}
      <div className="absolute inset-0">
        <Sparkles className="absolute top-20 left-1/4 w-6 h-6 text-white/30 animate-pulse" />
        <TrendingUp className="absolute top-1/3 right-1/4 w-8 h-8 text-white/30 animate-bounce" />
        <Shield className="absolute bottom-20 left-1/3 w-7 h-7 text-white/30 animate-pulse" />
      </div>
      
      <div className="max-w-4xl mx-auto text-center text-white relative z-10">
        <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-6 animate-fade-in-up">
          <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
          <span className="text-sm font-semibold">Limited Time: 30-Day Free Trial + Premium Features</span>
        </div>
        
        <h2 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in-up leading-tight">
          Ready to Transform Your <br />
          <span className="relative inline-block">
            <span className="relative z-10">Financial Life?</span>
            <div className="absolute bottom-2 left-0 right-0 h-3 bg-yellow-400/30 -skew-y-1"></div>
          </span>
        </h2>
        <p className="text-xl md:text-2xl mb-10 opacity-95 max-w-3xl mx-auto leading-relaxed">
          Join <span className="font-bold text-yellow-300">50,000+</span> users who are already taking control of their finances and building wealth
        </p>
        <div className="flex items-center justify-center space-x-6 mb-10 flex-wrap gap-3">
          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300 group">
            <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">No credit card required</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300 group">
            <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">30-day free trial</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 hover:bg-white/20 transition-all duration-300 group">
            <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Cancel anytime</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={() => navigate('/register')}
            className="group px-10 py-5 bg-white text-blue-600 rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 text-lg font-bold relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10">Start Your Free Trial</span>
            <ArrowRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="group px-10 py-5 bg-transparent border-2 border-white text-white rounded-2xl hover:bg-white hover:text-blue-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 text-lg font-bold relative overflow-hidden">
            <Download className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span>Download App</span>
          </button>
        </div>
        
        <p className="mt-8 text-sm text-white/80">✨ Instant access • No installation required • Works on all devices</p>
      </div>
    </section>
  );
};

export default CTASection;
