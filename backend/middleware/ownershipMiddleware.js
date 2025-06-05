import pool from '../config/db.js';

export const checkOwnership = (resourceType) => async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    const userId = req.session.userId;
    const role = req.session.role;

    // Admin bypass
    if (role === 'admin') return next();

    let query;
    switch(resourceType) {
      case 'appointment':
        query = 'SELECT patient_id FROM appointments WHERE id = ?';
        break;
      case 'doctor':
        query = 'SELECT id FROM doctors WHERE id = ?';
        break;
      default:
        return res.status(400).json({ error: 'Invalid resource type' });
    }

    const [rows] = await pool.query(query, [resourceId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Resource not found' });

    const ownerId = resourceType === 'appointment' ? rows[0].patient_id : rows[0].id;
    if (ownerId !== userId) return res.status(403).json({ error: 'Access denied' });

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ error: 'Ownership verification failed' });
  }
};