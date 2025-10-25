const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration for financial documents
const financialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/financial');
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

// File filter for financial documents
const financialFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'text/csv', 'application/json'];
  const allowedExtensions = ['.pdf', '.csv', '.json'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, CSV, and JSON files are allowed.'), false);
  }
};

// Upload middleware for financial documents
const uploadFinancial = multer({
  storage: financialStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) * 1024 * 1024 || 50 * 1024 * 1024, // 50MB default
    files: parseInt(process.env.MAX_FILES) || 10
  },
  fileFilter: financialFileFilter
});

// Storage for receipt images
const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/receipts');
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

// File filter for receipt images
const receiptFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Upload middleware for receipts
const uploadReceipt = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for images
    files: 5
  },
  fileFilter: receiptFileFilter
});

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum is ${process.env.MAX_FILES || 10} files.`
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

module.exports = {
  uploadFinancial,
  uploadReceipt,
  handleMulterError
};
