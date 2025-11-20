import React, { useState, useEffect } from 'react';
import { DollarSign, IndianRupee } from 'lucide-react';
import { 
  parseCurrencyInput, 
  formatCurrency, 
  getCurrencySymbol,
  CURRENCY_OPTIONS,
  convertToINR
} from '../utils/currency';

/**
 * CurrencyInput Component
 * Allows input in USD or INR with automatic INR conversion
 * 
 * @param {object} props
 * @param {string} props.label - Input label
 * @param {number} props.value - Current value in selected currency
 * @param {string} props.currency - Current currency (USD or INR)
 * @param {function} props.onChange - Callback with {amount, currency, amountInINR}
 * @param {string} props.placeholder - Input placeholder
 * @param {boolean} props.required - Is field required
 * @param {boolean} props.disabled - Is field disabled
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showConversion - Show INR conversion below input
 */
const CurrencyInput = ({
  label,
  value = '',
  currency = 'INR',
  onChange,
  placeholder = '0.00',
  required = false,
  disabled = false,
  className = '',
  showConversion = true,
  error = ''
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [inputValue, setInputValue] = useState(value ? String(value) : '');
  const [inrAmount, setInrAmount] = useState(0);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInputValue(String(value));
      calculateINR(String(value), selectedCurrency);
    }
  }, [value]);

  useEffect(() => {
    setSelectedCurrency(currency);
  }, [currency]);

  const calculateINR = (amount, curr) => {
    const numAmount = parseCurrencyInput(amount);
    const converted = convertToINR(numAmount, curr);
    setInrAmount(converted);
    return converted;
  };

  const handleAmountChange = (e) => {
    const newValue = e.target.value;
    
    // Allow numbers, decimal point, and basic formatting
    if (newValue === '' || /^\d*\.?\d{0,2}$/.test(newValue)) {
      setInputValue(newValue);
      const convertedAmount = calculateINR(newValue, selectedCurrency);
      
      if (onChange) {
        onChange({
          amount: parseCurrencyInput(newValue),
          currency: selectedCurrency,
          amountInINR: convertedAmount,
          exchangeRate: selectedCurrency === 'USD' ? 83.12 : 1
        });
      }
    }
  };

  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    setSelectedCurrency(newCurrency);
    const convertedAmount = calculateINR(inputValue, newCurrency);
    
    if (onChange) {
      onChange({
        amount: parseCurrencyInput(inputValue),
        currency: newCurrency,
        amountInINR: convertedAmount,
        exchangeRate: newCurrency === 'USD' ? 83.12 : 1
      });
    }
  };

  const currencySymbol = getCurrencySymbol(selectedCurrency);
  const CurrencyIcon = selectedCurrency === 'USD' ? DollarSign : IndianRupee;

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Currency Selector */}
        <div className="absolute inset-y-0 left-0 flex items-center">
          <select
            value={selectedCurrency}
            onChange={handleCurrencyChange}
            disabled={disabled}
            className="h-full py-0 pl-3pr-8 border-transparent bg-transparent text-gray-500 focus:ring-0 focus:border-transparent text-sm font-medium rounded-l-lg hover:bg-gray-50 transition-colors"
            aria-label="Select currency"
          >
            {CURRENCY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleAmountChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`block w-full pl-16 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
              : 'border-gray-300'
          } ${
            disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
          }`}
          aria-label={label || 'Amount'}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'currency-error' : undefined}
        />

        {/* Currency Icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <CurrencyIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p id="currency-error" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* INR Conversion Display */}
      {showConversion && selectedCurrency === 'USD' && inputValue && parseFloat(inputValue) > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
          <IndianRupee className="h-4 w-4 text-blue-600" />
          <span>
            Equivalent: <span className="font-semibold text-blue-700">
              {formatCurrency(inrAmount, 'INR')}
            </span>
          </span>
        </div>
      )}

      {/* Help Text */}
      {showConversion && (
        <p className="text-xs text-gray-500">
          Reports will show amounts in INR
        </p>
      )}
    </div>
  );
};

export default CurrencyInput;
