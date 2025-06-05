import express from 'express';
import { 
  bookAppointment,
  getAppointments,
  cancelAppointment
} from '../controllers/appointmentController.js';
import { requireRole } from '../middleware/authMiddleware.js';
import { checkOwnership } from '../middleware/ownershipMiddleware.js';

const router = express.Router();

// Patient appointment booking
router.post('/',
  requireRole('patient'),
  bookAppointment
);

// Get patient's appointments
router.get('/',
  requireRole('patient'),
  getAppointments
);

// Cancel appointment
router.delete('/:id',
  requireRole('patient'),
  checkOwnership('appointment'),
  cancelAppointment
);

export default router;