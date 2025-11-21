import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, PlayCircle, ArrowRight } from 'lucide-react';
import { heroFeatures } from '../data';

const HeroSection = ({ navigate }) => {
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto-rotate features showcase
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % heroFeatures.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&h=1080&fit=crop&q=80" 
          alt="Financial Analytics Background"
          className="w-full h-full object-cover opacity-5"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-white/80 to-purple-50/90"></div>
      </div>

      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform cursor-pointer">
              <Star className="w-4 h-4 animate-pulse" />
              <span>Trusted by 50,000+ users</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              <span className="inline-block">Take Control of Your</span>
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x"> Financial Future</span>
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed">
              All-in-one platform to track expenses, manage budgets, plan investments, and achieve financial goals with AI-powered insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/register')}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 flex items-center justify-center space-x-2 text-lg font-semibold relative overflow-hidden"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                <span className="relative">Start Free Trial</span>
                <ArrowRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => navigate('/features')}
                className="group px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-600 hover:text-blue-600 hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 text-lg font-semibold"
              >
                <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>View All Features</span>
              </button>
            </div>

            <div className="flex items-center space-x-8 pt-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-600">No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-600">Free for 30 days</span>
              </div>
            </div>
          </div>

          {/* Animated Feature Card */}
          <div className="relative">
            {/* Floating Elements Around Card */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-float opacity-60 blur-sm"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full animate-float-delay opacity-60 blur-sm"></div>
            <div className="absolute top-1/2 -right-8 w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full animate-float-slow opacity-60 blur-sm"></div>
            
            <div className="bg-white rounded-2xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-500 hover:shadow-3xl relative">
              {heroFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className={`transition-all duration-500 transform ${
                      activeFeature === index ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0 p-8'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg relative`}>
                      <div className="absolute inset-0 bg-white rounded-xl opacity-0 group-hover:opacity-20 animate-pulse"></div>
                      <Icon className="w-8 h-8 text-white relative z-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 mb-4">{feature.description}</p>
                    <div className="flex items-center space-x-2 text-sm font-semibold">
                      <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${feature.color} text-white`}>
                        {feature.stats}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Feature Dots */}
              <div className="flex justify-center space-x-2 mt-8">
                {heroFeatures.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveFeature(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      activeFeature === index ? 'bg-blue-600 w-8' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Floating Stats */}
            <div className="absolute -bottom-8 left-8 right-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-xl p-6">
              <div className="grid grid-cols-3 gap-4 text-white text-center">
                <div>
                  <div className="text-2xl font-bold">50K+</div>
                  <div className="text-sm opacity-90">Users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">1M+</div>
                  <div className="text-sm opacity-90">Transactions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">4.9★</div>
                  <div className="text-sm opacity-90">Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
