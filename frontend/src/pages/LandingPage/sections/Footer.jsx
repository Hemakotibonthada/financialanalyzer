import React from 'react';
import { DollarSign, Mail, Phone, MapPin, Twitter, Linkedin, Github, Instagram } from 'lucide-react';

const Footer = ({ navigate }) => {
  const productLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Security', onClick: () => navigate('/security') },
    { label: 'Updates', onClick: () => navigate('/updates') }
  ];

  const companyLinks = [
    { label: 'About', onClick: () => navigate('/about') },
    { label: 'Blog', onClick: () => navigate('/blog') },
    { label: 'Careers', onClick: () => navigate('/careers') },
    { label: 'Contact', onClick: () => navigate('/contact') }
  ];

  const legalLinks = [
    { label: 'Privacy', onClick: () => navigate('/privacy') },
    { label: 'Terms', onClick: () => navigate('/terms') },
    { label: 'Security', onClick: () => navigate('/security') },
    { label: 'Compliance', onClick: () => navigate('/compliance') }
  ];

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold">Financial Analyzer</span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Your trusted partner for complete financial management. Empowering individuals and businesses to achieve financial freedom.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
                <span className="text-sm">support@financialanalyzer.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
                <span className="text-sm">+91 1800-123-4567</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors">
                <MapPin className="w-5 h-5" />
                <span className="text-sm">Bangalore, India</span>
              </div>
            </div>
          </div>
          
          {/* Product Links */}
          <div>
            <h4 className="font-bold mb-4 text-lg">Product</h4>
            <ul className="space-y-3 text-gray-400">
              {productLinks.map((link, index) => (
                <li key={index}>
                  {link.href ? (
                    <a href={link.href} className="hover:text-white transition-colors hover:translate-x-1 inline-block transform duration-300">
                      {link.label}
                    </a>
                  ) : (
                    <button onClick={link.onClick} className="hover:text-white transition-colors hover:translate-x-1 inline-block transform duration-300">
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Company Links */}
          <div>
            <h4 className="font-bold mb-4 text-lg">Company</h4>
            <ul className="space-y-3 text-gray-400">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <button onClick={link.onClick} className="hover:text-white transition-colors hover:translate-x-1 inline-block transform duration-300">
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Legal Links */}
          <div>
            <h4 className="font-bold mb-4 text-lg">Legal</h4>
            <ul className="space-y-3 text-gray-400">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <button onClick={link.onClick} className="hover:text-white transition-colors hover:translate-x-1 inline-block transform duration-300">
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              <p>© 2025 Financial Analyzer. All rights reserved. Made with ❤️ in India</p>
            </div>
            
            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition-all duration-300 hover:scale-110">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition-all duration-300 hover:scale-110">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-all duration-300 hover:scale-110">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 hover:bg-pink-600 flex items-center justify-center transition-all duration-300 hover:scale-110">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
