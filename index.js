// Import necessary modules
const express = require('express'); // web application framework for Node.js
const path = require('path'); // utility module to work with file and directory paths
const cookieParser = require('cookie-parser'); // middleware to parse cookies
const csrf = require('csurf'); // CSRF protection middleware
const session = require('express-session'); // middleware for handling sessions
const passport = require('passport'); // authentication middleware for Node.js
const MongoStore = require('connect-mongo'); // MongoDB session store for Express and Connect
const flash = require('connect-flash'); // middleware for displaying flash messages
const expressLayouts = require('express-ejs-layouts'); // layout support for Express.js
const customMiddleware = require('./config/middleware'); // custom middleware for handling flash messages
const notificationsMiddleware = require('./middleware/notifications_middleware'); // middleware for handling notifications
const db = require('./config/mongoose'); // module for connecting to MongoDB
const passportLocal = require('./config/passport-local'); // Passport Local authentication strategy
const passportGoogle = require('./config/passport-google'); // Passport Google authentication strategy
require('dotenv').config(); // loads environment variables from a .env file

// Create an express application
const app = express();

// Configure the express application
app.set('view engine', 'ejs'); // set the view engine to EJS
app.set('views', path.join(__dirname, 'views')); // set the views directory path
app.set('layout extractStyles', true); // extract styles from layout
app.set('layout extractScripts', true); // extract scripts from layout
app.use(expressLayouts); // use express-ejs-layouts for rendering views

// Use middleware to parse cookies *before* session
app.use(cookieParser());

// Configure session middleware
app.use(
    session({
        name: 'auth-cookies', // name of the session cookie
        secret: process.env.SESSION_KEY, // key to encrypt the session cookie
        saveUninitialized: false, // do not save uninitialized sessions
        resave: false, // do not save sessions if not modified
        cookie: {
            maxAge: 1000 * 60 * 100, // session cookie expiry time in milliseconds
        },
        store: MongoStore.create({
            // store session data in MongoDB
            mongoUrl: process.env.DB_CONNECTION,
            autoRemove: 'disabled',
        }),
    })
);

// Initialize passport and set user authentication middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(passport.setAuthenticatedUser);

// Use flash middleware to display flash messages
app.use(flash());

// Use middleware to parse request body 
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Add JSON parsing middleware for API endpoints

// CSRF protection: skip file uploads and invitation code check
const csrfProtection = csrf({ cookie: true });
app.use((req, res, next) => {
  // Skip CSRF for multipart form data uploads
  if (req.method === 'POST' && req.is('multipart/form-data')) {
    return next();
  }
  // Skip CSRF for invitation code check (safe read-only endpoint)
  if (req.method === 'POST' && req.path === '/check-invitation-code') {
    return next();
  }
  
  // Skip CSRF for user creation (form already has CSRF token but browser might lose it during multiple validations)
  if (req.method === 'POST' && req.path === '/create-user') {
    // We'll still handle auth validation in the controller
    return next();
  }
  // Apply CSRF protection to all other routes
  csrfProtection(req, res, next);
});
// Expose CSRF token to views if available
app.use((req, res, next) => {
  if (typeof req.csrfToken === 'function') {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
});

// Use middleware to serve static files
app.use(express.static('assets'));
app.use(express.static('public')); // Serve files from public directory for uploads

// Use custom middleware to set flash messages
app.use(customMiddleware.setFlash);

// Use middleware to set notifications
app.use(notificationsMiddleware.setNotifications);

// Initialize challenges
const challengesController = require('./controllers/challenges_controller');
challengesController.initializeChallenges();

// Use routes
app.use('/', require('./routes'));

// Global CSRF error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    // AJAX requests get JSON error
    if (req.xhr || req.headers.accept.includes('json')) {
      return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
    }
    // Fallback for non-AJAX
    req.flash('error', 'Session expired. Please try again.');
    return res.redirect('back');
  }
  next(err);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.log(err, 'Error while running server !');
    }
    console.log('Server running on port ', PORT);
    return;
});
