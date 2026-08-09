const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/adminAuth');
const User = require('../models/User');
const Document = require('../models/Document');
const Transaction = require('../models/Transaction');
const Analysis = require('../models/Analysis');
const FinancialProfile = require('../models/FinancialProfile');
const EMI = require('../models/EMI');
const BillReminder = require('../models/BillReminder');
const EmailLog = require('../models/EmailLog');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Apply authentication and admin check to all routes
router.use(authenticate);
router.use(isAdmin);

/**
 * @route GET /api/admin/dashboard/stats
 * @desc Get comprehensive system statistics
 * @access Admin
 */router.get('/dashboard/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalDocuments,
      totalTransactions,
      totalAnalyses,
      recentUsers,
      documentsByType,
      transactionVolume
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Document.countDocuments(),
      Transaction.countDocuments(),
      Analysis.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).select('-password'),
      Document.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            totalDebit: {
              $sum: { $cond: [{ $eq: ['$type', 'debit'] }, { $abs: '$amount' }, 0] }
            },
            totalCredit: {
              $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] }
            },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // System stats
    const systemStats = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: os.platform(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
    };

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          recent: recentUsers
        },
        documents: {
          total: totalDocuments,
          byType: documentsByType
        },
        transactions: {
          total: totalTransactions,
          volume: transactionVolume[0] || { totalDebit: 0, totalCredit: 0, count: 0 }
        },
        analyses: {
          total: totalAnalyses
        },
        system: systemStats
      }
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics'
    });
  }
});

/**
 * @route GET /api/admin/users
 * @desc Get all users with pagination and filters
 * @access Admin
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all', role = 'all' } = req.query;
    
    const query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Status filter
    if (status !== 'all') {
      query.isActive = status === 'active';
    }
    
    // Role filter
    if (role !== 'all') {
      query.role = role;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);
    
    // Get document and transaction counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [documentCount, transactionCount] = await Promise.all([
          Document.countDocuments({ userId: user._id }),
          Transaction.countDocuments({ userId: user._id })
        ]);
        
        return {
          ...user,
          stats: {
            documents: documentCount,
            transactions: transactionCount
          }
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

/**
 * @route GET /api/admin/users/segmentation
 * @desc Get users segmented by income, transaction volume, spending patterns
 * @access Admin
 */
