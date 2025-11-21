import React from 'react';
import { DollarSign } from 'lucide-react';

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
    <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">Financial Analyzer</span>
            </div>
            <p className="text-gray-400">
              Your trusted partner for complete financial management
            </p>
          </div>
          
          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              {productLinks.map((link, index) => (
                <li key={index}>
                  {link.href ? (
                    <a href={link.href} className="hover:text-white transition-colors">
                      {link.label}
                    </a>
                  ) : (
                    <button onClick={link.onClick} className="hover:text-white transition-colors">
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <button onClick={link.onClick} className="hover:text-white transition-colors">
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-400">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <button onClick={link.onClick} className="hover:text-white transition-colors">
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>© 2025 Financial Analyzer. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
