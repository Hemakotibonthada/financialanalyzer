const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Vendor = require('../models/Vendor');
const Contract = require('../models/Contract');
const { authenticate } = require('../middleware/auth');

// Invoice Routes
router.post('/invoices', authenticate, async (req, res) => {
  try {
    const invoice = new Invoice({ ...req.body, userId: req.user._id });
    await invoice.save();
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/invoices', authenticate, async (req, res) => {
  try {
    const { status, clientId } = req.query;
    const query = { userId: req.user._id };
    if (status) query.status = status;
    if (clientId) query.clientId = clientId;
    
    const invoices = await Invoice.find(query)
      .populate('clientId')
      .populate('projectId')
      .sort({ invoiceDate: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('clientId')
      .populate('projectId');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/invoices/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    Object.assign(invoice, req.body);
    await invoice.save();
    
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/invoices/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/invoices/:id/payments', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    await invoice.recordPayment(req.body.amount, req.body.paymentDate, req.body.paymentMethod, req.body.reference);
    await invoice.save();
    
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/invoices/reports/overdue', authenticate, async (req, res) => {
  try {
    const invoices = await Invoice.getOverdueInvoices(req.user._id);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices/reports/revenue', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await Invoice.getRevenueReport(
      req.user._id,
      new Date(startDate),
      new Date(endDate)
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Client Routes
router.post('/clients', authenticate, async (req, res) => {
  try {
    const client = new Client({ ...req.body, userId: req.user._id });
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/clients', authenticate, async (req, res) => {
  try {
    const { clientType, status } = req.query;
    const query = { userId: req.user._id };
    if (clientType) query.clientType = clientType;
    if (status) query.status = status;
    
    const clients = await Client.find(query).sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/clients/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, userId: req.user._id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/clients/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/clients/:id', authenticate, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/clients/reports/top', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const clients = await Client.getTopClients(req.user._id, limit);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Project Routes
router.post('/projects', authenticate, async (req, res) => {
  try {
    const project = new Project({ ...req.body, userId: req.user._id });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/projects', authenticate, async (req, res) => {
  try {
    const { projectType, status, clientId } = req.query;
    const query = { userId: req.user._id };
    if (projectType) query.projectType = projectType;
    if (status) query.status = status;
    if (clientId) query.clientId = clientId;
    
    const projects = await Project.find(query)
      .populate('clientId')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('clientId');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/projects/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    Object.assign(project, req.body);
    project.calculateFinancials();
    await project.save();
    
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/projects/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects/:id/time', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    await project.trackTime(req.body.hours, req.body.date, req.body.description, req.body.taskId, req.body.teamMember);
    await project.save();
    
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/projects/:id/expenses', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    await project.addExpense(req.body);
    await project.save();
    
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/projects/reports/active', authenticate, async (req, res) => {
  try {
    const projects = await Project.getActiveProjects(req.user._id);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vendor Routes
router.post('/vendors', authenticate, async (req, res) => {
  try {
    const vendor = new Vendor({ ...req.body, userId: req.user._id });
    await vendor.save();
    res.status(201).json(vendor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/vendors', authenticate, async (req, res) => {
  try {
    const { vendorType, status } = req.query;
    const query = { userId: req.user._id };
    if (vendorType) query.vendorType = vendorType;
    if (status) query.status = status;
    
    const vendors = await Vendor.find(query).sort({ createdAt: -1 });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vendors/:id', authenticate, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id, userId: req.user._id });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/vendors/:id', authenticate, async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/vendors/:id', authenticate, async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vendors/reports/top', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const vendors = await Vendor.getTopVendors(req.user._id, limit);
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contract Routes
router.post('/contracts', authenticate, async (req, res) => {
  try {
    const contract = new Contract({ ...req.body, userId: req.user._id });
    await contract.save();
    res.status(201).json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/contracts', authenticate, async (req, res) => {
  try {
    const { contractType, status } = req.query;
    const query = { userId: req.user._id };
    if (contractType) query.contractType = contractType;
    if (status) query.status = status;
    
    const contracts = await Contract.find(query).sort({ createdAt: -1 });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/contracts/:id', authenticate, async (req, res) => {
  try {
    const contract = await Contract.findOne({ _id: req.params.id, userId: req.user._id });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/contracts/:id', authenticate, async (req, res) => {
  try {
    const contract = await Contract.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/contracts/:id', authenticate, async (req, res) => {
  try {
    const contract = await Contract.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/contracts/:id/renew', authenticate, async (req, res) => {
  try {
    const contract = await Contract.findOne({ _id: req.params.id, userId: req.user._id });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    
    await contract.renew(req.body.newEndDate, req.body.newValue, req.body.notes);
    await contract.save();
    
    res.json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/contracts/alerts/expiring', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const contracts = await Contract.getExpiringContracts(req.user._id, days);
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Summary
router.get('/dashboard/summary', authenticate, async (req, res) => {
  try {
    const [invoiceCount, clientCount, projectCount, vendorCount, contractCount] = await Promise.all([
      Invoice.countDocuments({ userId: req.user._id }),
      Client.countDocuments({ userId: req.user._id }),
      Project.countDocuments({ userId: req.user._id }),
      Vendor.countDocuments({ userId: req.user._id }),
      Contract.countDocuments({ userId: req.user._id })
    ]);
    
    const overdueInvoices = await Invoice.getOverdueInvoices(req.user._id);
    const activeProjects = await Project.getActiveProjects(req.user._id);
    
    res.json({
      invoices: {
        total: invoiceCount,
        overdue: overdueInvoices.length
      },
      clients: { total: clientCount },
      projects: {
        total: projectCount,
        active: activeProjects.length
      },
      vendors: { total: vendorCount },
      contracts: { total: contractCount }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