router.get('/users/segmentation', async (req, res) => {
  try {
    const { 
      segment = 'all',
      minIncome,
      maxIncome,
      minTransactions,
      maxTransactions,
      minSpending,
      maxSpending,
      sortBy = 'income',
      order = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    const skip = (page - 1) * limit;

    // Get all users with their financial profiles and transaction data
    const pipeline = [
      {
        $lookup: {
          from: 'financialprofiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'userId',
          as: 'transactions'
        }
      },
      {
        $addFields: {
          monthlyIncome: { $ifNull: ['$profile.monthlyIncome', 0] },
          transactionCount: { $size: '$transactions' },
          totalSpending: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$transactions',
                    as: 'txn',
                    cond: { $eq: ['$$txn.type', 'debit'] }
                  }
                },
                as: 'debit',
                in: { $abs: '$$debit.amount' }
              }
            }
          },
          totalIncome: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$transactions',
                    as: 'txn',
                    cond: { $eq: ['$$txn.type', 'credit'] }
                  }
                },
                as: 'credit',
                in: '$$credit.amount'
              }
            }
          },
          creditScore: { $ifNull: ['$profile.creditScore.score', 0] },
          averageMonthlySpending: { $ifNull: ['$profile.statistics.averageMonthlySpending', 0] }
        }
      },
      {
        $project: {
          password: 0,
          transactions: 0,
          'profile.gmailSettings.accessToken': 0,
          'profile.gmailSettings.refreshToken': 0,
          'profile.preferences.openAIKey': 0
        }
      }
    ];

    // Apply segmentation filters
    const matchConditions = [];

    // Income-based filtering
    if (minIncome || maxIncome) {
      const incomeFilter = {};
      if (minIncome) incomeFilter.$gte = parseFloat(minIncome);
      if (maxIncome) incomeFilter.$lte = parseFloat(maxIncome);
      matchConditions.push({ monthlyIncome: incomeFilter });
    }

    // Transaction count filtering
    if (minTransactions || maxTransactions) {
      const txnFilter = {};
      if (minTransactions) txnFilter.$gte = parseInt(minTransactions);
      if (maxTransactions) txnFilter.$lte = parseInt(maxTransactions);
      matchConditions.push({ transactionCount: txnFilter });
    }

    // Spending filtering
    if (minSpending || maxSpending) {
      const spendingFilter = {};
      if (minSpending) spendingFilter.$gte = parseFloat(minSpending);
      if (maxSpending) spendingFilter.$lte = parseFloat(maxSpending);
      matchConditions.push({ totalSpending: spendingFilter });
    }

    // Predefined segments
    if (segment === 'high-income') {
      matchConditions.push({ monthlyIncome: { $gte: 100000 } });
    } else if (segment === 'medium-income') {
      matchConditions.push({ monthlyIncome: { $gte: 50000, $lt: 100000 } });
    } else if (segment === 'low-income') {
      matchConditions.push({ monthlyIncome: { $gt: 0, $lt: 50000 } });
    } else if (segment === 'no-income') {
      matchConditions.push({ monthlyIncome: { $eq: 0 } });
    } else if (segment === 'high-spenders') {
      matchConditions.push({ totalSpending: { $gte: 50000 } });
    } else if (segment === 'active-users') {
      matchConditions.push({ transactionCount: { $gte: 10 } });
    } else if (segment === 'inactive-users') {
      matchConditions.push({ transactionCount: { $lt: 5 } });
    }

    if (matchConditions.length > 0) {
      pipeline.push({ $match: { $and: matchConditions } });
    }

    // Sorting
    const sortField = {
      income: 'monthlyIncome',
      transactions: 'transactionCount',
      spending: 'totalSpending',
      credit: 'creditScore',
      name: 'name',
      email: 'email',
      date: 'createdAt'
    }[sortBy] || 'monthlyIncome';

    const sortOrder = order === 'asc' ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortOrder } });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const [countResult] = await User.aggregate(countPipeline);
    const total = countResult?.total || 0;

    // Apply pagination
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    const users = await User.aggregate(pipeline);

    // Calculate segment statistics
    const segmentStats = await User.aggregate([
      ...pipeline.slice(0, 4), // Use base pipeline without filters
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalIncome: { $sum: '$monthlyIncome' },
          averageIncome: { $avg: '$monthlyIncome' },
          totalTransactions: { $sum: '$transactionCount' },
          averageTransactions: { $avg: '$transactionCount' },
          totalSpending: { $sum: '$totalSpending' },
          averageSpending: { $avg: '$totalSpending' },
          highIncomeUsers: {
            $sum: { $cond: [{ $gte: ['$monthlyIncome', 100000] }, 1, 0] }
          },
          mediumIncomeUsers: {
            $sum: { $cond: [{ $and: [{ $gte: ['$monthlyIncome', 50000] }, { $lt: ['$monthlyIncome', 100000] }] }, 1, 0] }
          },
          lowIncomeUsers: {
            $sum: { $cond: [{ $and: [{ $gt: ['$monthlyIncome', 0] }, { $lt: ['$monthlyIncome', 50000] }] }, 1, 0] }
          },
          noIncomeUsers: {
            $sum: { $cond: [{ $eq: ['$monthlyIncome', 0] }, 1, 0] }
          },
          activeUsers: {
            $sum: { $cond: [{ $gte: ['$transactionCount', 10] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $lt: ['$transactionCount', 5] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          limit: parseInt(limit)
        },
        segmentStats: segmentStats[0] || {},
        filters: {
          segment,
          minIncome,
          maxIncome,
          minTransactions,
          maxTransactions,
          minSpending,
          maxSpending,
          sortBy,
          order
        }
      }
    });
  } catch (error) {
    logger.error('User segmentation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user segmentation'
    });
  }
});

