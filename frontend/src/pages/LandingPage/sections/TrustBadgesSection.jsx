import React from 'react';
import { Shield, Award, Users, Star, CheckCircle } from 'lucide-react';

const TrustBadgesSection = () => {
  const badges = [
    { icon: Shield, title: 'Bank-Level Security', subtitle: '256-bit Encryption', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { icon: Award, title: 'Award Winning', subtitle: 'Top Fintech App 2024', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { icon: Users, title: '50K+ Users', subtitle: 'Trusted Worldwide', color: 'text-green-600', bgColor: 'bg-green-50' },
    { icon: Star, title: '4.9★ Rating', subtitle: '2000+ Reviews', color: 'text-yellow-500', bgColor: 'bg-yellow-50' }
  ];

  return (
    <section className="py-16 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-y border-gray-100 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-700 rounded-full px-4 py-2 mb-4">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">TRUSTED & VERIFIED</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div 
                key={index} 
                className="group flex flex-col items-center text-center space-y-3 bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 hover:border-blue-200 relative overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className={`w-16 h-16 ${badge.bgColor} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10`}>
                  <Icon className={`w-8 h-8 ${badge.color} ${badge.title === '4.9★ Rating' ? 'fill-current' : ''}`} />
                </div>
                <p className="font-bold text-gray-900 relative z-10">{badge.title}</p>
                <p className="text-sm text-gray-600 relative z-10">{badge.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadgesSection;
