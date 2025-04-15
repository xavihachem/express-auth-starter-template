// Controller for handling dashboard routes based on user role
const User = require('../models/user');

// Render the unified dashboard for all users
module.exports.dashboard = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to access your dashboard');
            return res.redirect('/sign-in');
        }

        // Fetch the complete user data from the database to ensure we have the stored userCode
        const user = await User.findById(req.user._id);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/sign-out');
        }
        
        // If user doesn't have a userCode yet, generate and save one
        if (!user.userCode) {
            // Generate a unique code
            const timestamp = new Date().getTime().toString().slice(-4);
            const random = Math.floor(100000 + Math.random() * 900000);
            user.userCode = 'UC' + timestamp + random.toString().substring(0, 2);
            await user.save();
        }

        // Render the unified dashboard with the complete user data
        return res.render('dashboard', {
            completeUser: user
        });
    } catch (err) {
        console.log('Error in dashboard controller:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/');
    }
};

// Admin panel - only accessible by admin users
module.exports.adminPanel = async function(req, res) {
    try {
        // Check if user is authenticated and has admin role
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You do not have permission to access the admin panel');
            return res.redirect('/');
        }
        
        // Fetch all users for the admin panel
        const users = await User.find({});
        
        return res.render('admin_panel', {
            users: users
        });
    } catch (err) {
        console.log('Error in admin panel controller:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/');
    }
};
