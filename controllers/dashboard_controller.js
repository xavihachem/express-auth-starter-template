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
        // Fetch all users from the database
        const users = await User.find({});
        
        return res.render('admin_panel', {
            users
        });
    } catch (err) {
        console.log('Error in admin panel controller:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/');
    }
};

// Grant investment access to a user
module.exports.grantInvestmentAccess = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const { userId } = req.body;
        
        if (!userId) {
            req.flash('error', 'User ID is required');
            return res.redirect('/admin');
        }
        
        // Find the user to get their details
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }
        
        // Update the user's investment access status to 'access'
        await User.findByIdAndUpdate(userId, { investmentAccess: 'access' });
        
        // Create a notification for the user
        const Notification = require('../models/notification');
        await Notification.notifyUser(userId, {
            title: 'Investment Access Approved',
            message: 'Your request for investment access has been approved. You can now access the investment features.',
            type: 'success',
            icon: 'check-circle',
            actionType: 'investment_access_approved'
        });
        
        req.flash('success', 'Investment access granted successfully');
        return res.redirect('/admin');
    } catch (err) {
        console.log('Error granting investment access:', err);
        req.flash('error', 'Failed to grant investment access');
        return res.redirect('/admin');
    }
};

// Reject investment access for a user
module.exports.rejectInvestmentAccess = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const { userId } = req.body;
        
        if (!userId) {
            req.flash('error', 'User ID is required');
            return res.redirect('/admin');
        }
        
        // Find the user to get their details
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }
        
        // Update the user's investment access status to 'rejected'
        await User.findByIdAndUpdate(userId, { investmentAccess: 'rejected' });
        
        // Create a notification for the user
        const Notification = require('../models/notification');
        await Notification.notifyUser(userId, {
            title: 'Investment Access Request Rejected',
            message: 'Your request for investment access has been reviewed and could not be approved at this time.',
            type: 'danger',
            icon: 'times-circle',
            actionType: 'investment_access_rejected'
        });
        
        req.flash('success', 'Investment access request rejected');
        return res.redirect('/admin');
    } catch (err) {
        console.log('Error rejecting investment access:', err);
        req.flash('error', 'Failed to reject investment access request');
        return res.redirect('/admin');
    }
};

// Show wallet form for a user
module.exports.walletForm = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const userId = req.params.userId;
        
        if (!userId) {
            req.flash('error', 'User ID is required');
            return res.redirect('/admin');
        }
        
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }
        
        // Render the wallet form
        return res.render('wallet_form', { user });
    } catch (err) {
        console.log('Error showing wallet form:', err);
        req.flash('error', 'Failed to load wallet form');
        return res.redirect('/admin');
    }
};

// Set deposit wallet for a user
module.exports.setDepositWallet = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const { userId, depositWallet } = req.body;
        
        if (!userId || !depositWallet) {
            req.flash('error', 'User ID and deposit wallet are required');
            return res.redirect('/admin');
        }
        
        // Update the user's deposit wallet
        await User.findByIdAndUpdate(userId, { depositWallet });
        
        req.flash('success', 'Deposit wallet set successfully');
        return res.redirect('/admin');
    } catch (err) {
        console.log('Error setting deposit wallet:', err);
        req.flash('error', 'Failed to set deposit wallet');
        return res.redirect('/admin');
    }
};
