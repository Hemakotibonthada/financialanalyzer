// ============================================================================
// CLUSTERING & DIMENSIONALITY REDUCTION — From-Scratch Implementation
// ============================================================================
// K-Means, DBSCAN, Hierarchical Clustering, PCA, t-SNE for financial data
// analysis: customer segmentation, spending pattern discovery, anomaly
// grouping, and feature reduction.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');

// ============================================================================
// §0  UTILITIES
// ============================================================================

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function manhattanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum;
}

function cosineDistance(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; magA += a[i] ** 2; magB += b[i] ** 2;
  }
  const sim = magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
  return 1 - sim;
}

function standardize(data) {
  const numFeatures = data[0].length;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(0);

  for (const row of data) {
    for (let j = 0; j < numFeatures; j++) means[j] += row[j];
  }
  means.forEach((_, j) => { means[j] /= data.length; });

  for (const row of data) {
    for (let j = 0; j < numFeatures; j++) stds[j] += (row[j] - means[j]) ** 2;
  }
  stds.forEach((_, j) => { stds[j] = Math.sqrt(stds[j] / data.length) || 1; });

  const normalized = data.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
  return { data: normalized, means, stds };
}

function silhouetteScore(data, labels, distanceFn = euclideanDistance) {
  const n = data.length;
  if (n < 2) return 0;

  const uniqueLabels = [...new Set(labels)].filter(l => l >= 0);
  if (uniqueLabels.length < 2) return 0;

  let totalScore = 0;
  let validPoints = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] < 0) continue; // Skip noise points

    const cluster = labels[i];
    let sameCluster = [];
    const otherClusters = {};

    for (let j = 0; j < n; j++) {
      if (i === j || labels[j] < 0) continue;
      const dist = distanceFn(data[i], data[j]);
      if (labels[j] === cluster) {
        sameCluster.push(dist);
      } else {
        if (!otherClusters[labels[j]]) otherClusters[labels[j]] = [];
        otherClusters[labels[j]].push(dist);
      }
    }

    const a = sameCluster.length > 0 ? sameCluster.reduce((s, d) => s + d, 0) / sameCluster.length : 0;
    let b = Infinity;
    for (const dists of Object.values(otherClusters)) {
      const avgDist = dists.reduce((s, d) => s + d, 0) / dists.length;
      if (avgDist < b) b = avgDist;
    }

    if (b === Infinity) continue;
    const s = (b - a) / Math.max(a, b);
    totalScore += s;
    validPoints++;
  }

  return validPoints > 0 ? totalScore / validPoints : 0;
}

// ============================================================================
// §1  K-MEANS CLUSTERING
// ============================================================================

class KMeans {
  constructor(config = {}) {
    this.k = config.k || 5;
    this.maxIter = config.maxIter || 300;
    this.tolerance = config.tolerance || 1e-6;
    this.nInit = config.nInit || 10; // Number of initializations
    this.distanceFn = config.distance === 'manhattan' ? manhattanDistance
      : config.distance === 'cosine' ? cosineDistance
      : euclideanDistance;
    this.centroids = null;
    this.labels = null;
    this.inertia = null;
    this.iterations = 0;
  }

  // K-Means++ initialization
  _initCentroidspp(data) {
    const centroids = [data[Math.floor(Math.random() * data.length)].slice()];

    for (let c = 1; c < this.k; c++) {
      const distances = data.map(point => {
        let minDist = Infinity;
        for (const centroid of centroids) {
          const d = this.distanceFn(point, centroid);
          if (d < minDist) minDist = d;
        }
        return minDist ** 2;
      });

      const totalDist = distances.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalDist;
      let idx = 0;
      for (let i = 0; i < distances.length; i++) {
        random -= distances[i];
        if (random <= 0) { idx = i; break; }
      }
      centroids.push(data[idx].slice());
    }

    return centroids;
  }

