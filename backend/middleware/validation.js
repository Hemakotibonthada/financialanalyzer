const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation rules
const registerValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),
  validate
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

// Transaction validation rules
const transactionValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Description must be between 1 and 200 characters'),
  body('category')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category is required'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('merchant')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Merchant name too long'),
  validate
];

// Credit Card validation rules
const creditCardValidation = [
  body('cardProvider')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Card provider is required'),
  body('lastFourDigits')
    .trim()
    .matches(/^\d{4}$/)
    .withMessage('Last four digits must be exactly 4 digits'),
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  body('billingDate')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('Billing date must be between 1 and 31'),
  validate
];

// EMI validation rules
const emiValidation = [
  body('loanAmount')
    .isFloat({ min: 1 })
    .withMessage('Loan amount must be a positive number'),
  body('interestRate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Interest rate must be between 0 and 100'),
  body('tenure')
    .isInt({ min: 1, max: 600 })
    .withMessage('Tenure must be between 1 and 600 months'),
  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('loanType')
    .trim()
    .isIn(['PERSONAL', 'HOME', 'CAR', 'EDUCATION', 'BUSINESS', 'OTHER'])
    .withMessage('Invalid loan type'),
  body('lenderName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Lender name is required'),
  validate
];

// Profile validation rules
const profileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address too long'),
  validate
];

// Budget validation rules
const budgetValidation = [
  body('category')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category is required'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Budget amount must be a positive number'),
  body('period')
    .isIn(['MONTHLY', 'WEEKLY', 'YEARLY'])
    .withMessage('Invalid budget period'),
  validate
];

// ID parameter validation
const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  validate
];

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate
];

// Date range validation
const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  validate
];

// Amount range validation
const amountRangeValidation = [
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be positive'),
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum amount must be positive'),
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  transactionValidation,
  creditCardValidation,
  emiValidation,
  profileUpdateValidation,
  budgetValidation,
  idValidation,
  paginationValidation,
  dateRangeValidation,
  amountRangeValidation
};
