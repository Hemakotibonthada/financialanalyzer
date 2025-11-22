import React from 'react';
import { ArrowRight, HelpCircle, MessageCircle } from 'lucide-react';

const FAQSection = () => {
  const faqs = [
    {
      question: 'Is my financial data secure?',
      answer: 'Absolutely! We use bank-level 256-bit encryption, two-factor authentication, and secure cloud storage. Your data is encrypted both in transit and at rest, and we never share your information with third parties.'
    },
    {
      question: 'Can I import my existing financial data?',
      answer: 'Yes! You can easily import transactions from CSV files, bank statements, and other financial apps. We support all major Indian banks and international formats.'
    },
    {
      question: 'What makes the AI insights different?',
      answer: 'Our machine learning algorithms analyze your spending patterns, predict future expenses, identify savings opportunities, and provide personalized recommendations based on your financial goals and behavior.'
    },
    {
      question: 'Can I use this for my business?',
      answer: 'Absolutely! We have dedicated features for business expense tracking, invoicing, vendor management, and tax planning. Perfect for freelancers, small businesses, and entrepreneurs.'
    },
    {
      question: 'Is there a mobile app available?',
      answer: 'Yes! Our mobile app is available for both iOS and Android. All your data syncs automatically across devices in real-time.'
    },
    {
      question: 'What happens after the free trial?',
      answer: 'Your free trial includes full Pro features for 30 days. After that, you can continue with our Free plan or upgrade to Pro. No credit card required for the trial, and you can cancel anytime.'
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-600 rounded-full px-5 py-2 mb-4">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">FAQ</span>
          </div>
          <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about Financial Analyzer. Can't find what you're looking for? <button className="text-blue-600 hover:underline font-semibold">Contact us</button>
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details 
              key={index} 
              className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 relative overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <summary className="flex justify-between items-center cursor-pointer font-semibold text-lg text-gray-900 relative z-10">
                <span className="flex items-center space-x-3">
                  <MessageCircle className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span>{faq.question}</span>
                </span>
                <ArrowRight className="w-5 h-5 text-blue-600 group-open:rotate-90 transition-transform duration-300" />
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed pl-8 relative z-10">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <button className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold">Chat with our team</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
