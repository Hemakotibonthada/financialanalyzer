import React from 'react';
import { CheckCircle, Star } from 'lucide-react';

const PricingSection = ({ navigate }) => {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 animate-fade-in-up">
          <span className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4">PRICING</span>
          <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that's right for you • No hidden fees
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="group bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-blue-600 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <div className="text-5xl font-bold text-gray-900 mb-2">
                ₹0
              </div>
              <p className="text-gray-500 mb-6">Perfect for getting started</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 group-hover:scale-125 transition-transform" />
                  <span>Up to 100 transactions/month</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 group-hover:scale-125 transition-transform" />
                  <span>Basic analytics & reports</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 group-hover:scale-125 transition-transform" />
                  <span>Local data storage</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 group-hover:scale-125 transition-transform" />
                  <span>Mobile app access</span>
                </li>
              </ul>
              <button 
                onClick={() => navigate('/register')}
                className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-300 font-semibold group-hover:scale-105"
              >
                Get Started Free
              </button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="group bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white transform scale-105 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-110 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            
            <div className="relative z-10">
              <div className="bg-yellow-400 text-blue-900 px-4 py-1 rounded-full text-sm font-bold inline-flex items-center space-x-1 mb-4 animate-pulse">
                <Star className="w-4 h-4 fill-current" />
                <span>MOST POPULAR</span>
              </div>
              <h3 className="text-3xl font-bold mb-2">Pro</h3>
              <div className="text-6xl font-bold mb-2">
                ₹299
              </div>
              <p className="text-blue-100 mb-6">Everything you need to grow</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 group-hover:scale-125 transition-transform" />
                  <span>Unlimited transactions</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 group-hover:scale-125 transition-transform" />
                  <span>AI-powered insights & predictions</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 group-hover:scale-125 transition-transform" />
                  <span>Cloud sync</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 group-hover:scale-125 transition-transform" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 group-hover:scale-125 transition-transform" />
                  <span>Priority support</span>
                </li>
              </ul>
              <button 
                onClick={() => navigate('/register')}
                className="w-full py-3 bg-white text-blue-600 rounded-lg hover:shadow-lg transition font-semibold group-hover:scale-105"
              >
                Start Free Trial
              </button>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="group bg-white rounded-2xl p-8 border-2 border-gray-200 hover:border-purple-600 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <div className="text-5xl font-bold text-gray-900 mb-2">
                Custom
              </div>
              <p className="text-gray-500 mb-6">For large organizations</p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 group-hover:scale-125 transition-transform" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 group-hover:scale-125 transition-transform" />
                  <span>Multi-user access</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 group-hover:scale-125 transition-transform" />
                  <span>API access</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 group-hover:scale-125 transition-transform" />
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 group-hover:scale-125 transition-transform" />
                  <span>Custom integrations</span>
                </li>
              </ul>
              <button className="w-full py-3 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-300 font-semibold group-hover:scale-105">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
