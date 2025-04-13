// Controller for handling dashboard routes based on user role
const User = require('../models/user');

// Render the appropriate dashboard based on user role
module.exports.dashboard = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to access your dashboard');
            return res.redirect('/sign-in');
        }

        // Determine which dashboard to render based on user role
        if (req.user.role === 'admin') {
            return res.render('admin_dashboard');
        } else {
            return res.render('user_dashboard');
        }
    } catch (err) {
        console.log('Error in dashboard controller:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/');
    }
};

// Admin dashboard - only accessible by admin users
module.exports.adminDashboard = function(req, res) {
    return res.render('admin_dashboard');
};

// User dashboard - only accessible by regular users
module.exports.userDashboard = function(req, res) {
    return res.render('user_dashboard');
};
