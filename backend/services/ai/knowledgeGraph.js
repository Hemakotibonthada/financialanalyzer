// ============================================================================
// KNOWLEDGE GRAPH ENGINE — Financial Knowledge Graph & Reasoning System
// ============================================================================
// Builds and maintains a knowledge graph of financial entities, relationships,
// and patterns. Used for contextual recommendations, semantic search, and
// financial insight generation. Runs entirely locally.
// ============================================================================

'use strict';

const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

// ============================================================================
// §1  GRAPH CORE — Node and Edge Management
// ============================================================================

class KnowledgeGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.nodeIndex = {};    // type -> Set of nodeIds
    this.reverseEdges = new Map();
    this.metadata = {
      created: new Date(),
      lastUpdated: null,
      nodeCount: 0,
      edgeCount: 0
    };
  }

  // --- Node Operations ---

  addNode(id, type, properties = {}) {
    const node = {
      id,
      type,
      properties: { ...properties },
      created: new Date(),
      updated: new Date(),
      importance: properties.importance || 1.0
    };
    this.nodes.set(id, node);

    if (!this.nodeIndex[type]) this.nodeIndex[type] = new Set();
    this.nodeIndex[type].add(id);

    this.metadata.nodeCount = this.nodes.size;
    this.metadata.lastUpdated = new Date();
    return node;
  }

  getNode(id) { return this.nodes.get(id); }

  getNodesByType(type) {
    const ids = this.nodeIndex[type] || new Set();
    return [...ids].map(id => this.nodes.get(id)).filter(Boolean);
  }

  updateNode(id, properties) {
    const node = this.nodes.get(id);
    if (!node) return null;
    Object.assign(node.properties, properties);
    node.updated = new Date();
    return node;
  }

  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove all edges connected to this node
    const edgesToRemove = [];
    for (const [edgeId, edge] of this.edges) {
      if (edge.source === id || edge.target === id) edgesToRemove.push(edgeId);
    }
    for (const edgeId of edgesToRemove) {
      this.edges.delete(edgeId);
      this.reverseEdges.delete(edgeId);
    }

    // Remove from index
    if (this.nodeIndex[node.type]) this.nodeIndex[node.type].delete(id);
    this.nodes.delete(id);
    this.metadata.nodeCount = this.nodes.size;
    return true;
  }

  // --- Edge Operations ---

  addEdge(sourceId, targetId, relation, properties = {}) {
    const edgeId = `${sourceId}-${relation}-${targetId}`;
    const edge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      relation,
      properties: { ...properties },
      weight: properties.weight || 1.0,
      created: new Date()
    };
    this.edges.set(edgeId, edge);

    // Build reverse index
    if (!this.reverseEdges.has(targetId)) this.reverseEdges.set(targetId, []);
    this.reverseEdges.get(targetId).push(edgeId);

    this.metadata.edgeCount = this.edges.size;
    this.metadata.lastUpdated = new Date();
    return edge;
  }

  getEdge(edgeId) { return this.edges.get(edgeId); }

  getOutgoingEdges(nodeId) {
    const edges = [];
    for (const [, edge] of this.edges) {
      if (edge.source === nodeId) edges.push(edge);
    }
    return edges;
  }

  getIncomingEdges(nodeId) {
    const edgeIds = this.reverseEdges.get(nodeId) || [];
    return edgeIds.map(id => this.edges.get(id)).filter(Boolean);
  }

  getNeighbors(nodeId, relation = null) {
    const neighbors = [];
    for (const [, edge] of this.edges) {
      if (edge.source === nodeId && (!relation || edge.relation === relation)) {
        const node = this.nodes.get(edge.target);
        if (node) neighbors.push({ node, edge });
      }
      if (edge.target === nodeId && (!relation || edge.relation === relation)) {
        const node = this.nodes.get(edge.source);
        if (node) neighbors.push({ node, edge });
      }
    }
    return neighbors;
  }

  // --- Graph Queries ---

  findPath(startId, endId, maxDepth = 5) {
    const visited = new Set();
    const queue = [[startId]];

    while (queue.length > 0) {
      const currentPath = queue.shift();
      const currentNode = currentPath[currentPath.length - 1];

      if (currentNode === endId) return currentPath;
      if (currentPath.length > maxDepth) continue;
      if (visited.has(currentNode)) continue;

      visited.add(currentNode);
      const neighbors = this.getNeighbors(currentNode);

      for (const { node } of neighbors) {
        if (!visited.has(node.id)) {
          queue.push([...currentPath, node.id]);
        }
      }
    }

    return null;
  }

  findSubgraph(startId, depth = 2) {
    const nodes = new Map();
    const edges = [];
    const visited = new Set();
    const queue = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth: d } = queue.shift();
      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (node) nodes.set(id, node);

      const neighbors = this.getNeighbors(id);
      for (const { node: neighborNode, edge } of neighbors) {
        edges.push(edge);
        if (!visited.has(neighborNode.id)) {
          queue.push({ id: neighborNode.id, depth: d + 1 });
        }
      }
    }

    return { nodes: [...nodes.values()], edges };
  }

  // PageRank-inspired importance scoring
  computeImportance(iterations = 20, dampingFactor = 0.85) {
    const n = this.nodes.size;
    if (n === 0) return {};

    const scores = {};
    for (const [id] of this.nodes) {
      scores[id] = 1.0 / n;
    }

    for (let iter = 0; iter < iterations; iter++) {
      const newScores = {};

      for (const [id] of this.nodes) {
        let incomingScore = 0;
        const incoming = this.getIncomingEdges(id);

        for (const edge of incoming) {
          const sourceNode = this.nodes.get(edge.source);
          if (sourceNode) {
            const outgoing = this.getOutgoingEdges(edge.source);
            if (outgoing.length > 0) {
              incomingScore += (scores[edge.source] || 0) * edge.weight / outgoing.length;
            }
          }
        }

        newScores[id] = (1 - dampingFactor) / n + dampingFactor * incomingScore;
      }

      Object.assign(scores, newScores);
    }

    // Update node importance
    for (const [id, score] of Object.entries(scores)) {
      const node = this.nodes.get(id);
      if (node) node.importance = score;
    }

    return scores;
  }

  // Community Detection (Label Propagation)
  detectCommunities(maxIterations = 50) {
    const labels = {};
    let labelCounter = 0;

    // Initialize each node with unique label
    for (const [id] of this.nodes) {
      labels[id] = labelCounter++;
    }

    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;
      const nodeIds = [...this.nodes.keys()];
      // Shuffle for randomized iteration
      for (let i = nodeIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nodeIds[i], nodeIds[j]] = [nodeIds[j], nodeIds[i]];
      }

      for (const nodeId of nodeIds) {
        const neighbors = this.getNeighbors(nodeId);
        if (neighbors.length === 0) continue;

        // Find most common label among neighbors
        const labelCounts = {};
        for (const { node, edge } of neighbors) {
          const l = labels[node.id];
          labelCounts[l] = (labelCounts[l] || 0) + (edge.weight || 1);
        }

        let bestLabel = labels[nodeId];
        let bestCount = 0;
        for (const [l, count] of Object.entries(labelCounts)) {
          if (count > bestCount) {
            bestCount = count;
            bestLabel = parseInt(l);
          }
        }

        if (labels[nodeId] !== bestLabel) {
          labels[nodeId] = bestLabel;
          changed = true;
        }
      }

      if (!changed) break;
    }

    // Group by community
    const communities = {};
    for (const [nodeId, label] of Object.entries(labels)) {
      if (!communities[label]) communities[label] = [];
      communities[label].push(nodeId);
    }

    return Object.values(communities).sort((a, b) => b.length - a.length);
  }

  // Semantic search in the graph
  search(query, limit = 10) {
    const queryLower = query.toLowerCase();
    const results = [];

    for (const [, node] of this.nodes) {
      let relevance = 0;

      // Match against node properties
      const propsStr = JSON.stringify(node.properties).toLowerCase();
      if (propsStr.includes(queryLower)) relevance += 2;

      // Match against node type
      if (node.type.toLowerCase().includes(queryLower)) relevance += 1;

      // Match against node ID
      if (node.id.toLowerCase().includes(queryLower)) relevance += 1.5;

      // Partial matches
      const queryWords = queryLower.split(/\s+/);
      for (const word of queryWords) {
        if (word.length < 2) continue;
        if (propsStr.includes(word)) relevance += 0.5;
        if (node.id.toLowerCase().includes(word)) relevance += 0.3;
      }

      // Boost by importance
      relevance *= (1 + (node.importance || 0));

      if (relevance > 0) {
        results.push({ node, relevance });
      }
    }

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  // Serialization
  serialize() {
    return {
      nodes: [...this.nodes].map(([id, node]) => ({ id, ...node })),
      edges: [...this.edges].map(([id, edge]) => ({ id, ...edge })),
      metadata: this.metadata
    };
  }

  deserialize(data) {
    this.nodes.clear();
    this.edges.clear();
    this.nodeIndex = {};
    this.reverseEdges.clear();

    if (data.nodes) {
      for (const node of data.nodes) {
        this.addNode(node.id, node.type, node.properties);
      }
    }

    if (data.edges) {
      for (const edge of data.edges) {
        this.addEdge(edge.source, edge.target, edge.relation, edge.properties);
      }
    }

    this.metadata = data.metadata || this.metadata;
  }

  getStats() {
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodeTypes: Object.fromEntries(
        Object.entries(this.nodeIndex).map(([type, ids]) => [type, ids.size])
      ),
      avgDegree: this.nodes.size > 0
        ? (this.edges.size * 2) / this.nodes.size
        : 0,
      lastUpdated: this.metadata.lastUpdated
    };
  }
}

