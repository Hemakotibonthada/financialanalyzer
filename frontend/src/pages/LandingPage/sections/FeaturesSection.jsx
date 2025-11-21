import React from 'react';
import { ArrowRight } from 'lucide-react';
import { allFeatures, featureCategories } from '../data';

const FeaturesSection = ({ navigate }) => {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-4000"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl font-bold text-gray-900 mb-4 animate-gradient-x bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Complete Financial Management Suite
          </h2>
          <p className="text-xl text-gray-600">
            45+ powerful features designed for individuals, families, and businesses
          </p>
        </div>

        {/* Feature Categories */}
        {featureCategories.map((category) => {
          const categoryFeatures = allFeatures.filter(f => f.category === category.name);
          if (categoryFeatures.length === 0) return null;

          return (
            <div key={category.name} id={`category-${category.name}`} className="mb-12 scroll-mt-24">
              <div className="mb-6">
                <h3 className={`text-2xl font-bold bg-gradient-to-r ${category.color} bg-clip-text text-transparent inline-block`}>
                  {category.title}
                </h3>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categoryFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div 
                      key={index}
                      className="bg-white rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 cursor-pointer border border-gray-100 group relative"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Hover gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none"></div>
                      
                      {/* Image/Visual Section */}
                      <div className={`relative h-40 bg-gradient-to-br ${category.color} overflow-hidden`}>
                        {/* Background Image with Overlay */}
                        <div className="absolute inset-0">
                          <img 
                            src={feature.image || `https://images.unsplash.com/photo-1554224311-beee460c201f?w=400&h=300&fit=crop&auto=format`}
                            alt={feature.title}
                            className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500 group-hover:scale-110 transform"
                            loading="lazy"
                          />
                        </div>
                        
                        {/* Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-85`}></div>
                        
                        {/* Animated Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0 group-hover:animate-pulse" style={{
                            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                          }}></div>
                        </div>
                        
                        {/* Large Icon with Animation */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                            <Icon className="w-20 h-20 text-white relative z-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 drop-shadow-lg" />
                          </div>
                        </div>
                        
                        {/* Decorative Floating Elements */}
                        <div className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full group-hover:scale-150 transition-transform duration-500 animate-float"></div>
                        <div className="absolute bottom-4 left-4 w-12 h-12 bg-white/10 rounded-lg group-hover:rotate-45 transition-transform duration-500 animate-float-delay"></div>
                        <div className="absolute top-1/2 left-1/4 w-6 h-6 bg-white/15 rounded-full group-hover:scale-125 transition-transform duration-500 animate-float-slow"></div>
                      </div>
                      
                      {/* Content Section */}
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {feature.desc}
                        </p>
                        
                        {/* Learn More Link */}
                        <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Learn more</span>
                          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Feature Summary */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-3xl font-bold mb-4">And Much More!</h3>
          <p className="text-lg mb-6 opacity-90">
            Recurring transactions, subscription tracking, expense categorization, income management, 
            savings calculators, loan comparisons, investment analysis, cash flow forecasting, and more...
          </p>
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:shadow-xl transition transform hover:scale-105 font-semibold"
          >
            Explore All Features →
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
