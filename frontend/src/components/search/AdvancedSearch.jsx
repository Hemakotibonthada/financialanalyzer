import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Calendar, DollarSign, Tag, ArrowUpDown } from 'lucide-react';
import axios from 'axios';

const AdvancedSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    dateRange: 'all',
    minAmount: '',
    maxAmount: '',
    category: '',
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);

  const searchTypes = [
    { value: 'all', label: 'All' },
    { value: 'transactions', label: 'Transactions' },
    { value: 'invoices', label: 'Invoices' },
    { value: 'clients', label: 'Clients' },
    { value: 'projects', label: 'Projects' },
  ];

  const dateRanges = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
  ];

  const handleSearch = async (useNLP = false) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      let response;
      if (useNLP) {
        response = await axios.post('/api/search/natural-language', {
          query: searchQuery
        });
      } else {
        response = await axios.get('/api/search/universal', {
          params: {
            q: searchQuery,
            type: filters.type !== 'all' ? filters.type : undefined,
            dateRange: filters.dateRange !== 'all' ? filters.dateRange : undefined,
            minAmount: filters.minAmount || undefined,
            maxAmount: filters.maxAmount || undefined,
            category: filters.category || undefined,
            sortBy,
          }
        });
      }

      setResults(response.data.results || response.data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getSuggestions = async (query) => {
    if (query.length < 2) return;

    try {
      const response = await axios.get('/api/search/suggestions', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting suggestions:', error);
    }
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'transaction':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'invoice':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'client':
        return <Users className="w-5 h-5 text-purple-600" />;
      case 'project':
        return <Briefcase className="w-5 h-5 text-orange-600" />;
      default:
        return <Search className="w-5 h-5 text-gray-600" />;
    }
  };

  const highlightMatch = (text, query) => {
    if (!query || !text) return text;

    const parts = text.toString().split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200">{part}</mark> : 
        part
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="w-8 h-8" />
          Advanced Search
        </h1>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search transactions, invoices, clients, projects..."
                className="w-full px-4 py-3 pr-10 border rounded-lg text-lg"
              />
              <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
            <button
              onClick={() => handleSearch(false)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 border rounded-lg hover:bg-gray-50 ${showFilters ? 'bg-gray-100' : ''}`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleSearch(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Try Natural Language Search (e.g., "expenses over $100 this month")
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Search In</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {searchTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {dateRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date_desc">Date (Newest)</option>
                  <option value="date_asc">Date (Oldest)</option>
                  <option value="amount_desc">Amount (High to Low)</option>
                  <option value="amount_asc">Amount (Low to High)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Min Amount</label>
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                  placeholder="₹0"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Amount</label>
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                  placeholder="No limit"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <input
                  type="text"
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  placeholder="Any category"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setFilters({
                    type: 'all',
                    dateRange: 'all',
                    minAmount: '',
                    maxAmount: '',
                    category: '',
                  });
                  setSortBy('relevance');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Clear All
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-gray-600">Searching...</p>
          </CardContent>
        </Card>
      ) : results.length > 0 ? (
        <div>
          <div className="mb-4 text-sm text-gray-600">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getResultIcon(result.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">
                          {highlightMatch(result.title || result.description, searchQuery)}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded capitalize">
                          {result.type}
                        </span>
                      </div>
                      
                      {result.description && result.description !== result.title && (
                        <p className="text-sm text-gray-600 mb-2">
                          {highlightMatch(result.description, searchQuery)}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                        {result.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(result.date).toLocaleDateString()}
                          </span>
                        )}
                        {result.amount && (
                          <span className="flex items-center gap-1 font-semibold">
                            <DollarSign className="w-4 h-4" />
                            ₹{result.amount.toLocaleString()}
                          </span>
                        )}
                        {result.category && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-4 h-4" />
                            {result.category}
                          </span>
                        )}
                      </div>

                      {result.highlights && result.highlights.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {result.highlights.map((highlight, i) => (
                            <div key={i} dangerouslySetInnerHTML={{ __html: highlight }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : searchQuery && !loading ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm mt-1">Try different keywords or filters</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Search Tips */}
      {!searchQuery && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Search Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold mb-1">Natural Language Queries:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>"expenses over ₹5000 this month"</li>
                  <li>"income from last week"</li>
                  <li>"groceries less than ₹1000"</li>
                  <li>"unpaid invoices"</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Quick Search:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Use keywords like merchant names, descriptions, or categories</li>
                  <li>Combine filters for more specific results</li>
                  <li>Sort results by relevance, date, or amount</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedSearch;