  _assignClusters(data, centroids) {
    const labels = new Array(data.length);
    let inertia = 0;

    for (let i = 0; i < data.length; i++) {
      let minDist = Infinity;
      let minCluster = 0;

      for (let c = 0; c < centroids.length; c++) {
        const dist = this.distanceFn(data[i], centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          minCluster = c;
        }
      }

      labels[i] = minCluster;
      inertia += minDist ** 2;
    }

    return { labels, inertia };
  }

  _updateCentroids(data, labels, numFeatures) {
    const centroids = Array.from({ length: this.k }, () => new Array(numFeatures).fill(0));
    const counts = new Array(this.k).fill(0);

    for (let i = 0; i < data.length; i++) {
      const cluster = labels[i];
      counts[cluster]++;
      for (let j = 0; j < numFeatures; j++) {
        centroids[cluster][j] += data[i][j];
      }
    }

    for (let c = 0; c < this.k; c++) {
      if (counts[c] > 0) {
        for (let j = 0; j < numFeatures; j++) {
          centroids[c][j] /= counts[c];
        }
      }
    }

    return centroids;
  }

  train(data) {
    if (data.length < this.k) {
      throw new Error(`Cannot create ${this.k} clusters from ${data.length} data points`);
    }

    const numFeatures = data[0].length;
    let bestCentroids = null;
    let bestLabels = null;
    let bestInertia = Infinity;

    for (let init = 0; init < this.nInit; init++) {
      let centroids = this._initCentroidspp(data);
      let labels = null;
      let inertia = Infinity;

      for (let iter = 0; iter < this.maxIter; iter++) {
        const result = this._assignClusters(data, centroids);
        labels = result.labels;
        const newInertia = result.inertia;

        const newCentroids = this._updateCentroids(data, labels, numFeatures);

        // Check convergence
        let maxShift = 0;
        for (let c = 0; c < this.k; c++) {
          const shift = this.distanceFn(centroids[c], newCentroids[c]);
          if (shift > maxShift) maxShift = shift;
        }

        centroids = newCentroids;
        inertia = newInertia;

        if (maxShift < this.tolerance) {
          this.iterations = iter + 1;
          break;
        }
      }

      if (inertia < bestInertia) {
        bestInertia = inertia;
        bestCentroids = centroids;
        bestLabels = labels;
      }
    }

    this.centroids = bestCentroids;
    this.labels = bestLabels;
    this.inertia = bestInertia;

    return this;
  }

  predict(point) {
    if (!this.centroids) return -1;
    let minDist = Infinity, minCluster = 0;
    for (let c = 0; c < this.centroids.length; c++) {
      const dist = this.distanceFn(point, this.centroids[c]);
      if (dist < minDist) { minDist = dist; minCluster = c; }
    }
    return minCluster;
  }

  getClusterSizes() {
    if (!this.labels) return [];
    const sizes = new Array(this.k).fill(0);
    for (const l of this.labels) sizes[l]++;
    return sizes;
  }

  getSilhouetteScore(data) {
    return silhouetteScore(data, this.labels, this.distanceFn);
  }

  // Elbow method: find optimal k
  static findOptimalK(data, maxK = 10, nInit = 5) {
    const results = [];
    for (let k = 2; k <= Math.min(maxK, data.length - 1); k++) {
      const kmeans = new KMeans({ k, nInit });
      kmeans.train(data);
      const silhouette = kmeans.getSilhouetteScore(data);
      results.push({
        k,
        inertia: kmeans.inertia,
        silhouette,
        labels: kmeans.labels,
      });
    }

    // Find elbow point
    let bestK = 2;
    let bestScore = -1;
    for (const r of results) {
      if (r.silhouette > bestScore) {
        bestScore = r.silhouette;
        bestK = r.k;
      }
    }

    return { optimalK: bestK, results };
  }

  serialize() {
    return {
      k: this.k,
      centroids: this.centroids,
      labels: this.labels,
      inertia: this.inertia,
      iterations: this.iterations,
    };
  }