// ============================================================================
// §2  FINANCIAL KNOWLEDGE GRAPH BUILDER
// ============================================================================

class FinancialKnowledgeGraphBuilder {
  constructor() {
    this.graph = new KnowledgeGraph();
    this.dataDir = path.join(__dirname, '../../data/knowledge-graphs');
  }

  async _ensureDir() {
    await fs.promises.mkdir(this.dataDir, { recursive: true }).catch(() => {});
  }

  // Build graph from user's financial data
  async buildFromUserData(userId, data) {
    const { transactions, budgets, goals, loans, investments, categories } = data;

    // Add user node
    this.graph.addNode(`user:${userId}`, 'user', {
      userId,
      name: data.userName || 'User'
    });

    // Process transactions
    if (transactions) {
      await this._processTransactions(userId, transactions);
    }

    // Process budgets
    if (budgets) {
      this._processBudgets(userId, budgets);
    }

    // Process goals
    if (goals) {
      this._processGoals(userId, goals);
    }

    // Process loans
    if (loans) {
      this._processLoans(userId, loans);
    }

    // Process investments
    if (investments) {
      this._processInvestments(userId, investments);
    }

    // Add financial knowledge base
    this._addFinancialRules();

    // Compute importance
    this.graph.computeImportance();

    return this.graph;
  }

