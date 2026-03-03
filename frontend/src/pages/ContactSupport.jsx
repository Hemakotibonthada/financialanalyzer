import React, { useState } from 'react';
import api from '../services/api';
import MainLayout from '../components/MainLayout';
import { 
  Phone, Mail, MessageCircle, MapPin, Clock, Send,
  CheckCircle, Building2, Globe, Headphones
} from 'lucide-react';

const ContactSupport = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: '',
    priority: 'normal',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/support/tickets', formData);
    } catch (err) {
      console.error('Failed to submit support ticket:', err.message);
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: '',
        priority: 'normal',
        message: ''
      });
    }, 3000);
  };

  const contactMethods = [
    {
      icon: Phone,
      title: 'Phone Support',
      content: '+1 (800) 123-4567',
      description: '24/7 availability',
      color: 'blue'
    },
    {
      icon: Mail,
      title: 'Email Support',
      content: 'support@circuvent.com',
      description: 'Response within 24 hours',
      color: 'green'
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      content: 'Start Chat',
      description: 'Average wait: 2 minutes',
      color: 'purple'
    },
    {
      icon: MapPin,
      title: 'Office Address',
      content: '123 Tech Park, Silicon Valley',
      description: 'Visit us Mon-Fri, 9AM-6PM',
      color: 'orange'
    }
  ];

  const categories = [
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'account', label: 'Account Management' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'security', label: 'Security Concern' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <MainLayout title="Contact Support">
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center space-x-3 mb-4">
              <Headphones className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">Contact Support</h1>
                <p className="text-blue-100">We're here to help you 24/7</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Methods */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Get in Touch</h2>
                
                <div className="space-y-4">
                  {contactMethods.map((method, index) => {
                    const Icon = method.icon;
                    return (
                      <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${method.color}-100 text-${method.color}-600`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{method.title}</h3>
                          <p className="text-sm text-gray-700 dark:text-slate-300">{method.content}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{method.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Support Hours</h3>
                </div>
                <div className="space-y-2 text-sm dark:text-slate-200">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Monday - Friday</span>
                    <span className="font-medium">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Saturday</span>
                    <span className="font-medium">10:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Sunday</span>
                    <span className="font-medium">Closed</span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Emergency support available 24/7
                    </p>
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-6 text-white">
                <Building2 className="w-8 h-8 mb-3" />
                <h3 className="font-bold text-lg mb-2">Circuvent Technologies</h3>
                <p className="text-sm text-blue-100 mb-4">
                  Leading provider of enterprise financial management solutions
                </p>
                <div className="flex items-center space-x-2 text-sm">
                  <Globe className="w-4 h-4" />
                  <span>www.circuvent.com</span>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/30 border border-gray-200 dark:border-slate-700 p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Send us a message</h2>
                <p className="text-gray-600 dark:text-slate-400 mb-6">
                  Fill out the form below and we'll get back to you as soon as possible
                </p>

                {submitted ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-900 dark:text-green-400 mb-2">Message Sent!</h3>
                    <p className="text-green-700 dark:text-green-300">
                      Thank you for contacting us. We'll respond within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Category *
                        </label>
                        <select
                          required
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a category</option>
                          {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Priority
                        </label>
                        <select
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Brief description of your issue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Please provide detailed information about your inquiry..."
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        * Required fields
                      </p>
                      <button
                        type="submit"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* FAQ Link */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Looking for quick answers?</strong> Check our{' '}
                  <a href="/help" className="underline hover:text-blue-600">Help Center</a>
                  {' '}for frequently asked questions and guides.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ContactSupport;