  static deserialize(obj) {
    const km = new KMeans({ k: obj.k });
    km.centroids = obj.centroids;
    km.labels = obj.labels;
    km.inertia = obj.inertia;
    km.iterations = obj.iterations;
    return km;
  }
}

// ============================================================================
// §2  DBSCAN
// ============================================================================

class DBSCAN {
  constructor(config = {}) {
    this.epsilon = config.epsilon || 0.5;
    this.minPoints = config.minPoints || 5;
    this.distanceFn = config.distance === 'manhattan' ? manhattanDistance
      : config.distance === 'cosine' ? cosineDistance
      : euclideanDistance;
    this.labels = null;
    this.numClusters = 0;
  }

  _regionQuery(data, pointIdx) {
    const neighbors = [];
    for (let i = 0; i < data.length; i++) {
      if (this.distanceFn(data[pointIdx], data[i]) <= this.epsilon) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  _expandCluster(data, pointIdx, neighbors, clusterId, labels, visited) {
    labels[pointIdx] = clusterId;
    const seeds = [...neighbors];

    for (let i = 0; i < seeds.length; i++) {
      const neighborIdx = seeds[i];

      if (!visited.has(neighborIdx)) {
        visited.add(neighborIdx);
        const newNeighbors = this._regionQuery(data, neighborIdx);
        if (newNeighbors.length >= this.minPoints) {
          for (const n of newNeighbors) {
            if (!seeds.includes(n)) seeds.push(n);
          }
        }
      }

      if (labels[neighborIdx] === -1) {
        labels[neighborIdx] = clusterId;
      }
    }
  }

  train(data) {
    const n = data.length;
    this.labels = new Array(n).fill(-1); // -1 = noise
    const visited = new Set();
    let clusterId = 0;

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      visited.add(i);

      const neighbors = this._regionQuery(data, i);
      if (neighbors.length < this.minPoints) {
        this.labels[i] = -1; // Noise
      } else {
        this._expandCluster(data, i, neighbors, clusterId, this.labels, visited);
        clusterId++;
      }
    }

    this.numClusters = clusterId;
    return this;
  }

  getNoisePoints() {
    return this.labels.reduce((indices, label, idx) => {
      if (label === -1) indices.push(idx);
      return indices;
    }, []);
  }

  getSilhouetteScore(data) {
    return silhouetteScore(data, this.labels, this.distanceFn);
  }

  // Auto-tune epsilon using k-distance graph
  static findOptimalEpsilon(data, minPoints = 5) {
    const kDistances = data.map(point => {
      const distances = data.map(other => euclideanDistance(point, other)).sort((a, b) => a - b);
      return distances[Math.min(minPoints, distances.length - 1)];
    });
    kDistances.sort((a, b) => a - b);

    // Find knee point
    let maxCurvature = 0;
    let kneeIdx = Math.floor(kDistances.length * 0.9);
    for (let i = 1; i < kDistances.length - 1; i++) {
      const curvature = Math.abs(kDistances[i + 1] + kDistances[i - 1] - 2 * kDistances[i]);
      if (curvature > maxCurvature) {
        maxCurvature = curvature;
        kneeIdx = i;
      }
    }

    return kDistances[kneeIdx];
  }

  serialize() {
    return { epsilon: this.epsilon, minPoints: this.minPoints, labels: this.labels, numClusters: this.numClusters };
  }

  static deserialize(obj) {
    const db = new DBSCAN({ epsilon: obj.epsilon, minPoints: obj.minPoints });
    db.labels = obj.labels;
    db.numClusters = obj.numClusters;
    return db;
  }
}

// ============================================================================
// §3  HIERARCHICAL CLUSTERING (Agglomerative)
// ============================================================================

class HierarchicalClustering {
  constructor(config = {}) {
    this.linkage = config.linkage || 'ward'; // 'single', 'complete', 'average', 'ward'
    this.numClusters = config.numClusters || 3;
    this.distanceFn = euclideanDistance;
    this.labels = null;
    this.dendrogram = null;
  }