  async _processTransactions(userId, transactions) {
    const merchantSpending = {};
    const categorySpending = {};
    const monthlyTotals = {};

    for (const txn of transactions) {
      const txnId = `txn:${txn._id || txn.id || Math.random().toString(36)}`;
      const merchant = txn.merchant || txn.description || 'Unknown';
      const category = txn.category || 'uncategorized';
      const amount = Math.abs(txn.amount || 0);
      const date = new Date(txn.date || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Aggregate merchant spending
      if (!merchantSpending[merchant]) merchantSpending[merchant] = { total: 0, count: 0, amounts: [] };
      merchantSpending[merchant].total += amount;
      merchantSpending[merchant].count++;
      merchantSpending[merchant].amounts.push(amount);

      // Aggregate category spending
      if (!categorySpending[category]) categorySpending[category] = { total: 0, count: 0 };
      categorySpending[category].total += amount;
      categorySpending[category].count++;

      // Monthly totals
      if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = { income: 0, expense: 0 };
      if (txn.type === 'income') monthlyTotals[monthKey].income += amount;
      else monthlyTotals[monthKey].expense += amount;
    }

    // Add merchant nodes
    for (const [merchant, stats] of Object.entries(merchantSpending)) {
      const merchantId = `merchant:${merchant.replace(/\s+/g, '_').toLowerCase()}`;
      this.graph.addNode(merchantId, 'merchant', {
        name: merchant,
        totalSpent: stats.total,
        transactionCount: stats.count,
        avgAmount: stats.total / stats.count,
        importance: Math.log1p(stats.total)
      });

      this.graph.addEdge(`user:${userId}`, merchantId, 'transacts_with', {
        weight: Math.log1p(stats.count),
        totalSpent: stats.total
      });
    }

    // Add category nodes
    for (const [category, stats] of Object.entries(categorySpending)) {
      const catId = `category:${category}`;
      this.graph.addNode(catId, 'spending_category', {
        name: category,
        totalSpent: stats.total,
        transactionCount: stats.count,
        avgAmount: stats.total / stats.count
      });

      this.graph.addEdge(`user:${userId}`, catId, 'spends_in', {
        weight: Math.log1p(stats.total),
        totalSpent: stats.total
      });

      // Link merchants to categories
      for (const txn of transactions.filter(t => (t.category || 'uncategorized') === category)) {
        const merchant = txn.merchant || txn.description || 'Unknown';
        const merchantId = `merchant:${merchant.replace(/\s+/g, '_').toLowerCase()}`;
        if (this.graph.getNode(merchantId)) {
          this.graph.addEdge(merchantId, catId, 'belongs_to', { weight: 1 });
        }
      }
    }

    // Add monthly spending pattern nodes
    for (const [month, totals] of Object.entries(monthlyTotals)) {
      const monthId = `month:${userId}:${month}`;
      this.graph.addNode(monthId, 'monthly_summary', {
        month,
        income: totals.income,
        expense: totals.expense,
        savings: totals.income - totals.expense,
        savingsRate: totals.income > 0 ? (totals.income - totals.expense) / totals.income : 0
      });
      this.graph.addEdge(`user:${userId}`, monthId, 'monthly_data', { weight: 1 });
    }
  }

  _processBudgets(userId, budgets) {
    for (const budget of budgets) {
      const budgetId = `budget:${budget._id || budget.id || budget.category}`;
      this.graph.addNode(budgetId, 'budget', {
        category: budget.category,
        limit: budget.limit || budget.amount,
        spent: budget.spent || 0,
        remaining: (budget.limit || budget.amount) - (budget.spent || 0),
        utilization: budget.limit ? (budget.spent || 0) / budget.limit : 0
      });

      this.graph.addEdge(`user:${userId}`, budgetId, 'has_budget', { weight: 1 });

      // Link to category if exists
      const catId = `category:${budget.category}`;
      if (this.graph.getNode(catId)) {
        this.graph.addEdge(budgetId, catId, 'budgets_for', { weight: 1 });
      }
    }
  }

  _processGoals(userId, goals) {
    for (const goal of goals) {
      const goalId = `goal:${goal._id || goal.id || goal.name}`;
      this.graph.addNode(goalId, 'financial_goal', {
        name: goal.name || goal.title,
        targetAmount: goal.targetAmount || goal.target,
        currentAmount: goal.currentAmount || goal.saved || 0,
        deadline: goal.deadline || goal.targetDate,
        progress: goal.targetAmount
          ? (goal.currentAmount || goal.saved || 0) / goal.targetAmount
          : 0,
        priority: goal.priority || 'medium'
      });

      this.graph.addEdge(`user:${userId}`, goalId, 'has_goal', {
        weight: goal.priority === 'high' ? 3 : goal.priority === 'medium' ? 2 : 1
      });
    }
  }

  _processLoans(userId, loans) {
    for (const loan of loans) {
      const loanId = `loan:${loan._id || loan.id || loan.name}`;
      this.graph.addNode(loanId, 'loan', {
        name: loan.name || loan.type,
        principal: loan.principalAmount || loan.principal,
        outstanding: loan.outstandingAmount || loan.outstanding,
        rate: loan.interestRate || loan.rate,
        emi: loan.emiAmount || loan.emi,
        status: loan.status || 'active',
        type: loan.loanType || loan.type
      });

      this.graph.addEdge(`user:${userId}`, loanId, 'has_loan', {
        weight: Math.log1p(loan.outstandingAmount || loan.outstanding || 0)
      });
    }
  }

  _processInvestments(userId, investments) {
    for (const inv of investments) {
      const invId = `investment:${inv._id || inv.id || inv.name}`;
      this.graph.addNode(invId, 'investment', {
        name: inv.name || inv.symbol,
        type: inv.type || inv.assetClass,
        value: inv.currentValue || inv.value,
        invested: inv.investedAmount || inv.invested,
        returns: inv.returns || 0,
        returnPercent: inv.investedAmount
          ? ((inv.currentValue || inv.value) - inv.investedAmount) / inv.investedAmount * 100
          : 0
      });

      this.graph.addEdge(`user:${userId}`, invId, 'invested_in', {
        weight: Math.log1p(inv.currentValue || inv.value || 0)
      });
    }
  }

  _addFinancialRules() {
    // Add financial concept nodes
    const concepts = [
      { id: 'concept:emergency_fund', type: 'financial_concept', props: { name: 'Emergency Fund', rule: '6 months of expenses', priority: 'critical' }},
      { id: 'concept:50_30_20', type: 'financial_concept', props: { name: '50/30/20 Rule', rule: '50% needs, 30% wants, 20% savings', priority: 'high' }},
      { id: 'concept:debt_to_income', type: 'financial_concept', props: { name: 'Debt-to-Income Ratio', rule: 'Keep below 36%', threshold: 0.36, priority: 'high' }},
      { id: 'concept:insurance_cover', type: 'financial_concept', props: { name: 'Insurance Coverage', rule: '10-15x annual income for term insurance', priority: 'high' }},
      { id: 'concept:retirement_corpus', type: 'financial_concept', props: { name: 'Retirement Corpus', rule: '25x annual expenses', priority: 'medium' }},
      { id: 'concept:asset_allocation', type: 'financial_concept', props: { name: 'Asset Allocation', rule: '100-age in equity', priority: 'medium' }},
      { id: 'concept:tax_planning', type: 'financial_concept', props: { name: 'Tax Planning', rule: 'Maximize 80C, 80D, 80CCD deductions', priority: 'medium' }},
      { id: 'concept:compound_interest', type: 'financial_concept', props: { name: 'Power of Compounding', rule: 'Start early, stay invested', priority: 'high' }},
      { id: 'concept:diversification', type: 'financial_concept', props: { name: 'Diversification', rule: 'Spread across asset classes', priority: 'high' }},
      { id: 'concept:inflation', type: 'financial_concept', props: { name: 'Inflation Protection', rule: 'Returns must beat 6-7% inflation', priority: 'medium' }}
    ];

    for (const concept of concepts) {
      this.graph.addNode(concept.id, concept.type, concept.props);
    }

    // Add relationships between concepts
    this.graph.addEdge('concept:emergency_fund', 'concept:50_30_20', 'related_to', { weight: 1.5 });
    this.graph.addEdge('concept:asset_allocation', 'concept:diversification', 'implements', { weight: 2 });
    this.graph.addEdge('concept:retirement_corpus', 'concept:compound_interest', 'depends_on', { weight: 2 });
    this.graph.addEdge('concept:tax_planning', 'concept:insurance_cover', 'related_to', { weight: 1 });
  }

  // Get contextualized recommendations based on graph
  getRecommendations(userId) {
    const recommendations = [];
    const userNode = this.graph.getNode(`user:${userId}`);
    if (!userNode) return recommendations;

    // Analyze spending patterns
    const categories = this.graph.getNeighbors(`user:${userId}`, 'spends_in');
    const totalSpent = categories.reduce((s, { edge }) => s + (edge.properties.totalSpent || 0), 0);

    for (const { node, edge } of categories) {
      const catPercentage = totalSpent > 0 ? (edge.properties.totalSpent / totalSpent) * 100 : 0;

      if (catPercentage > 30 && !['rent', 'mortgage', 'housing'].includes(node.properties.name)) {
        recommendations.push({
          type: 'spending_alert',
          category: node.properties.name,
          percentage: catPercentage,
          message: `${node.properties.name} spending is ${catPercentage.toFixed(1)}% of total — consider reducing.`,
          priority: catPercentage > 40 ? 'high' : 'medium',
          relatedConcepts: ['concept:50_30_20']
        });
      }
    }

    // Analyze goals
    const goals = this.graph.getNeighbors(`user:${userId}`, 'has_goal');
    for (const { node } of goals) {
      const progress = node.properties.progress || 0;
      if (progress < 0.5 && node.properties.deadline) {
        const deadline = new Date(node.properties.deadline);
        const daysLeft = (deadline - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysLeft < 180 && daysLeft > 0) {
          recommendations.push({
            type: 'goal_risk',
            goal: node.properties.name,
            progress: (progress * 100).toFixed(1) + '%',
            daysLeft: Math.round(daysLeft),
            message: `Goal "${node.properties.name}" is at ${(progress * 100).toFixed(0)}% with ${Math.round(daysLeft)} days left — needs attention.`,
            priority: 'high'
          });
        }
      }
    }

    // Analyze loan health
    const loans = this.graph.getNeighbors(`user:${userId}`, 'has_loan');
    const monthlyIncome = this._estimateMonthlyIncome(userId);
    const totalEmi = loans.reduce((s, { node }) => s + (node.properties.emi || 0), 0);

    if (monthlyIncome > 0 && totalEmi / monthlyIncome > 0.4) {
      recommendations.push({
        type: 'debt_warning',
        dti: (totalEmi / monthlyIncome * 100).toFixed(1) + '%',
        message: `EMI-to-income ratio is ${(totalEmi / monthlyIncome * 100).toFixed(1)}% (recommended: <40%).`,
        priority: 'high',
        relatedConcepts: ['concept:debt_to_income']
      });
    }

    // Check high-interest loans
    for (const { node } of loans) {
      if (node.properties.rate > 0.15 && node.properties.status === 'active') {
        recommendations.push({
          type: 'high_interest_alert',
          loan: node.properties.name,
          rate: (node.properties.rate * 100).toFixed(1) + '%',
          message: `${node.properties.name} has ${(node.properties.rate * 100).toFixed(1)}% interest — consider prepayment or refinancing.`,
          priority: 'medium'
        });
      }
    }

    return recommendations.sort((a, b) =>
      (a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2) -
      (b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2)
    );
  }

  _estimateMonthlyIncome(userId) {
    const months = this.graph.getNeighbors(`user:${userId}`, 'monthly_data');
    if (months.length === 0) return 0;
    const incomes = months.map(({ node }) => node.properties.income || 0).filter(i => i > 0);
    return incomes.length > 0 ? incomes.reduce((s, v) => s + v, 0) / incomes.length : 0;
  }

  // Query the graph with natural language
  queryGraph(userId, question) {
    const questionLower = question.toLowerCase();
    const results = { answer: '', data: {}, relatedNodes: [] };

    // Spending queries
    if (questionLower.match(/how much.*spend|spending|expense/)) {
      const categories = this.graph.getNeighbors(`user:${userId}`, 'spends_in');
      const spending = {};
      let total = 0;

      for (const { node, edge } of categories) {
        spending[node.properties.name] = edge.properties.totalSpent;
        total += edge.properties.totalSpent;
      }

      results.answer = `Total spending: ₹${total.toLocaleString()}. Top categories: ${
        Object.entries(spending)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([k, v]) => `${k} (₹${v.toLocaleString()})`)
          .join(', ')
      }`;
      results.data = { total, breakdown: spending };
    }

    // Merchant queries
    else if (questionLower.match(/merchant|where.*shop|store|vendor/)) {
      const merchants = this.graph.getNeighbors(`user:${userId}`, 'transacts_with');
      const topMerchants = merchants
        .sort((a, b) => (b.edge.properties.totalSpent || 0) - (a.edge.properties.totalSpent || 0))
        .slice(0, 10);

      results.answer = `Top merchants: ${topMerchants.map(({ node, edge }) =>
        `${node.properties.name} (₹${(edge.properties.totalSpent || 0).toLocaleString()}, ${node.properties.transactionCount} txns)`
      ).join('; ')}`;
      results.data = { merchants: topMerchants.map(m => m.node.properties) };
    }

    // Goal queries
    else if (questionLower.match(/goal|target|saving for/)) {
      const goals = this.graph.getNeighbors(`user:${userId}`, 'has_goal');
      results.answer = goals.length > 0
        ? `You have ${goals.length} financial goals: ${goals.map(({ node }) =>
            `${node.properties.name} (${((node.properties.progress || 0) * 100).toFixed(0)}% complete)`
          ).join(', ')}`
        : 'No financial goals found. Consider setting goals for better financial planning.';
      results.data = { goals: goals.map(g => g.node.properties) };
    }

    // Loan queries
    else if (questionLower.match(/loan|debt|emi|borrow/)) {
      const loans = this.graph.getNeighbors(`user:${userId}`, 'has_loan');
      const activeLoans = loans.filter(({ node }) => node.properties.status === 'active');
      const totalOutstanding = activeLoans.reduce((s, { node }) => s + (node.properties.outstanding || 0), 0);
      const totalEmi = activeLoans.reduce((s, { node }) => s + (node.properties.emi || 0), 0);

      results.answer = `Active loans: ${activeLoans.length}. Total outstanding: ₹${totalOutstanding.toLocaleString()}. Monthly EMI: ₹${totalEmi.toLocaleString()}.`;
      results.data = { loans: activeLoans.map(l => l.node.properties), totalOutstanding, totalEmi };
    }

    // Investment queries
    else if (questionLower.match(/invest|portfolio|return|stock|mutual fund/)) {
      const investments = this.graph.getNeighbors(`user:${userId}`, 'invested_in');
      const totalValue = investments.reduce((s, { node }) => s + (node.properties.value || 0), 0);
      const totalInvested = investments.reduce((s, { node }) => s + (node.properties.invested || 0), 0);

      results.answer = `Portfolio: ${investments.length} investments. Current value: ₹${totalValue.toLocaleString()}. Invested: ₹${totalInvested.toLocaleString()}. ${totalInvested > 0 ? `Returns: ${((totalValue - totalInvested) / totalInvested * 100).toFixed(1)}%` : ''}`;
      results.data = { investments: investments.map(i => i.node.properties), totalValue, totalInvested };
    }

    // General search
    else {
      const searchResults = this.graph.search(question, 5);
      results.relatedNodes = searchResults.map(r => r.node);
      results.answer = searchResults.length > 0
        ? `Found ${searchResults.length} related items: ${searchResults.map(r => `${r.node.type}: ${r.node.properties.name || r.node.id}`).join(', ')}`
        : 'No relevant information found in your financial data.';
    }

    return results;
  }

  async save(userId) {
    await this._ensureDir();
    const filePath = path.join(this.dataDir, `${userId}_knowledge_graph.json`);
    const data = this.graph.serialize();
    await fs.promises.writeFile(filePath, JSON.stringify(data));
  }

  async load(userId) {
    const filePath = path.join(this.dataDir, `${userId}_knowledge_graph.json`);
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      this.graph.deserialize(JSON.parse(raw));
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// §3  REASONING ENGINE — Graph-Based Financial Reasoning
// ============================================================================

class GraphReasoningEngine {
  constructor(graph) {
    this.graph = graph;
  }

  // Chain of reasoning for financial decisions
  reason(userId, question) {
    const chain = [];

    // Step 1: Identify relevant entities
    const searchResults = this.graph.search(question, 10);
    chain.push({
      step: 'entity_identification',
      found: searchResults.length,
      entities: searchResults.map(r => ({ id: r.node.id, type: r.node.type, relevance: r.relevance }))
    });

    // Step 2: Expand context through graph traversal
    const context = {};
    for (const result of searchResults.slice(0, 3)) {
      const subgraph = this.graph.findSubgraph(result.node.id, 2);
      context[result.node.id] = {
        node: result.node,
        related: subgraph.nodes.length,
        edges: subgraph.edges.length
      };
    }
    chain.push({ step: 'context_expansion', context });

    // Step 3: Apply financial rules
    const concepts = this.graph.getNodesByType('financial_concept');
    const applicableRules = concepts.filter(c => {
      const propsStr = JSON.stringify(c.properties).toLowerCase();
      return question.toLowerCase().split(/\s+/).some(word =>
        word.length > 3 && propsStr.includes(word)
      );
    });
    chain.push({
      step: 'rule_application',
      rules: applicableRules.map(r => ({ name: r.properties.name, rule: r.properties.rule }))
    });

    // Step 4: Generate reasoning
    const reasoning = this._synthesize(chain, question);
    chain.push({ step: 'synthesis', reasoning });

    return {
      question,
      chain,
      conclusion: reasoning,
      confidence: Math.min(searchResults.length / 5, 1) * 0.8 + (applicableRules.length > 0 ? 0.2 : 0)
    };
  }

  _synthesize(chain, question) {
    const entities = chain[0]?.entities || [];
    const rules = chain[2]?.rules || [];

    let reasoning = '';
    if (entities.length > 0) {
      reasoning += `Based on ${entities.length} relevant data points in your financial profile`;
    }
    if (rules.length > 0) {
      reasoning += `, applying ${rules.map(r => r.name).join(' and ')} principles`;
    }
    if (reasoning) reasoning += '.';

    return reasoning || 'Insufficient data for detailed reasoning.';
  }

  // Predictive reasoning: What would happen if...
  whatIf(userId, scenario) {
    const result = {
      scenario,
      impacts: [],
      recommendations: []
    };

    if (scenario.type === 'increase_expense') {
      const { category, amount } = scenario;
      const catNode = this.graph.getNode(`category:${category}`);
      if (catNode) {
        const currentTotal = catNode.properties.totalSpent || 0;
        const increase = amount || currentTotal * 0.2;
        result.impacts.push({
          area: 'spending',
          impact: `${category} spending would increase by ₹${increase.toLocaleString()}`,
          severity: increase > currentTotal * 0.5 ? 'high' : 'medium'
        });
      }
    }

    if (scenario.type === 'take_loan') {
      const { amount, rate, tenure } = scenario;
      const emi = amount * rate / 12 * Math.pow(1 + rate / 12, tenure * 12) /
        (Math.pow(1 + rate / 12, tenure * 12) - 1);
      result.impacts.push({
        area: 'debt',
        impact: `New EMI of ₹${Math.round(emi).toLocaleString()} per month`,
        totalPayment: Math.round(emi * tenure * 12),
        totalInterest: Math.round(emi * tenure * 12 - amount)
      });
    }

    return result;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  KnowledgeGraph,
  FinancialKnowledgeGraphBuilder,
  GraphReasoningEngine
};
