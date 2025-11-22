# CI/CD Deployment Pipeline - FinAnalyzer

## Overview
This document provides a comprehensive guide for implementing a Git-based CI/CD pipeline with a UI-driven deployment system similar to Azure DevOps, where you can trigger builds and deployments through the application interface.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Deployment Pipeline UI                      │
│  (React Component integrated in FinAnalyzer Admin Dashboard)    │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase Cloud Functions                      │
│  - Webhook Handler (GitHub/GitLab/Bitbucket)                   │
│  - Build Trigger Function                                       │
│  - Deployment Orchestrator                                      │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Build & Deploy Process                        │
│  1. Clone Repository                                            │
│  2. Install Dependencies                                        │
│  3. Run Build (npm run build)                                   │
│  4. Deploy to Firebase Hosting                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Guide

### Phase 1: Backend Setup (Firebase Cloud Functions)

#### 1.1 Create Deployment Functions

Create `functions/routes/deployment.js`:

```javascript
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateToken } = require('../middleware/auth');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const execAsync = promisify(exec);
const db = admin.firestore();

// Get all deployments
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, status, branch } = req.query;
    
    let query = db.collection('deployments')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit));
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (branch) {
      query = query.where('branch', '==', branch);
    }
    
    const snapshot = await query.get();
    const deployments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString()
    }));
    
    res.json({
      success: true,
      data: { deployments }
    });
  } catch (error) {
    console.error('Get deployments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployments',
      error: error.message
    });
  }
});

// Get deployment details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deploymentDoc = await db.collection('deployments').doc(id).get();
    
    if (!deploymentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Deployment not found'
      });
    }
    
    const deployment = {
      id: deploymentDoc.id,
      ...deploymentDoc.data(),
      createdAt: deploymentDoc.data().createdAt?.toDate().toISOString(),
      startedAt: deploymentDoc.data().startedAt?.toDate().toISOString(),
      completedAt: deploymentDoc.data().completedAt?.toDate().toISOString()
    };
    
    res.json({
      success: true,
      data: { deployment }
    });
  } catch (error) {
    console.error('Get deployment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deployment',
      error: error.message
    });
  }
});

// Get deployment logs (real-time)
router.get('/:id/logs', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const logsSnapshot = await db.collection('deployments')
      .doc(id)
      .collection('logs')
      .orderBy('timestamp', 'asc')
      .get();
    
    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toISOString()
    }));
    
    res.json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs',
      error: error.message
    });
  }
});

// Trigger new deployment
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { branch = 'dev', repository, commitMessage } = req.body;
    
    // Check if user is admin
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can trigger deployments'
      });
    }
    
    // Create deployment record
    const deploymentRef = db.collection('deployments').doc();
    const deploymentData = {
      id: deploymentRef.id,
      status: 'pending',
      branch,
      repository: repository || 'Hemakotibonthada/financialanalyzer',
      commitMessage: commitMessage || 'Manual deployment trigger',
      triggeredBy: userId,
      triggeredByEmail: req.user.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      buildLogs: [],
      environment: 'production'
    };
    
    await deploymentRef.set(deploymentData);
    
    // Trigger deployment asynchronously
    triggerDeploymentProcess(deploymentRef.id, branch, userId);
    
    res.json({
      success: true,
      message: 'Deployment triggered successfully',
      data: {
        deploymentId: deploymentRef.id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Trigger deployment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger deployment',
      error: error.message
    });
  }
});

// Cancel deployment
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    
    // Check if user is admin
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can cancel deployments'
      });
    }
    
    const deploymentRef = db.collection('deployments').doc(id);
    const deploymentDoc = await deploymentRef.get();
    
    if (!deploymentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Deployment not found'
      });
    }
    
    const deployment = deploymentDoc.data();
    
    if (deployment.status !== 'pending' && deployment.status !== 'building') {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel pending or building deployments'
      });
    }
    
    await deploymentRef.update({
      status: 'cancelled',
      cancelledBy: userId,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await addLog(id, 'info', `Deployment cancelled by ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Deployment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel deployment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel deployment',
      error: error.message
    });
  }
});