  _computeDistanceMatrix(data) {
    const n = data.length;
    const distMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dist = this.distanceFn(data[i], data[j]);
        distMatrix[i][j] = dist;
        distMatrix[j][i] = dist;
      }
    }
    return distMatrix;
  }

  _clusterDistance(cluster1, cluster2, data, distMatrix) {
    const dists = [];
    for (const i of cluster1) {
      for (const j of cluster2) {
        dists.push(distMatrix[i][j]);
      }
    }

    switch (this.linkage) {
      case 'single': return Math.min(...dists);
      case 'complete': return Math.max(...dists);
      case 'average': return dists.reduce((a, b) => a + b, 0) / dists.length;
      case 'ward': {
        // Ward's minimum variance
        const merged = [...cluster1, ...cluster2];
        const numFeatures = data[0].length;
        const centroid = new Array(numFeatures).fill(0);
        for (const idx of merged) {
          for (let j = 0; j < numFeatures; j++) centroid[j] += data[idx][j];
        }
        centroid.forEach((_, j) => { centroid[j] /= merged.length; });

        let totalDist = 0;
        for (const idx of merged) {
          totalDist += this.distanceFn(data[idx], centroid) ** 2;
        }
        return totalDist;
      }
      default: return dists.reduce((a, b) => a + b, 0) / dists.length;
    }
  }

  train(data) {
    const n = data.length;
    const distMatrix = this._computeDistanceMatrix(data);

    // Initialize: each point is its own cluster
    let clusters = data.map((_, i) => [i]);
    const mergeHistory = [];

    while (clusters.length > this.numClusters) {
      let minDist = Infinity;
      let mergeI = 0, mergeJ = 1;

      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const dist = this._clusterDistance(clusters[i], clusters[j], data, distMatrix);
          if (dist < minDist) {
            minDist = dist;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      mergeHistory.push({
        cluster1: clusters[mergeI].slice(),
        cluster2: clusters[mergeJ].slice(),
        distance: minDist,
      });

      // Merge clusters
      const merged = [...clusters[mergeI], ...clusters[mergeJ]];
      clusters.splice(mergeJ, 1);
      clusters.splice(mergeI, 1, merged);
    }

    // Assign labels
    this.labels = new Array(n).fill(0);
    for (let c = 0; c < clusters.length; c++) {
      for (const idx of clusters[c]) {
        this.labels[idx] = c;
      }
    }

    this.dendrogram = mergeHistory;
    return this;
  }

  getSilhouetteScore(data) {
    return silhouetteScore(data, this.labels, this.distanceFn);
  }

  serialize() {
    return { linkage: this.linkage, numClusters: this.numClusters, labels: this.labels, dendrogram: this.dendrogram };
  }

  static deserialize(obj) {
    const hc = new HierarchicalClustering(obj);
    hc.labels = obj.labels;
    hc.dendrogram = obj.dendrogram;
    return hc;
  }
}

// ============================================================================
// §4  PCA (Principal Component Analysis)
// ============================================================================

class PCA {
  constructor(config = {}) {
    this.numComponents = config.numComponents || 2;
    this.components = null;
    this.eigenvalues = null;
    this.explainedVariance = null;
    this.mean = null;
    this.std = null;
  }

  _computeCovarianceMatrix(data) {
    const n = data.length;
    const d = data[0].length;
    const cov = Array.from({ length: d }, () => new Array(d).fill(0));

    for (let i = 0; i < d; i++) {
      for (let j = i; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += data[k][i] * data[k][j];
        }
        cov[i][j] = sum / (n - 1);
        cov[j][i] = cov[i][j];
      }
    }