/**
 * @route PUT /api/admin/users/:id
 * @desc Update user details or status
 * @access Admin
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // If role changed to 'lender', automatically create a Lender record
    if (role === 'lender') {
      const Lender = require('../models/Lender');
      
      // Check if lender already exists
      const existingLender = await Lender.findOne({ userId: user._id });
      
      if (!existingLender) {
        const newLender = await Lender.create({
          userId: user._id,
          lenderName: user.name,
          contactEmail: user.email,
          contactPhone: user.phoneNumber || '',
          lenderType: 'Individual',
          status: 'Active'
        });
        
        logger.info(`Auto-created lender profile ${newLender._id} for user ${user._id}`);
      }
    }
    
    logger.info(`Admin ${req.user._id} updated user ${id}`);
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Admin update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

/**
 * @route DELETE /api/admin/users/:id
 * @desc Delete user and all associated data
 * @access Admin
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get all documents to delete files
    const documents = await Document.find({ userId: id });
    
    // Delete files from filesystem
    for (const doc of documents) {
      try {
        await fs.unlink(doc.filePath);
      } catch (fileError) {
        logger.warn(`Could not delete file ${doc.filePath}:`, fileError);
      }
    }
    
    // Delete all user data
    await Promise.all([
      Document.deleteMany({ userId: id }),
      Transaction.deleteMany({ userId: id }),
      Analysis.deleteMany({ userId: id }),
      FinancialProfile.deleteMany({ userId: id }),
      EMI.deleteMany({ userId: id }),
      BillReminder.deleteMany({ userId: id }),
      User.findByIdAndDelete(id)
    ]);
    
    logger.info(`Admin ${req.user._id} deleted user ${id} and all associated data`);
    
    res.json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    logger.error('Admin delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

/**
 * @route POST /api/admin/users/:id/toggle-status
 * @desc Toggle user active status
 * @access Admin
 */
router.post('/users/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    logger.info(`Admin ${req.user._id} toggled user ${id} status to ${user.isActive}`);
    
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    logger.error('Admin toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status'
    });
  }
});

/**
 * @route GET /api/admin/documents
 * @desc Get all documents across all users
 * @access Admin
 */
router.get('/documents', async (req, res) => {
  try {
    const { page = 1, limit = 50, status = 'all', type = 'all' } = req.query;
    
    const query = {};
    if (status !== 'all') query.status = status;
    if (type !== 'all') query.type = type;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Document.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Admin get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
});

/**
 * @route GET /api/admin/system/health
 * @desc Get system health metrics
 * @access Admin
 */
router.get('/system/health', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Database health check
    const dbHealth = {
      connected: require('mongoose').connection.readyState === 1,
      collections: await require('mongoose').connection.db.listCollections().toArray()
    };
    
    // Disk space check (for uploads directory)
    const uploadsDir = path.join(__dirname, '../uploads');
    let diskSpace = null;
    try {
      const stats = await fs.stat(uploadsDir);
      diskSpace = { exists: true, stats };
    } catch (err) {
      diskSpace = { exists: false };
    }
    
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: {
        total: memUsage.heapTotal,
        used: memUsage.heapUsed,
        external: memUsage.external,
        rss: memUsage.rss,
        percentage: (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2)
      },
      cpu: cpuUsage,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg()
      },
      database: dbHealth,
      storage: diskSpace
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('System health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check system health'
    });
  }
});

/**
 * @route POST /api/admin/system/cleanup
 * @desc Clean up orphaned files and invalid data
 * @access Admin
 */
