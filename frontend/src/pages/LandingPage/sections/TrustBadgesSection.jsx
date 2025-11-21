import React from 'react';
import { Shield, Award, Users, Star } from 'lucide-react';

const TrustBadgesSection = () => {
  const badges = [
    { icon: Shield, title: 'Bank-Level Security', subtitle: '256-bit Encryption', color: 'text-blue-600' },
    { icon: Award, title: 'Award Winning', subtitle: 'Top Fintech App 2024', color: 'text-purple-600' },
    { icon: Users, title: '50K+ Users', subtitle: 'Trusted Worldwide', color: 'text-green-600' },
    { icon: Star, title: '4.9★ Rating', subtitle: '2000+ Reviews', color: 'text-yellow-500' }
  ];

  return (
    <section className="py-12 bg-white border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div key={index} className="flex flex-col items-center text-center space-y-2">
                <Icon className={`w-12 h-12 ${badge.color} ${badge.title === '4.9★ Rating' ? 'fill-current' : ''}`} />
                <p className="font-semibold text-gray-900">{badge.title}</p>
                <p className="text-sm text-gray-600">{badge.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadgesSection;
