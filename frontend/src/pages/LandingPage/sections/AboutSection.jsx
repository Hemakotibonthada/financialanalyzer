import React from 'react';
import { Target, Shield, Users, Zap, Heart, Award, TrendingUp, Sparkles } from 'lucide-react';

const AboutSection = ({ navigate }) => {
  const values = [
    {
      icon: Shield,
      title: 'Security First',
      description: 'Your financial data is protected with bank-level 256-bit encryption and multi-factor authentication.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Users,
      title: 'User-Centric Design',
      description: 'Built with simplicity in mind, making complex financial management accessible to everyone.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Real-time updates and instant insights keep you always informed about your financial health.',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: Sparkles,
      title: 'AI-Powered',
      description: 'Advanced machine learning algorithms provide personalized recommendations and predictions.',
      color: 'from-violet-500 to-purple-500'
    }
  ];

  const achievements = [
    { icon: Users, value: '50,000+', label: 'Happy Users', color: 'from-blue-500 to-cyan-500' },
    { icon: TrendingUp, value: '₹500Cr+', label: 'Money Managed', color: 'from-green-500 to-emerald-500' },
    { icon: Award, value: '4.9/5', label: 'User Rating', color: 'from-yellow-500 to-orange-500' },
    { icon: Heart, value: '99.9%', label: 'Satisfaction Rate', color: 'from-rose-500 to-pink-500' }
  ];

  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1920&h=1080&fit=crop&q=80" 
          alt="Team collaboration"
          className="w-full h-full object-cover opacity-3"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-blue-50/95"></div>
      </div>

      {/* Animated background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-pink-100 to-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            About Financial Analyzer
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Empowering individuals and businesses to take control of their financial future with intelligent, 
            secure, and comprehensive money management tools.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="mb-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 md:p-12">
          <div className="flex items-start gap-6">
            <div className="hidden md:block">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Target className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h3>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                We believe financial freedom should be accessible to everyone. Our mission is to democratize financial 
                management by providing powerful, enterprise-grade tools that are simple enough for anyone to use.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Whether you're tracking personal expenses, managing business finances, or planning for retirement, 
                Financial Analyzer gives you the insights and control you need to make smarter financial decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="mb-16">
          <div className="grid md:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <div 
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${achievement.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className={`text-3xl font-bold bg-gradient-to-r ${achievement.color} bg-clip-text text-transparent mb-2`}>
                    {achievement.value}
                  </h4>
                  <p className="text-gray-600">{achievement.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Core Values */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Core Values</h3>
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div 
                  key={index}
                  className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h4>
                      <p className="text-gray-600 leading-relaxed">{value.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-4">Why Choose Financial Analyzer?</h3>
            <p className="text-lg opacity-90 max-w-3xl mx-auto">
              We're not just another finance app. We're your financial partner, combining cutting-edge technology 
              with intuitive design to help you achieve your financial goals.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="text-4xl font-bold mb-2">45+</div>
              <div className="text-sm opacity-90">Powerful Features</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-sm opacity-90">Customer Support</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-sm opacity-90">Secure & Private</div>
            </div>
          </div>

          <div className="text-center mt-8">
            <button 
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:shadow-2xl transition-all transform hover:scale-105 font-semibold text-lg"
            >
              Start Your Financial Journey Today →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
