const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// Common validators
// ---------------------------------------------------------------------------

const validators = {
  isEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  isMongoId: (v) => /^[a-f\d]{24}$/i.test(v),
  isPositiveNumber: (v) => typeof v === 'number' && v > 0 && Number.isFinite(v),
  isNonNegativeNumber: (v) => typeof v === 'number' && v >= 0 && Number.isFinite(v),
  isDateString: (v) => !isNaN(Date.parse(v)),
  isUrl: (v) => {
    try { new URL(v); return true; } catch { return false; }
  },
  isString: (v) => typeof v === 'string',
  isNonEmptyString: (v) => typeof v === 'string' && v.trim().length > 0,
  isBoolean: (v) => typeof v === 'boolean',
  isArray: (v) => Array.isArray(v),
  isObject: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  isIn: (allowed) => (v) => allowed.includes(v),
  minLength: (min) => (v) => typeof v === 'string' && v.length >= min,
  maxLength: (max) => (v) => typeof v === 'string' && v.length <= max,
  min: (minVal) => (v) => typeof v === 'number' && v >= minVal,
  max: (maxVal) => (v) => typeof v === 'number' && v <= maxVal,
  matches: (regex) => (v) => regex.test(v),
};

// ---------------------------------------------------------------------------
// Sanitizers
// ---------------------------------------------------------------------------