router.post('/system/cleanup', async (req, res) => {
  try {
    const results = {
      orphanedFiles: 0,
      invalidDocuments: 0,
      orphanedTransactions: 0
    };
    
    // Find documents with missing files
    const documents = await Document.find();
    for (const doc of documents) {
      try {
        await fs.access(doc.filePath);
      } catch (err) {
        // File doesn't exist, delete document record
        await Document.findByIdAndDelete(doc._id);
        results.invalidDocuments++;
      }
    }
    
    // Find transactions without valid users
    const transactions = await Transaction.find();
    const userIds = await User.find().distinct('_id');
    const userIdStrings = userIds.map(id => id.toString());
    
    for (const transaction of transactions) {
      if (!userIdStrings.includes(transaction.userId.toString())) {
        await Transaction.findByIdAndDelete(transaction._id);
        results.orphanedTransactions++;
      }
    }
    
    logger.info(`Admin ${req.user._id} performed system cleanup: ${JSON.stringify(results)}`);
    
    res.json({
      success: true,
      message: 'System cleanup completed',
      data: results
    });
  } catch (error) {
    logger.error('System cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform system cleanup'
    });
  }
});

/**
 * @route GET /api/admin/analytics/overview
 * @desc Get analytics overview for all users
 * @access Admin
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const [
      userGrowth,
      documentUploads,
      transactionTrends,
      topUsers
    ] = await Promise.all([
      // User growth over time
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      
      // Document uploads over time
      Document.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      
      // Transaction trends
      Transaction.aggregate([
        { $match: { date: { $gte: startDate } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              type: '$type'
            },
            count: { $sum: 1 },
            amount: { $sum: { $abs: '$amount' } }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      
      // Top users by transaction volume
      Transaction.aggregate([
        {
          $group: {
            _id: '$userId',
            transactionCount: { $sum: 1 },
            totalVolume: { $sum: { $abs: '$amount' } }
          }
        },
        { $sort: { totalVolume: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        userGrowth,
        documentUploads,
        transactionTrends,
        topUsers
      }
    });
  } catch (error) {
    logger.error('Admin analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview'
    });
  }
});

/**
 * @route POST /api/admin/broadcast
 * @desc Broadcast message to all users (future implementation for notifications)
 * @access Admin
 */
