import React from 'react';
import { TrendingUp } from 'lucide-react';
import { stats } from '../data';

const StatsSection = () => {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 opacity-60"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%)] opacity-60"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-600 rounded-full px-4 py-2 mb-4">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-semibold">TRUSTED BY THOUSANDS</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center group cursor-pointer transform hover:scale-110 transition-all duration-500 relative"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg group-hover:shadow-2xl transition-all duration-300 border border-gray-100 group-hover:border-blue-200">
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 group-hover:scale-125 transition-transform duration-300">
                  {stat.value}
                </div>
                <div className="text-gray-600 group-hover:text-gray-900 transition-colors font-medium">{stat.label}</div>
                {/* Decorative line */}
                <div className="w-0 group-hover:w-16 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mt-4 transition-all duration-500 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