function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      clean[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// ---------------------------------------------------------------------------
// Error formatter
// ---------------------------------------------------------------------------

function formatErrors(errors) {
  return {
    success: false,
    message: 'Validation failed',
    errors: errors.map((e) => ({
      field: e.field,
      message: e.message,
      value: e.value !== undefined ? '[provided]' : undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// Schema validator engine
// ---------------------------------------------------------------------------

/**
 * Validate a data object against a schema definition.
 *
 * Schema format:
 * {
 *   fieldName: {
 *     type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date',
 *     required: boolean,
 *     validator: (value) => boolean,  // custom validator
 *     message: string,                // custom error message
 *     sanitize: boolean,              // auto-sanitize strings (default true)
 *     default: any,                   // default value if absent
 *     enum: string[],                 // allowed values
 *     min: number,                    // min value / length
 *     max: number,                    // max value / length
 *   }
 * }
 */
function validateAgainstSchema(data, schema) {
  const errors = [];
  const sanitized = { ...data };

  for (const [field, rules] of Object.entries(schema)) {
    let value = data[field];

    // Apply default
    if ((value === undefined || value === null) && rules.default !== undefined) {
      sanitized[field] = rules.default;
      value = rules.default;
    }

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: rules.message || `${field} is required`, value });
      continue;
    }

    // Skip further validation if not present and not required
    if (value === undefined || value === null) continue;

    // Type check
    if (rules.type) {
      let typeValid = true;
      switch (rules.type) {
        case 'string':   typeValid = typeof value === 'string'; break;
        case 'number':   typeValid = typeof value === 'number' && Number.isFinite(value); break;
        case 'boolean':  typeValid = typeof value === 'boolean'; break;
        case 'array':    typeValid = Array.isArray(value); break;
        case 'object':   typeValid = typeof value === 'object' && !Array.isArray(value); break;
        case 'date':     typeValid = !isNaN(Date.parse(value)); break;
        case 'email':    typeValid = validators.isEmail(value); break;
        case 'mongoId':  typeValid = validators.isMongoId(value); break;
        case 'url':      typeValid = validators.isUrl(value); break;
      }
      if (!typeValid) {
        errors.push({ field, message: rules.message || `${field} must be of type ${rules.type}`, value });
        continue;
      }
    }

    // Enum check
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push({
        field,
        message: rules.message || `${field} must be one of: ${rules.enum.join(', ')}`,
        value,
      });
      continue;
    }

    // Min / max
    if (rules.min !== undefined) {
      const val = typeof value === 'string' ? value.length : value;
      if (val < rules.min) {
        const unit = typeof value === 'string' ? 'characters' : '';
        errors.push({ field, message: rules.message || `${field} must be at least ${rules.min} ${unit}`.trim(), value });
      }
    }
    if (rules.max !== undefined) {
      const val = typeof value === 'string' ? value.length : value;
      if (val > rules.max) {
        const unit = typeof value === 'string' ? 'characters' : '';
        errors.push({ field, message: rules.message || `${field} must be at most ${rules.max} ${unit}`.trim(), value });
      }
    }

    // Custom validator
    if (rules.validator && !rules.validator(value)) {
      errors.push({ field, message: rules.message || `${field} is invalid`, value });
    }

    // Sanitize strings
    if (typeof value === 'string' && rules.sanitize !== false) {
      sanitized[field] = sanitizeString(value);
    }
  }

  return { errors, sanitized };
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Create a validation middleware using schema definitions.
 *
 * @param {Object} schemas
 * @param {Object} [schemas.body] - Schema for req.body
 * @param {Object} [schemas.params] - Schema for req.params
 * @param {Object} [schemas.query] - Schema for req.query
 * @param {Object} [options]
 * @param {boolean} [options.sanitize=true] - Auto-sanitize inputs
 * @param {boolean} [options.stripUnknown=false] - Remove fields not in schema
 * @returns {Function} Express middleware
 */
function requestValidator(schemas, options = {}) {
  const { sanitize = true, stripUnknown = false } = options;

  return (req, res, next) => {
    try {
      const allErrors = [];

      for (const [source, schema] of Object.entries(schemas)) {
        if (!schema || !['body', 'params', 'query'].includes(source)) continue;

        const data = req[source] || {};
        const { errors, sanitized } = validateAgainstSchema(data, schema);

        if (errors.length) {
          allErrors.push(...errors.map((e) => ({ ...e, source })));
        }

        if (sanitize) {
          req[source] = stripUnknown
            ? Object.keys(schema).reduce((acc, key) => {
                if (sanitized[key] !== undefined) acc[key] = sanitized[key];
                return acc;
              }, {})
            : { ...req[source], ...sanitized };
        }
      }

      if (allErrors.length > 0) {
        logger.warn('Validation failed:', JSON.stringify(allErrors));
        return res.status(400).json(formatErrors(allErrors));
      }

      next();
    } catch (err) {
      logger.error('Request validator error:', err);
      res.status(500).json({ success: false, message: 'Internal validation error' });
    }
  };
}

// ---------------------------------------------------------------------------
// Common route schemas
// ---------------------------------------------------------------------------

const commonSchemas = {
  createTransaction: {
    body: {
      amount: { type: 'number', required: true, min: 0.01, message: 'Amount must be a positive number' },
      type: { type: 'string', required: true, enum: ['income', 'expense', 'transfer'] },
      category: { type: 'string', required: true, min: 1, max: 100 },
      description: { type: 'string', required: false, max: 500 },
      date: { type: 'date', required: true, message: 'Valid date is required' },
      account: { type: 'string', required: false },
      tags: { type: 'array', required: false },
    },
  },

  updateTransaction: {
    params: {
      id: { type: 'mongoId', required: true, message: 'Valid transaction ID is required' },
    },
    body: {
      amount: { type: 'number', required: false, min: 0.01 },
      type: { type: 'string', required: false, enum: ['income', 'expense', 'transfer'] },
      category: { type: 'string', required: false, min: 1, max: 100 },
      description: { type: 'string', required: false, max: 500 },
      date: { type: 'date', required: false },
    },
  },

  createBudget: {
    body: {
      category: { type: 'string', required: true, min: 1 },
      amount: { type: 'number', required: true, min: 0.01, message: 'Budget amount must be positive' },
      period: { type: 'string', required: true, enum: ['weekly', 'monthly', 'yearly'] },
      startDate: { type: 'date', required: false },
    },
  },

  createGoal: {
    body: {
      name: { type: 'string', required: true, min: 1, max: 200 },
      targetAmount: { type: 'number', required: true, min: 0.01 },
      targetDate: { type: 'date', required: false },
      category: { type: 'string', required: false },
    },
  },

  paginationQuery: {
    query: {
      page: { type: 'number', required: false, min: 1, default: 1 },
      limit: { type: 'number', required: false, min: 1, max: 100, default: 20 },
      sort: { type: 'string', required: false },
      order: { type: 'string', required: false, enum: ['asc', 'desc'] },
    },
  },

  idParam: {
    params: {
      id: { type: 'mongoId', required: true, message: 'Valid ID is required' },
    },
  },

  dateRangeQuery: {
    query: {
      startDate: { type: 'date', required: false },
      endDate: { type: 'date', required: false },
      period: { type: 'string', required: false, enum: ['week', 'month', 'quarter', 'year', 'custom'] },
    },
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = requestValidator;
module.exports.validators = validators;
module.exports.sanitizeString = sanitizeString;
module.exports.sanitizeObject = sanitizeObject;
module.exports.validateAgainstSchema = validateAgainstSchema;
module.exports.commonSchemas = commonSchemas;
