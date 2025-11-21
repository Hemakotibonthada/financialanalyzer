import React from 'react';
import { stats } from '../data';

const StatsSection = () => {
  return (
    <section className="py-16 bg-white relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 opacity-50"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center group cursor-pointer transform hover:scale-110 transition-all duration-500"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 group-hover:scale-125 transition-transform duration-300">
                {stat.value}
              </div>
              <div className="text-gray-600 group-hover:text-gray-900 transition-colors">{stat.label}</div>
              {/* Decorative line */}
              <div className="w-0 group-hover:w-16 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mt-3 transition-all duration-500 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
