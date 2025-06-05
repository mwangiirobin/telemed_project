import express from 'express';
import { registerPatient, loginPatient, logoutPatient } from '../controllers/authControllers.js';

const router = express.Router();

router.post('/register', registerPatient);
router.post('/login', loginPatient);
router.post('/logout', logoutPatient);

export default router;