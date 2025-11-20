const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();

// Get all real estate properties
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('realEstate')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const properties = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(properties);
  } catch (error) {
    console.error('Error fetching real estate:', error);
    res.status(500).json({ error: 'Failed to fetch real estate properties' });
  }
});

// Add new property
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const propertyData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('realEstate').add(propertyData);
    const doc = await docRef.get();
    
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error adding property:', error);
    res.status(500).json({ error: 'Failed to add property' });
  }
});

// Get property by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const doc = await db.collection('realEstate').doc(req.params.id).get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Update property
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('realEstate').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// Delete property
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const docRef = db.collection('realEstate').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data().userId !== userId) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    await docRef.delete();
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

module.exports = router;