    return cov;
  }

  // Power iteration for eigenvalue decomposition
  _powerIteration(matrix, numIterations = 200) {
    const d = matrix.length;
    const eigenvalues = [];
    const eigenvectors = [];
    const mat = matrix.map(row => [...row]);

    for (let k = 0; k < Math.min(this.numComponents, d); k++) {
      // Initialize random vector
      let v = Array.from({ length: d }, () => Math.random() - 0.5);
      let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      v = v.map(x => x / norm);

      let eigenvalue = 0;

      for (let iter = 0; iter < numIterations; iter++) {
        // Multiply: w = M * v
        const w = new Array(d).fill(0);
        for (let i = 0; i < d; i++) {
          for (let j = 0; j < d; j++) {
            w[i] += mat[i][j] * v[j];
          }
        }

        // New eigenvalue estimate
        eigenvalue = v.reduce((s, vi, i) => s + vi * w[i], 0);

        // Normalize
        norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
        if (norm < 1e-10) break;
        v = w.map(x => x / norm);
      }

      eigenvalues.push(eigenvalue);
      eigenvectors.push(v);

      // Deflate matrix: M = M - eigenvalue * v * v^T
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          mat[i][j] -= eigenvalue * v[i] * v[j];
        }
      }
    }

    return { eigenvalues, eigenvectors };
  }

  fit(data) {
    const n = data.length;
    const d = data[0].length;

    // Standardize
    this.mean = new Array(d).fill(0);
    this.std = new Array(d).fill(0);

    for (const row of data) {
      for (let j = 0; j < d; j++) this.mean[j] += row[j];
    }
    this.mean.forEach((_, j) => { this.mean[j] /= n; });

    for (const row of data) {
      for (let j = 0; j < d; j++) this.std[j] += (row[j] - this.mean[j]) ** 2;
    }
    this.std.forEach((_, j) => { this.std[j] = Math.sqrt(this.std[j] / n) || 1; });

    const standardized = data.map(row => row.map((v, j) => (v - this.mean[j]) / this.std[j]));

    // Compute covariance matrix
    const cov = this._computeCovarianceMatrix(standardized);

    // Eigendecomposition
    const { eigenvalues, eigenvectors } = this._powerIteration(cov);

    this.eigenvalues = eigenvalues;
    this.components = eigenvectors;

    const totalVariance = eigenvalues.reduce((s, v) => s + Math.abs(v), 0);
    this.explainedVariance = eigenvalues.map(v => Math.abs(v) / totalVariance);

    return this;
  }

  transform(data) {
    return data.map(row => {
      const standardized = row.map((v, j) => (v - this.mean[j]) / this.std[j]);
      return this.components.map(component =>
        component.reduce((sum, c, j) => sum + c * standardized[j], 0)
      );
    });
  }

  fitTransform(data) {
    this.fit(data);
    return this.transform(data);
  }

  getExplainedVarianceRatio() {
    return this.explainedVariance || [];
  }

  serialize() {
    return {
      numComponents: this.numComponents,
      components: this.components,
      eigenvalues: this.eigenvalues,
      explainedVariance: this.explainedVariance,
      mean: this.mean,
      std: this.std,
    };
  }

  static deserialize(obj) {
    const pca = new PCA({ numComponents: obj.numComponents });
    pca.components = obj.components;
    pca.eigenvalues = obj.eigenvalues;
    pca.explainedVariance = obj.explainedVariance;
    pca.mean = obj.mean;
    pca.std = obj.std;
    return pca;
  }
}

// ============================================================================
// §5  FINANCIAL CUSTOMER SEGMENTATION
// ============================================================================

class CustomerSegmentation {
  constructor() {
    this.kmeans = null;
    this.pca = null;
    this.scaler = null;
    this.segmentProfiles = null;
    this.featureNames = [
      'avgMonthlyIncome', 'avgMonthlyExpenses', 'savingsRate',
      'transactionFrequency', 'avgTransactionAmount', 'categoryDiversity',
      'debtLevel', 'investmentLevel', 'emergencyFundMonths',
      'budgetAdherence', 'emiLoad', 'subscriptionSpend',
    ];
  }

