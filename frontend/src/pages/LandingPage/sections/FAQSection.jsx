import React from 'react';
import { ArrowRight } from 'lucide-react';

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
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold mb-4">FAQ</span>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about Financial Analyzer
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details key={index} className="group bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <summary className="flex justify-between items-center cursor-pointer font-semibold text-lg text-gray-900">
                <span>{faq.question}</span>
                <ArrowRight className="w-5 h-5 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-4 text-gray-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