router.post('/broadcast', async (req, res) => {
  try {
    const { message, type = 'info' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    // For now, just log the broadcast
    // In future, integrate with notification system
    logger.info(`Admin ${req.user._id} broadcast message: ${message}`);
    
    res.json({
      success: true,
      message: 'Broadcast message logged (notification system not yet implemented)',
      data: {
        message,
        type,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Admin broadcast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast message'
    });
  }
});

/**
 * @route GET /api/admin/logs
 * @desc Get system logs (if available)
 * @access Admin
 */
router.get('/logs', async (req, res) => {
  try {
    const { lines = 100 } = req.query;
    
    // Try to read log file if it exists
    const logPath = path.join(__dirname, '../logs/combined.log');
    
    try {
      const logContent = await fs.readFile(logPath, 'utf-8');
      const logLines = logContent.split('\n').slice(-parseInt(lines));
      
      res.json({
        success: true,
        data: {
          logs: logLines,
          count: logLines.length
        }
      });
    } catch (fileError) {
      res.json({
        success: true,
        message: 'Log file not found or not accessible',
        data: {
          logs: [],
          count: 0
        }
      });
    }
  } catch (error) {
    logger.error('Admin get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs'
    });
  }
});

/**
 * @route GET /api/admin/reports/:type
 * @desc Generate and download reports
 * @access Admin
 */
router.get('/reports/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    let data;
    let filename;
    let headers;

    switch (type) {
      case 'users':
        data = await User.find()
          .select('name email role isActive createdAt lastLogin')
          .lean();
        filename = 'users_report.csv';
        headers = ['Name', 'Email', 'Role', 'Status', 'Joined Date', 'Last Login'];
        break;

      case 'transactions':
        data = await Transaction.find()
          .populate('userId', 'name email')
          .select('userId amount category type date description')
          .lean();
        filename = 'transactions_report.csv';
        headers = ['User', 'Email', 'Amount', 'Category', 'Type', 'Date', 'Description'];
        break;

      case 'documents':
        data = await Document.find()
          .populate('userId', 'name email')
          .select('userId documentType fileName uploadDate status transactionCount')
          .lean();
        filename = 'documents_report.csv';
        headers = ['User', 'Email', 'Type', 'Filename', 'Upload Date', 'Status', 'Transactions'];
        break;

      case 'lenders':
        data = await mongoose.connection.db.collection('lenders').find().toArray();
        filename = 'lenders_report.csv';
        headers = ['Lender Name', 'Type', 'Total Loans', 'Active Loans', 'Total Disbursed', 'Status'];
        break;

      case 'financial-summary':
        const users = await User.find().select('name email').lean();
        const summaryData = await Promise.all(users.map(async (user) => {
          const transactions = await Transaction.find({ userId: user._id });
          const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
          const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
          return {
            name: user.name,
            email: user.email,
            income,
            expenses,
            balance: income - expenses,
            transactionCount: transactions.length
          };
        }));
        data = summaryData;
        filename = 'financial_summary.csv';
        headers = ['Name', 'Email', 'Total Income', 'Total Expenses', 'Balance', 'Transactions'];
        break;

      case 'activity':
        // Simulated activity log (you can enhance this with actual activity tracking)
        data = await User.find()
          .select('name email lastLogin createdAt isActive')
          .lean();
        filename = 'activity_report.csv';
        headers = ['User', 'Email', 'Last Login', 'Joined Date', 'Status'];
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    // Convert data to CSV
    let csv = headers.join(',') + '\n';
    
    data.forEach(item => {
      let row;
      switch (type) {
        case 'users':
          row = [
            item.name,
            item.email,
            item.role,
            item.isActive ? 'Active' : 'Inactive',
            new Date(item.createdAt).toLocaleDateString(),
            item.lastLogin ? new Date(item.lastLogin).toLocaleDateString() : 'Never'
          ];
          break;
        case 'transactions':
          row = [
            item.userId?.name || 'Unknown',
            item.userId?.email || 'Unknown',
            item.amount,
            item.category,
            item.type,
            new Date(item.date).toLocaleDateString(),
            item.description || ''
          ];
          break;
        case 'documents':
          row = [
            item.userId?.name || 'Unknown',
            item.userId?.email || 'Unknown',
            item.documentType,
            item.fileName,
            new Date(item.uploadDate).toLocaleDateString(),
            item.status,
            item.transactionCount || 0
          ];
          break;
        case 'lenders':
          row = [
            item.lenderName,
            item.lenderType,
            item.totalLoans || 0,
            item.activeLoans || 0,
            item.totalDisbursed || 0,
            item.status
          ];
          break;
        case 'financial-summary':
          row = [
            item.name,
            item.email,
            item.income,
            item.expenses,
            item.balance,
            item.transactionCount
          ];
          break;
        case 'activity':
          row = [
            item.name,
            item.email,
            item.lastLogin ? new Date(item.lastLogin).toLocaleDateString() : 'Never',
            new Date(item.createdAt).toLocaleDateString(),
            item.isActive ? 'Active' : 'Inactive'
          ];
          break;
      }
      csv += row.map(field => `"${field}"`).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

    logger.info(`Admin ${req.user._id} generated ${type} report`);
  } catch (error) {
    logger.error('Admin generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

/**
 * @route POST /api/admin/users/bulk-action
 * @desc Perform bulk actions on multiple users
 * @access Admin
 */
router.post('/users/bulk-action', async (req, res) => {
  try {
    const { action, userIds } = req.body;
    
    if (!action || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action or user IDs'
      });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: true }
        );
        break;
      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: false }
        );
        break;
      case 'delete':
        result = await User.deleteMany({ _id: { $in: userIds } });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    logger.info(`Admin ${req.user._id} performed bulk ${action} on ${userIds.length} users`);

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      data: result
    });
  } catch (error) {
    logger.error('Admin bulk action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action'
    });
  }
});

