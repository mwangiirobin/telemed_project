import express from 'express';
import { 
  createDoctor,
  getDoctorById,
  updateAvailability,
  listDoctors
} from '../controllers/doctorController.js';

import { requireRole } from '../middleware/authMiddleware.js';
import { checkOwnership } from '../middleware/ownershipMiddleware.js';

const router = express.Router();

// Admin-only doctor creation
router.post('/', 
  requireRole('admin'), 
  createDoctor
);

// Doctor-specific availability update (owner or admin only)
router.put('/:id/availability', 
  requireRole('doctor'), 
  checkOwnership('doctor'), 
  updateAvailability
);

// Public doctor listing
router.get('/', 
  listDoctors
);

router.get('/:id', getDoctorById); 

export default router;