  extractFeatures(userData) {
    const { transactions = [], budgets = [], emis = [], investments = [], debts = [], accounts = [], subscriptions = [] } = userData;

    const last90Days = transactions.filter(t => new Date(t.date) > new Date(Date.now() - 90 * 86400000));
    const income = last90Days.filter(t => t.type === 'credit').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = last90Days.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);

    const monthlyIncome = income / 3;
    const monthlyExpenses = expenses / 3;
    const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;

    const categories = new Set(last90Days.map(t => t.category).filter(Boolean));
    const amounts = last90Days.map(t => Math.abs(t.amount));
    const avgAmount = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;

    const totalDebt = debts.reduce((s, d) => s + (d.remainingAmount || d.amount || 0), 0);
    const totalInvestments = investments.reduce((s, i) => s + (i.currentValue || i.amount || 0), 0);
    const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const emergencyMonths = monthlyExpenses > 0 ? totalBalance / monthlyExpenses : 0;
    const budgetAdherence = budgets.length > 0
      ? budgets.filter(b => (b.spent || 0) <= b.limit).length / budgets.length
      : 0.5;
    const emiLoad = emis.reduce((s, e) => s + (e.emiAmount || 0), 0);
    const subSpend = subscriptions.reduce((s, sub) => s + (sub.amount || 0), 0);

    return [
      monthlyIncome, monthlyExpenses, savingsRate,
      last90Days.length / 3, avgAmount, categories.size,
      totalDebt, totalInvestments, emergencyMonths,
      budgetAdherence, emiLoad, subSpend,
    ];
  }

  async train(usersData, numClusters = 5) {
    if (usersData.length < numClusters) {
      return { success: false, message: 'Insufficient user data for segmentation' };
    }

    const features = usersData.map(u => this.extractFeatures(u));
    const { data: normalizedData, means, stds } = standardize(features);
    this.scaler = { means, stds };

    // Find optimal k
    const { optimalK } = KMeans.findOptimalK(normalizedData, Math.min(numClusters + 3, usersData.length - 1));

    this.kmeans = new KMeans({ k: optimalK, nInit: 10 });
    this.kmeans.train(normalizedData);

    // PCA for visualization
    this.pca = new PCA({ numComponents: 2 });
    this.pca.fit(normalizedData);

    // Generate segment profiles
    this.segmentProfiles = this._generateProfiles(features, this.kmeans.labels, optimalK);

    return {
      success: true,
      numClusters: optimalK,
      silhouetteScore: this.kmeans.getSilhouetteScore(normalizedData),
      profiles: this.segmentProfiles,
    };
  }

  _generateProfiles(features, labels, k) {
    const profiles = [];
    const segmentNames = [
      'Conservative Saver', 'Active Investor', 'Budget-Conscious',
      'High Spender', 'Debt Manager', 'Growth Focused',
      'Passive Holder', 'Balanced Planner',
    ];

    for (let c = 0; c < k; c++) {
      const clusterPoints = features.filter((_, i) => labels[i] === c);
      if (clusterPoints.length === 0) continue;

      const avgFeatures = {};
      for (let j = 0; j < this.featureNames.length; j++) {
        const values = clusterPoints.map(p => p[j]);
        avgFeatures[this.featureNames[j]] = values.reduce((a, b) => a + b, 0) / values.length;
      }

      // Determine personality
      let personality = segmentNames[c % segmentNames.length];
      if (avgFeatures.savingsRate > 0.3) personality = 'Conservative Saver';
      else if (avgFeatures.investmentLevel > avgFeatures.avgMonthlyIncome * 3) personality = 'Active Investor';
      else if (avgFeatures.debtLevel > avgFeatures.avgMonthlyIncome * 12) personality = 'Debt Manager';
      else if (avgFeatures.avgMonthlyExpenses > avgFeatures.avgMonthlyIncome * 0.9) personality = 'High Spender';

      profiles.push({
        clusterId: c,
        name: personality,
        size: clusterPoints.length,
        averages: avgFeatures,
        characteristics: this._describeSegment(avgFeatures),
      });
    }

    return profiles;
  }

  _describeSegment(avg) {
    const desc = [];
    if (avg.savingsRate > 0.25) desc.push('Strong savings discipline');
    else if (avg.savingsRate < 0.05) desc.push('Minimal savings');
    if (avg.investmentLevel > 0) desc.push('Active investment portfolio');
    if (avg.debtLevel > avg.avgMonthlyIncome * 6) desc.push('Significant debt obligations');
    if (avg.emergencyFundMonths >= 6) desc.push('Well-prepared emergency fund');
    else if (avg.emergencyFundMonths < 2) desc.push('Insufficient emergency reserves');
    if (avg.budgetAdherence > 0.8) desc.push('Excellent budget management');
    if (avg.categoryDiversity > 8) desc.push('Diverse spending patterns');
    return desc;
  }

  segment(userData) {
    if (!this.kmeans || !this.scaler) return null;

    const features = this.extractFeatures(userData);
    const normalized = features.map((v, j) =>
      (v - this.scaler.means[j]) / this.scaler.stds[j]
    );

    const clusterId = this.kmeans.predict(normalized);
    const profile = this.segmentProfiles?.find(p => p.clusterId === clusterId);

    return {
      segmentId: clusterId,
      segmentName: profile?.name || `Segment ${clusterId}`,
      profile,
      userFeatures: Object.fromEntries(this.featureNames.map((name, i) => [name, features[i]])),
    };
  }

  serialize() {
    return {
      kmeans: this.kmeans?.serialize(),
      pca: this.pca?.serialize(),
      scaler: this.scaler,
      segmentProfiles: this.segmentProfiles,
      featureNames: this.featureNames,
    };
  }

  static deserialize(obj) {
    const cs = new CustomerSegmentation();
    if (obj.kmeans) cs.kmeans = KMeans.deserialize(obj.kmeans);
    if (obj.pca) cs.pca = PCA.deserialize(obj.pca);
    cs.scaler = obj.scaler;
    cs.segmentProfiles = obj.segmentProfiles;
    cs.featureNames = obj.featureNames || cs.featureNames;
    return cs;
  }
}