/**
 * @route GET /api/admin/email/status
 * @desc SMTP configuration and a live connection test
 * @access Admin
 *
 * Exists because email failures were previously invisible. A misconfigured
 * relay produced a warning in a log file and nothing else, so "no OTP arrived"
 * had no diagnosable cause from the console.
 */
router.get('/email/status', async (req, res) => {
  try {
    const status = emailService.getStatus();
    const connection = status.configured
      ? await emailService.verifyConnection()
      : { ok: false, error: 'SMTP credentials are not configured' };

    // Translate the common SMTP rejections into something actionable rather
    // than surfacing a raw provider code.
    let hint = null;
    if (!status.configured) {
      hint = 'Set SMTP_USER and SMTP_PASS (or EMAIL_USER and EMAIL_PASSWORD) in the backend environment.';
    } else if (!connection.ok && /BadCredentials|535|Username and Password not accepted/i.test(connection.error || '')) {
      hint = 'The mail server rejected the credentials. Gmail requires a 16-character App Password when 2-Step Verification is enabled - a normal account password will always be refused.';
    } else if (!connection.ok && /self.signed|certificate/i.test(connection.error || '')) {
      hint = 'TLS negotiation failed. Check EMAIL_PORT/EMAIL_SECURE (587 with secure=false, or 465 with secure=true).';
    }

    // A From address on a different domain to the authenticated account is
    // rewritten or rejected by most relays, Gmail included.
    let fromWarning = null;
    const fromMatch = /<([^>]+)>/.exec(status.from || '');
    const fromAddr = fromMatch ? fromMatch[1] : status.from;
    if (status.configured && fromAddr && status.user) {
      const fromDomain = String(fromAddr).split('@')[1];
      const userDomain = String(status.user).split('@')[1];
      if (fromDomain && userDomain && fromDomain !== userDomain) {
        fromWarning = `EMAIL_FROM (@${fromDomain}) is on a different domain to the SMTP account (@${userDomain}). Most providers rewrite or reject this. Use the authenticated address or a verified alias.`;
      }
    }

    res.json({
      success: true,
      data: { ...status, connection, hint, fromWarning }
    });
  } catch (error) {
    logger.error('Email status error:', error);
    res.status(500).json({ success: false, message: 'Failed to read email status', error: error.message });
  }
});

/**
 * @route GET /api/admin/email/logs
 * @desc Paginated outbound email log
 * @access Admin
 */
router.get('/email/logs', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
    const { status, template, search } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (template) filter.template = template;
    if (search) {
      filter.$or = [
        { to: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      EmailLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EmailLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    logger.error('Email logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email logs', error: error.message });
  }
});

/**
 * @route GET /api/admin/email/summary
 * @desc Sent / skipped / failed counts over a window
 * @access Admin
 */
router.get('/email/summary', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
    const summary = await EmailLog.getSummary(days);
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Email summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email summary', error: error.message });
  }
});

/**
 * @route POST /api/admin/email/test
 * @desc Send a test email and report exactly what the relay said
 * @access Admin
 */
router.post('/email/test', async (req, res) => {
  try {
    const to = req.body.to || req.user.email;
    if (!to) {
      return res.status(400).json({ success: false, message: 'A recipient address is required' });
    }

    const result = await emailService.sendMail({
      to,
      subject: 'Financial Analyzer test email',
      text: 'This is a test email. If you received it, outbound mail is working.',
      html: '<p>This is a test email. If you received it, outbound mail is working.</p>',
      template: 'admin_test',
      userId: req.user._id
    });

    res.json({
      success: true,
      data: result,
      message: result.delivered
        ? `Test email accepted by the relay for ${to}`
        : `Not delivered: ${result.error || result.reason}`
    });
  } catch (error) {
    logger.error('Email test error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email', error: error.message });
  }
});

module.exports = router;

