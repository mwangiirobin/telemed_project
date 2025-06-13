// In app.js
import fs from 'fs';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import pgSession from 'connect-pg-simple';
// import logger from './logger.js'; // Uncomment if you use it

dotenv.config();
console.log('APP.JS STARTED - VERCEL LOG TEST (TOP LEVEL)'); 

const PgSession = pgSession(session);
const app = express();
app.set('trust proxy', 1);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Trust vercel proxy
app.set('trust proxy', 1);

console.log('EXPRESS APP INITIALIZED - VERCEL LOG TEST');
// Security Middleware
app.use(helmet());
app.use(cors({
  // IMPORTANT: Update this for Vercel.
  // You'll set FRONTEND_URL in Vercel environment variables to your Vercel app's domain
  // e.g., https://your-project-name.vercel.app
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Or your local dev port
  credentials: true
}));

// Rate Limiting 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Temporarily increase to 1000 to avoid being blocked during testing
  standardHeaders: true,
  legacyHeaders: false, });
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware (Ensure SESSION_SECRET is in your environment variables)
app.use(session({
  store: new PgSession({  // ADD STORE CONFIG HERE
    conString: process.env.SUPABASE_CONNECTION_STRING,
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'fa89627b82d83b153a0312437d71dd38e2abc9a625e716683a9269210da316b6',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // Always true on Vercel
    httpOnly: true,
    sameSite: 'none', // Required for cross-origin
    //domain: process.env.NODE_ENV === 'production' 
     // ? '.mwangiistelemed-project.vercel.app'  // YOUR ACTUAL DOMAIN HERE
     // : undefined // Omit domain in development
  }
}));

// Logging
app.use(morgan('dev')); // Or 'combined' for more details

// --- CORRECTED STATIC FILE SERVING ---
// Serve static assets (CSS, client-side JS, images) from frontend/public
// This makes files inside 'frontend/public/' accessible from the root.
// e.g., frontend/public/css/style1.css will be available at /css/style1.css
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
// Add explicit route for JS files
app.use('/js', express.static(path.join(__dirname, '..', 'frontend', 'public', 'js')));
//HEALTH CHECK ROUTE 
app.get('/health', (req, res) => {
  console.log('Health check executed - should appear in Vercel logs');
  res.status(200).send('OK');
});
app.get('/session-check', (req, res) => {
  res.json({
    sessionId: req.sessionID,
    userId: req.session.userId,
    cookie: req.headers.cookie
  });
});


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);

// --- CORRECTED HTML SERVING ROUTES ---
// Serves the main page
app.get('/', (req, res) => {
  console.log(`GET / route hit. Attempting to send index.html. Path: ${path.join(__dirname, 'frontend', 'index.html')}`);
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'), (err) => {
    if (err) {
      console.error('Error sending file for / route:', err);
      // More specific error handling for file not found
      if (err.code === "ENOENT") {
         res.status(404).send('Error: Main page HTML file not found by the server.');
      } else {
         res.status(500).send('Server error while trying to serve the main page.');
      }
    } else {
      console.log('Successfully sent index.html for / route.');
    }
  });
});

// Routes for login, register, dashboard HTML pages
// Your frontend JS navigates to these paths, so keep them or simplify
app.get('/frontend/views/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'login.html'));
});

app.get('/frontend/views/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'register.html'));
});

// Route for the dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    // Redirect to the correct login page path
    return res.redirect('/frontend/views/login.html');
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'dashboard.html'));
});

// CATCH-ALL ROUTE 
// Updated catch-all route
app.get('*', (req, res) => {
  // Try to serve static assets first
  const staticPath = path.join(__dirname, '..', 'frontend', 'public', req.path);
  if (fs.existsSync(staticPath)) {
    return res.sendFile(staticPath);
  }
  // Explicitly handle known HTML files
  if (req.path === '/frontend/views/login.html') {
    return res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'login.html'));
  }
  
  if (req.path === '/frontend/views/register.html') {
    return res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'register.html'));
  }
  
  if (req.path === '/dashboard') {
    if (!req.session.userId) {
      return res.redirect('/frontend/views/login.html');
    }
    return res.sendFile(path.join(__dirname, '..', 'frontend', 'views', 'dashboard.html'));
  }
  
  // Serve static files if they exist
  const filePath = path.join(__dirname, '..', 'frontend', req.path);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  
  // Default to index.html for client-side routing
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});



// Global error handler (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// --- REMOVE app.listen() ---
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// --- EXPORT THE APP FOR VERCEL ---
export default app; // If using ES Modules (which you are with "type": "module")