// ============================================================================
// §6  SPENDING PATTERN DISCOVERY
// ============================================================================

class SpendingPatternDiscovery {
  constructor() {
    this.kmeans = null;
    this.patterns = null;
  }

  extractDailyPatterns(transactions, days = 90) {
    const cutoff = new Date(Date.now() - days * 86400000);
    const recent = transactions.filter(t => t.type === 'debit' && new Date(t.date) > cutoff);

    // Create daily feature vectors
    const dailyData = {};
    for (const t of recent) {
      const d = new Date(t.date);
      const key = d.toISOString().slice(0, 10);
      if (!dailyData[key]) {
        dailyData[key] = {
          total: 0, count: 0, maxAmount: 0,
          categories: {},
          dayOfWeek: d.getDay(),
          weekOfMonth: Math.floor(d.getDate() / 7),
        };
      }
      dailyData[key].total += Math.abs(t.amount);
      dailyData[key].count++;
      dailyData[key].maxAmount = Math.max(dailyData[key].maxAmount, Math.abs(t.amount));
      const cat = t.category || 'other';
      dailyData[key].categories[cat] = (dailyData[key].categories[cat] || 0) + Math.abs(t.amount);
    }

    // Convert to feature vectors
    const allCategories = [...new Set(recent.map(t => t.category || 'other'))].sort();
    const days_list = Object.keys(dailyData).sort();
    const features = days_list.map(day => {
      const d = dailyData[day];
      const catFeatures = allCategories.map(cat => d.categories[cat] || 0);
      return [
        d.total, d.count, d.maxAmount,
        d.dayOfWeek / 7, d.weekOfMonth / 4,
        ...catFeatures,
      ];
    });

    return { features, days: days_list, dailyData, categories: allCategories };
  }