// Get deployment statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const deploymentsSnapshot = await db.collection('deployments')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(last30Days))
      .get();
    
    const deployments = deploymentsSnapshot.docs.map(doc => doc.data());
    
    const stats = {
      total: deployments.length,
      successful: deployments.filter(d => d.status === 'success').length,
      failed: deployments.filter(d => d.status === 'failed').length,
      cancelled: deployments.filter(d => d.status === 'cancelled').length,
      inProgress: deployments.filter(d => ['pending', 'building', 'deploying'].includes(d.status)).length,
      avgBuildTime: calculateAvgBuildTime(deployments),
      successRate: deployments.length > 0 
        ? ((deployments.filter(d => d.status === 'success').length / deployments.length) * 100).toFixed(2)
        : 0
    };
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Helper function to add log entry
async function addLog(deploymentId, level, message) {
  try {
    await db.collection('deployments')
      .doc(deploymentId)
      .collection('logs')
      .add({
        level,
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
  } catch (error) {
    console.error('Add log error:', error);
  }
}

// Deployment orchestrator function
async function triggerDeploymentProcess(deploymentId, branch, userId) {
  const deploymentRef = db.collection('deployments').doc(deploymentId);
  
  try {
    // Update status to building
    await deploymentRef.update({
      status: 'building',
      startedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await addLog(deploymentId, 'info', '🚀 Deployment started');
    await addLog(deploymentId, 'info', `Branch: ${branch}`);
    
    // Step 1: Clone repository
    await addLog(deploymentId, 'info', '📥 Cloning repository...');
    await deploymentRef.update({ currentStep: 'cloning' });
    
    const cloneResult = await executeGitClone(branch);
    await addLog(deploymentId, 'success', `✓ Repository cloned: ${cloneResult.commit}`);
    
    // Step 2: Install dependencies
    await addLog(deploymentId, 'info', '📦 Installing dependencies...');
    await deploymentRef.update({ currentStep: 'installing' });
    
    await executeNpmInstall(deploymentId);
    await addLog(deploymentId, 'success', '✓ Dependencies installed');
    
    // Step 3: Build frontend
    await addLog(deploymentId, 'info', '🔨 Building frontend...');
    await deploymentRef.update({ currentStep: 'building' });
    
    const buildResult = await executeBuild(deploymentId);
    await addLog(deploymentId, 'success', `✓ Build completed: ${buildResult.files} files generated`);
    
    // Step 4: Deploy to Firebase
    await addLog(deploymentId, 'info', '🚀 Deploying to Firebase...');
    await deploymentRef.update({ 
      status: 'deploying',
      currentStep: 'deploying'
    });
    
    const deployResult = await executeFirebaseDeploy(deploymentId);
    await addLog(deploymentId, 'success', `✓ Deployment successful`);
    await addLog(deploymentId, 'info', `🌐 Live at: ${deployResult.url}`);
    
    // Complete deployment
    await deploymentRef.update({
      status: 'success',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      deploymentUrl: deployResult.url,
      currentStep: 'completed'
    });
    
    await addLog(deploymentId, 'success', '✅ Deployment completed successfully!');
    
  } catch (error) {
    console.error('Deployment error:', error);
    
    await deploymentRef.update({
      status: 'failed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: error.message
    });
    
    await addLog(deploymentId, 'error', `❌ Deployment failed: ${error.message}`);
  }
}

// Execute git clone
async function executeGitClone(branch) {
  const tempDir = path.join('/tmp', `deployment-${Date.now()}`);
  
  const { stdout } = await execAsync(
    `git clone -b ${branch} https://github.com/Hemakotibonthada/financialanalyzer.git ${tempDir}`
  );
  
  const { stdout: commitHash } = await execAsync(
    `cd ${tempDir} && git rev-parse HEAD`
  );
  
  return {
    directory: tempDir,
    commit: commitHash.trim().substring(0, 7)
  };
}

// Execute npm install
async function executeNpmInstall(deploymentId) {
  await addLog(deploymentId, 'info', 'npm install started...');
  
  const { stdout, stderr } = await execAsync(
    'cd /tmp/deployment-* && cd frontend && npm install'
  );
  
  if (stderr) {
    await addLog(deploymentId, 'warning', stderr);
  }
  
  return stdout;
}

// Execute build
async function executeBuild(deploymentId) {
  await addLog(deploymentId, 'info', 'npm run build started...');
  
  const { stdout, stderr } = await execAsync(
    'cd /tmp/deployment-* && cd frontend && npm run build'
  );
  
  if (stderr) {
    await addLog(deploymentId, 'warning', stderr);
  }
  
  // Count files in dist
  const { stdout: fileCount } = await execAsync(
    'cd /tmp/deployment-* && cd frontend/dist && find . -type f | wc -l'
  );
  
  return {
    files: fileCount.trim()
  };
}

// Execute Firebase deploy
async function executeFirebaseDeploy(deploymentId) {
  await addLog(deploymentId, 'info', 'firebase deploy started...');
  
  const { stdout, stderr } = await execAsync(
    'cd /tmp/deployment-* && firebase deploy --only hosting,functions --token "$FIREBASE_TOKEN"'
  );
  
  if (stderr) {
    await addLog(deploymentId, 'warning', stderr);
  }
  
  await addLog(deploymentId, 'info', stdout);
  
  return {
    url: 'https://finserveassist.web.app'
  };
}

// Calculate average build time
function calculateAvgBuildTime(deployments) {
  const completedDeployments = deployments.filter(d => 
    d.startedAt && d.completedAt && d.status === 'success'
  );
  
  if (completedDeployments.length === 0) return 0;
  
  const totalTime = completedDeployments.reduce((sum, d) => {
    const start = d.startedAt.toDate();
    const end = d.completedAt.toDate();
    return sum + (end - start);
  }, 0);
  
  return Math.round(totalTime / completedDeployments.length / 1000); // seconds
}

module.exports = router;
```

#### 1.2 Update `functions/index.js`

```javascript
const deploymentRoutes = require('./routes/deployment');
app.use('/deployment', deploymentRoutes);
```

---

### Phase 2: Frontend Implementation

#### 2.1 Create Deployment Pipeline UI Component

Create `frontend/src/pages/DeploymentPipeline.jsx`:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  GitBranch, Play, X, Clock, CheckCircle, XCircle, 
  AlertCircle, RefreshCw, Terminal, Package, Rocket,
  TrendingUp, Activity
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';

const DeploymentPipeline = () => {
  const [deployments, setDeployments] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [branch, setBranch] = useState('dev');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logsEndRef = useRef(null);

  useEffect(() => {
    fetchDeployments();
    fetchStats();
    
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchDeployments();
        if (selectedDeployment) {
          fetchLogs(selectedDeployment.id);
        }
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedDeployment]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const fetchDeployments = async () => {
    try {
      const response = await api.get('/deployment/history?limit=50');
      setDeployments(response.data.data.deployments);
    } catch (error) {
      console.error('Error fetching deployments:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/deployment/stats/overview');
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLogs = async (deploymentId) => {
    try {
      const response = await api.get(`/deployment/${deploymentId}/logs`);
      setLogs(response.data.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleTriggerDeployment = async () => {
    if (!window.confirm(`Trigger deployment from branch: ${branch}?`)) return;

    setLoading(true);
    try {
      const response = await api.post('/deployment/trigger', {
        branch,
        commitMessage: 'Manual deployment from UI'
      });

      toast.success('Deployment triggered successfully');
      
      // Auto-select the new deployment
      const newDeploymentId = response.data.data.deploymentId;
      setTimeout(() => {
        fetchDeployments();
        const newDeployment = deployments.find(d => d.id === newDeploymentId);
        if (newDeployment) {
          setSelectedDeployment(newDeployment);
          fetchLogs(newDeploymentId);
        }
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to trigger deployment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeployment = async (deploymentId) => {
    if (!window.confirm('Cancel this deployment?')) return;

    try {
      await api.post(`/deployment/${deploymentId}/cancel`);
      toast.success('Deployment cancelled');
      fetchDeployments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel deployment');
    }
  };

  const handleSelectDeployment = (deployment) => {
    setSelectedDeployment(deployment);
    fetchLogs(deployment.id);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      case 'building':
      case 'deploying': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'failed': return <XCircle className="w-5 h-5" />;
      case 'cancelled': return <X className="w-5 h-5" />;
      case 'building':
      case 'deploying': return <RefreshCw className="w-5 h-5 animate-spin" />;
      case 'pending': return <Clock className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Rocket className="w-8 h-8 text-indigo-600" />
          CI/CD Deployment Pipeline
        </h1>
        <p className="text-gray-600 mt-2">
          Build, deploy, and monitor your application deployments
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Deployments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Activity className="w-8 h-8 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Build Time</p>
                <p className="text-2xl font-bold text-blue-600">{stats.avgBuildTime}s</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      {/* Trigger Deployment Section */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Trigger New Deployment</h2>
        
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <GitBranch className="w-4 h-4 inline mr-2" />
              Branch
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="main">main</option>
              <option value="dev">dev</option>
              <option value="staging">staging</option>
            </select>
          </div>

          <button
            onClick={handleTriggerDeployment}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            Deploy
          </button>

          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
        </div>
      </div>

      {/* Deployments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployments List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Recent Deployments</h2>
          </div>
          
          <div className="overflow-y-auto max-h-[600px]">
            {deployments.map((deployment) => (
              <div
                key={deployment.id}
                onClick={() => handleSelectDeployment(deployment)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedDeployment?.id === deployment.id ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${getStatusColor(deployment.status)}`}>
                      {getStatusIcon(deployment.status)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {deployment.branch}
                    </span>
                  </div>
                  
                  {['pending', 'building', 'deploying'].includes(deployment.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelDeployment(deployment.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-600 mb-1">
                  {deployment.commitMessage}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{deployment.triggeredByEmail?.split('@')[0]}</span>
                  <span>{new Date(deployment.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment Details & Logs */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          {selectedDeployment ? (
            <>
              {/* Deployment Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Deployment Details
                  </h2>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(selectedDeployment.status)}`}>
                    {getStatusIcon(selectedDeployment.status)}
                    {selectedDeployment.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Branch</p>
                    <p className="font-medium text-gray-900">{selectedDeployment.branch}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Triggered By</p>
                    <p className="font-medium text-gray-900">{selectedDeployment.triggeredByEmail}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Started</p>
                    <p className="font-medium text-gray-900">
                      {selectedDeployment.startedAt 
                        ? new Date(selectedDeployment.startedAt).toLocaleString()
                        : 'Not started'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Duration</p>
                    <p className="font-medium text-gray-900">
                      {selectedDeployment.completedAt && selectedDeployment.startedAt
                        ? `${Math.round((new Date(selectedDeployment.completedAt) - new Date(selectedDeployment.startedAt)) / 1000)}s`
                        : 'In progress...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Logs Terminal */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Build & Deploy Logs</h3>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 h-[450px] overflow-y-auto font-mono text-sm">
                  {logs.length > 0 ? (
                    logs.map((log, index) => (
                      <div key={index} className="flex gap-3 mb-1">
                        <span className="text-gray-500 text-xs">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={getLogLevelColor(log.level)}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      No logs available yet...
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 py-20">
              <div className="text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>Select a deployment to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeploymentPipeline;
```

#### 2.2 Add Route to App.jsx

```jsx
import DeploymentPipeline from './pages/DeploymentPipeline';

// In your routes
<Route path="/pipeline" element={<DeploymentPipeline />} />
```

#### 2.3 Add to Sidebar Navigation

In `frontend/src/components/Sidebar.jsx`:

```jsx
{
  icon: Rocket,
  label: 'Pipeline',
  path: '/pipeline',
  badge: 'Admin'
}
```

---

### Phase 3: GitHub Webhook Setup (Optional)

Create `functions/webhooks/github.js`:

```javascript
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

router.post('/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  
  // Verify webhook signature
  const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  if (signature !== digest) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = req.headers['x-github-event'];
  
  if (event === 'push') {
    const branch = req.body.ref.split('/').pop();
    
    // Auto-trigger deployment for specific branches
    if (['main', 'dev'].includes(branch)) {
      // Trigger deployment
      console.log(`Auto-deploying branch: ${branch}`);
    }
  }
  
  res.json({ received: true });
});

module.exports = router;
```

---

## Environment Variables

Add to `.env`:

```
FIREBASE_TOKEN=your_firebase_ci_token
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

---

## Security Considerations

1. **Role-Based Access**: Only admin users can trigger deployments
2. **Webhook Verification**: Verify GitHub webhook signatures
3. **Secure Tokens**: Store Firebase and GitHub tokens securely
4. **Rate Limiting**: Implement rate limiting on deployment triggers
5. **Audit Logs**: All deployments are logged with user information

---

## Features Implemented

- ✅ Real-time deployment logs
- ✅ Build progress tracking
- ✅ Deployment history
- ✅ Success/failure statistics
- ✅ Branch selection
- ✅ Cancel in-progress deployments
- ✅ Auto-refresh for live updates
- ✅ Terminal-style log display
- ✅ Deployment metrics (avg time, success rate)
- ✅ Manual deployment triggers

---

## Next Steps

1. Deploy the updated functions
2. Add route to sidebar
3. Test deployment trigger
4. Configure GitHub webhooks (optional)
5. Set up environment variables
6. Add email notifications for deployment status

---

## Testing

```bash
# Test deployment trigger
curl -X POST https://your-domain.com/api/deployment/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"branch": "dev"}'
```

---

This implementation provides a complete Azure DevOps-style CI/CD pipeline with real-time logs, deployment tracking, and a professional UI! 🚀
