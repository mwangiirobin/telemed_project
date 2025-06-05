export const authenticateUser = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export const authorizePatient = (req, res, next) => {
  if (req.session.role !== 'patient') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
export const requireRole = (role) => {
  return (req, res, next) => {
    if (req.session.role !== role) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    next();
  };
};
// Middleware to verify resource ownership
export const checkOwnership = (resourceType) => async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    
    if (resourceType === 'doctor') {
      if (req.session.doctorId !== parseInt(resourceId)) {
        return res.status(403).json({ error: 'Not your resource' });
      }
    }
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Ownership verification failed' });
  }
};
export const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};