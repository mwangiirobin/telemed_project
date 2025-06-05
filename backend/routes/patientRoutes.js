import express from 'express';
import { getCurrentPatient } from '../controllers/patientController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Add this route
router.get('/me', requireAuth, getCurrentPatient);

export default router;