  async discover(transactions) {
    const { features, days, dailyData, categories } = this.extractDailyPatterns(transactions);
    if (features.length < 10) {
      return { success: false, message: 'Insufficient data for pattern discovery' };
    }

    const { data: normalized } = standardize(features);
    const { optimalK, results } = KMeans.findOptimalK(normalized, Math.min(8, features.length - 1));

    this.kmeans = new KMeans({ k: optimalK, nInit: 10 });
    this.kmeans.train(normalized);

    // Analyze patterns
    this.patterns = [];
    for (let c = 0; c < optimalK; c++) {
      const clusterDays = days.filter((_, i) => this.kmeans.labels[i] === c);
      const clusterData = clusterDays.map(d => dailyData[d]);

      const avgSpend = clusterData.reduce((s, d) => s + d.total, 0) / clusterData.length;
      const avgCount = clusterData.reduce((s, d) => s + d.count, 0) / clusterData.length;
      const dayDistribution = new Array(7).fill(0);
      clusterData.forEach(d => dayDistribution[d.dayOfWeek]++);

      const topCategories = {};
      for (const d of clusterData) {
        for (const [cat, amount] of Object.entries(d.categories)) {
          topCategories[cat] = (topCategories[cat] || 0) + amount;
        }
      }
      const sortedCats = Object.entries(topCategories).sort((a, b) => b[1] - a[1]).slice(0, 5);

      // Determine pattern type
      const peakDay = dayDistribution.indexOf(Math.max(...dayDistribution));
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      let patternType = 'regular';
      if (avgSpend > 10000) patternType = 'high-spending';
      else if (avgSpend < 500) patternType = 'minimal';
      else if (avgCount > 5) patternType = 'frequent';

      this.patterns.push({
        patternId: c,
        type: patternType,
        frequency: clusterDays.length,
        avgDailySpend: avgSpend,
        avgTransactions: avgCount,
        peakDay: dayNames[peakDay],
        dayDistribution: Object.fromEntries(dayNames.map((name, i) => [name, dayDistribution[i]])),
        topCategories: Object.fromEntries(sortedCats),
        description: this._describePattern(patternType, avgSpend, avgCount, dayNames[peakDay], sortedCats),
      });
    }

    return {
      success: true,
      numPatterns: optimalK,
      patterns: this.patterns,
      silhouette: this.kmeans.getSilhouetteScore(normalized),
    };
  }

  _describePattern(type, avgSpend, avgCount, peakDay, topCats) {
    const catStr = topCats.map(([cat]) => cat).join(', ');
    switch (type) {
      case 'high-spending': return `High-spending days (avg ₹${avgSpend.toFixed(0)}) with ${avgCount.toFixed(1)} transactions, peaked on ${peakDay}. Main categories: ${catStr}.`;
      case 'minimal': return `Low-activity days with minimal spending (avg ₹${avgSpend.toFixed(0)}). Typically on ${peakDay}.`;
      case 'frequent': return `High-frequency days with ${avgCount.toFixed(1)} transactions averaging ₹${avgSpend.toFixed(0)}. Categories: ${catStr}.`;
      default: return `Regular spending pattern (avg ₹${avgSpend.toFixed(0)}, ${avgCount.toFixed(1)} transactions). Categories: ${catStr}.`;
    }
  }

  serialize() {
    return { kmeans: this.kmeans?.serialize(), patterns: this.patterns };
  }

  static deserialize(obj) {
    const sp = new SpendingPatternDiscovery();
    if (obj.kmeans) sp.kmeans = KMeans.deserialize(obj.kmeans);
    sp.patterns = obj.patterns;
    return sp;
  }
}

// ============================================================================
// §7  EXPORTS
// ============================================================================

module.exports = {
  KMeans,
  DBSCAN,
  HierarchicalClustering,
  PCA,
  CustomerSegmentation,
  SpendingPatternDiscovery,
  euclideanDistance,
  manhattanDistance,
  cosineDistance,
  standardize,
  silhouetteScore,
};
