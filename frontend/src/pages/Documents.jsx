import React, { useState, useEffect } from 'react';
import { Upload, FileText, Search, Star, Clock, Filter, Trash2, Eye, Download } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import api from '../services/api';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('bank_statement');
  const [uploadType, setUploadType] = useState('financial');
  const [uploadDescription, setUploadDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const documentCategories = [
    { 
      value: 'bank_statement', 
      label: 'Bank Statement', 
      icon: '📄',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      textColor: 'text-blue-600',
      description: 'Monthly bank account statements'
    },
    { 
      value: 'salary_slip', 
      label: 'Salary Slip', 
      icon: '📊',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      textColor: 'text-green-600',
      description: 'Monthly salary slips and pay stubs'
    },
    { 
      value: 'tax_documents', 
      label: 'Tax Documents', 
      icon: '📑',
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      textColor: 'text-orange-600',
      description: 'Tax returns, Form 16, and tax receipts'
    },
    { 
      value: 'investment_docs', 
      label: 'Investment Docs', 
      icon: '💼',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      textColor: 'text-purple-600',
      description: 'Investment statements and certificates'
    },
    { 
      value: 'insurance', 
      label: 'Insurance', 
      icon: '🛡️',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      textColor: 'text-red-600',
      description: 'Insurance policies and premium receipts'
    },
    { 
      value: 'loan_documents', 
      label: 'Loan Documents', 
      icon: '📋',
      bgColor: 'bg-cyan-50',
      iconBg: 'bg-cyan-100',
      textColor: 'text-cyan-600',
      description: 'Loan agreements and EMI statements'
    }
  ];

  const documentTypes = [
    { value: 'financial', label: 'Financial Statement' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'contract', label: 'Contract' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'report', label: 'Report' },
    { value: 'form', label: 'Form' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    loadDocuments();
  }, [selectedCategory, selectedType]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedType !== 'all') params.type = selectedType;

      const response = await api.get('/documents', { params });
      if (response.data.success) {
        setDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setMessage({ type: 'error', text: 'Failed to load documents' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(files);
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one file' });
      return;
    }

    try {
      setUploading(true);
      setMessage({ type: '', text: '' });

      const formData = new FormData();
      formData.append('document', uploadFiles[0]);
      formData.append('category', uploadCategory);
      formData.append('type', uploadType);
      formData.append('description', uploadDescription);

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Document uploaded successfully!' });
        setShowUploadModal(false);
        setUploadFiles([]);
        setUploadDescription('');
        loadDocuments();
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to upload documents' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await api.delete(`/documents/${documentId}`);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Document deleted successfully' });
        loadDocuments();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setMessage({ type: 'error', text: 'Failed to delete document' });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      (doc.fileName && doc.fileName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'starred' && doc.starred) ||
      (activeTab === 'recent' && isRecent(doc.uploadedAt));
    
    return matchesSearch && matchesCategory && matchesType && matchesTab;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isRecent = (date) => {
    if (!date) return false;
    const uploadDate = new Date(date);
    const daysDiff = (new Date() - uploadDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  };

  const handleAutoCategorize = () => {
    setMessage({ type: 'info', text: 'Auto-categorization feature coming soon!' });
  };

  const headerActions = (
    <button
      onClick={() => setShowUploadModal(true)}
      className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 transition-all shadow-sm"
    >
      <Upload className="h-4 w-4" />
      Upload Document
    </button>
  );

  return (
    <MainLayout
      title="Documents"
      subtitle="Upload and manage your financial documents"
      headerActions={headerActions}
    >
      {/* Message Display */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
          'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
        }`}>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="float-right text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            ×
          </button>
          {message.text}
        </div>
      )}

      {/* Document Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {documentCategories.map((category) => (
          <div
            key={category.value}
            className={`${category.bgColor} rounded-xl p-6 cursor-pointer hover:shadow-md transition-all border border-gray-100 dark:border-slate-700 ${
              selectedCategory === category.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedCategory(selectedCategory === category.value ? 'all' : category.value)}
          >
            <div className={`${category.iconBg} w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto`}>
              <span className="text-3xl">{category.icon}</span>
            </div>
            <h3 className={`text-center font-semibold ${category.textColor} mb-2`}>
              {category.label}
            </h3>
            <p className="text-center text-sm text-gray-600 dark:text-slate-400">
              {category.description}
            </p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 mb-6">
        <div className="border-b border-gray-200 dark:border-slate-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="h-4 w-4" />
              ALL DOCUMENTS
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Search className="h-4 w-4" />
              ADVANCED SEARCH
            </button>
            <button
              onClick={() => setActiveTab('starred')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'starred'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Star className="h-4 w-4" />
              STARRED
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'recent'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="h-4 w-4" />
              RECENT
            </button>
          </nav>
        </div>

        {/* Search and Filters */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Box */}
            <div className="w-full md:w-96 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-200"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-slate-200"
              >
                <option value="all">All Types</option>
                {documentTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <button
                onClick={handleAutoCategorize}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Auto-Categorize
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Display */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-12 text-center border border-blue-100 dark:border-blue-800">
          <FileText className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <p className="text-blue-800 dark:text-blue-400 text-lg font-medium mb-2">No documents found.</p>
          <p className="text-blue-600 dark:text-blue-400 mb-4">Upload your first document to get started.</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-5 w-5" />
            Upload Document
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/30">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredDocuments.map((doc) => {
                  const category = documentCategories.find(c => c.value === doc.category);
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`${category?.iconBg || 'bg-gray-100'} w-10 h-10 rounded-lg flex items-center justify-center mr-3`}>
                            <span className="text-xl">{category?.icon || '📄'}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.fileName || doc.name || 'Unnamed Document'}</div>
                            {doc.description && (
                              <div className="text-sm text-gray-500 dark:text-slate-400">{doc.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${category?.textColor || 'text-gray-600'} ${category?.bgColor || 'bg-gray-100'}`}>
                          {category?.label || doc.category || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        {doc.type || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => window.open(doc.url, '_blank')}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                          title="View Document"
                        >
                          <Eye className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Document"
                        >
                          <Trash2 className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Upload Document</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.txt"
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 dark:bg-slate-700 dark:text-slate-200"
                />
                {uploadFiles.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                    Selected: {uploadFiles[0].name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 dark:bg-slate-700 dark:text-slate-200"
                >
                  {documentCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Type
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 dark:bg-slate-700 dark:text-slate-200"
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 dark:bg-slate-700 dark:text-slate-200"
                  rows="3"
                  placeholder="Add a description..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading || uploadFiles.length === 0}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFiles([]);
                  setUploadDescription('');
                }}
                className="flex-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Documents;
