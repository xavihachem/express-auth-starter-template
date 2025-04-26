const User = require('../models/user');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * Determines user rank based on challenge points
 */
function getUserRank(points) {
    if (points >= 500) {
        return { name: 'Legend', color: 'danger', icon: 'crown' };
    } else if (points >= 300) {
        return { name: 'Master', color: 'primary', icon: 'star' };
    } else if (points >= 150) {
        return { name: 'Expert', color: 'success', icon: 'medal' };
    } else if (points >= 50) {
        return { name: 'Intermediate', color: 'warning', icon: 'award' };
    } else {
        return { name: 'Beginner', color: 'info', icon: 'user-graduate' };
    }
}

/**
 * Renders the user profile page
 * Only accessible by authenticated users
 */
module.exports.profile = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to access your profile');
            return res.redirect('/sign-in');
        }

        // Find the current user with complete data
        const user = await User.findById(req.user._id);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }
        
        // Get user stats
        const stats = {
            challengePoints: user.challengePoints || 0,
            completedChallenges: user.completedChallenges ? user.completedChallenges.length : 0,
            investmentAccess: user.investmentAccess || 'rejected',
            balance: user.balance || 0,
            withdraw: user.withdraw || 0,
            depositWallet: user.depositWallet || 'Not set',
            withdrawWallet: user.withdrawWallet || 'Not set',
            // For stats display - these will be used in the weekly targets section
            completedTargets: 3, // Placeholder value
            weeklyTargets: 5     // Placeholder value
        };
        
        // Calculate investment access status percentage
        let accessPercentage = 0;
        if (user.investmentAccess === 'access') {
            accessPercentage = 100;
        } else if (user.investmentAccess === 'pending') {
            accessPercentage = 50;
        } else {
            accessPercentage = 25;
        }
        
        // Get user rank based on challenge points
        const userRank = getUserRank(stats.challengePoints);
        
        // Check if name change is allowed (not changed in the last 30 days)
        const canChangeName = !user.lastNameChange || ((new Date() - new Date(user.lastNameChange)) / (1000 * 60 * 60 * 24) >= 30);
        const daysUntilNameChange = user.lastNameChange ? 
            Math.max(0, 30 - Math.floor((new Date() - new Date(user.lastNameChange)) / (1000 * 60 * 60 * 24))) : 0;
        
        // Get top 5 users for the leaderboard
        const topUsers = await User.find({})
            .sort({ challengePoints: -1 })
            .limit(5);
        
        // Render the profile page
        return res.render('profile', {
            title: 'User Profile',
            user: user,
            stats: stats,
            accessPercentage: accessPercentage,
            userRank: userRank,
            canChangeName: canChangeName,
            daysUntilNameChange: daysUntilNameChange,
            topUsers: topUsers
        });
    } catch (err) {
        // Handle error silently
        req.flash('error', 'An error occurred while loading your profile');
        return res.redirect('/');
    }
};

/**
 * Updates the user's name
 * Limited to once every 30 days
 */
module.exports.updateName = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to update your profile');
            return res.redirect('/sign-in');
        }
        
        const { newName } = req.body;
        
        if (!newName || newName.trim() === '') {
            req.flash('error', 'Name cannot be empty');
            return res.redirect('/profile');
        }
        
        // Find the current user
        const user = await User.findById(req.user._id);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }
        
        // Check if name change is allowed (not changed in the last 30 days)
        if (user.lastNameChange && ((new Date() - new Date(user.lastNameChange)) / (1000 * 60 * 60 * 24) < 30)) {
            const daysLeft = Math.ceil(30 - ((new Date() - new Date(user.lastNameChange)) / (1000 * 60 * 60 * 24)));
            req.flash('error', `You can only change your name once every 30 days. Please wait ${daysLeft} more days.`);
            return res.redirect('/profile');
        }
        
        // Update the user's name and last name change date
        user.name = newName.trim();
        user.lastNameChange = new Date();
        await user.save();
        
        req.flash('success', 'Your name has been updated successfully');
        return res.redirect('/profile');
    } catch (err) {
        console.log('Error in update name controller:', err);
        req.flash('error', 'An error occurred while updating your name');
        return res.redirect('/profile');
    }
};

/**
 * Updates the user's avatar with a selected predefined avatar
 */
module.exports.updateAvatar = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to update your profile');
            return res.redirect('/sign-in');
        }
        
        // Check if an avatar was selected
        if (!req.body.selectedAvatar) {
            req.flash('error', 'Please select an avatar');
            return res.redirect('/upload-avatar');
        }
        
        // Get user from database
        const user = await User.findById(req.user._id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/profile');
        }
        
        // Validate the selected avatar path
        const selectedAvatar = req.body.selectedAvatar;
        
        // Security check: Ensure the path is from our avatars directory
        if (!selectedAvatar.startsWith('/css/images/Avatar/')) {
            req.flash('error', 'Invalid avatar selection');
            return res.redirect('/upload-avatar');
        }
        
        // Update user avatar in database with the selected avatar path
        user.avatar = selectedAvatar;
        user.lastAvatarChange = new Date(); // Track when the avatar was last changed
        await user.save();
        
        req.flash('success', 'Your profile avatar has been updated successfully');
        return res.redirect('/profile');
    } catch (err) {
        console.log('Error in update avatar controller:', err);
        req.flash('error', 'An error occurred while updating your profile avatar');
        return res.redirect('/profile');
    }
};

/**
 * Shows the avatar upload page
 */
module.exports.showAvatarUpload = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to update your profile');
            return res.redirect('/sign-in');
        }
        
        // Get top 5 users for the leaderboard
        const users = await User.find({})
            .sort({ challengePoints: -1 })
            .limit(10);
        
        // Render the avatar selection page
        return res.render('avatar-upload', {
            title: 'Choose Avatar',
            user: req.user,
            users: users
        });
    } catch (err) {
        console.log('Error in show avatar upload controller:', err);
        req.flash('error', 'An error occurred while loading the avatar selection page');
        return res.redirect('/profile');
    }
};

/**
 * Handles contact support form submissions
 * Creates a notification for admins and confirms receipt to the user
 */
module.exports.contactSupport = async function(req, res) {
    try {
        // Process contact support request
        
        // Check if user is authenticated
        if (!req.isAuthenticated()) {

            return res.status(401).json({ success: false, message: 'Please sign in to contact support' });
        }
        
        // Get subject and message from request body
        // This handles both form data and JSON requests
        const subject = req.body.subject;
        const message = req.body.message;
        

        
        // Validate input
        if (!subject || !message || subject.trim() === '' || message.trim() === '') {

            return res.status(400).json({ success: false, message: 'Subject and message are required' });
        }
        
        // Find the current user
        const user = await User.findById(req.user._id);

        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Check if user has already submitted a ticket in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Find all admin users to check for recent tickets from this user
        const adminUsers = await User.find({ role: 'admin' });

        let hasRecentTicket = false;
        
        // Check each admin's notifications for recent tickets from this user
        for (const admin of adminUsers) {
            if (admin.notifications && admin.notifications.length > 0) {
                const recentTicket = admin.notifications.find(notification => 
                    notification.type === 'support' && 
                    notification.message.includes(`from ${user.name} (${user.email})`) && 
                    new Date(notification.createdAt) > twentyFourHoursAgo
                );
                
                if (recentTicket) {
                    hasRecentTicket = true;
                    break;
                }
            }
        }
        
        if (hasRecentTicket) {
            return res.status(429).json({ 
                success: false, 
                message: 'You have already submitted a support ticket in the last 24 hours. Please wait before submitting another request.' 
            });
        }
        
        // Create a support request notification for admins
        // We already have the admin users from above
        
        if (adminUsers && adminUsers.length > 0) {
            // Find all admin users and add the notification to each
            for (const admin of adminUsers) {
                try {
                    const supportNotification = {
                        message: `Support request from ${user.name} (${user.email}): ${subject}`,
                        details: message,
                        type: 'support',
                        createdAt: new Date(),
                    };
                    

                    
                    // Use findByIdAndUpdate instead of save to avoid version conflicts
                    const updatedAdmin = await User.findByIdAndUpdate(
                        admin._id,
                        { $push: { notifications: { $each: [supportNotification], $position: 0 } } },
                        { new: true }
                    );
                    

                } catch (error) {
                    // Handle error silently
                }
            }
        } else {
            // No admin users found to notify
        }
        
        // Add a confirmation notification to the user using findByIdAndUpdate to avoid version conflicts
        const confirmationNotification = {
            message: 'Your support request has been received',
            details: `We have received your support request: "${subject}". Our team will get back to you soon.`,
            type: 'info',
            createdAt: new Date()
        };
        

        
        // Use findByIdAndUpdate instead of save to avoid version conflicts
        await User.findByIdAndUpdate(
            user._id,
            { $push: { notifications: { $each: [confirmationNotification], $position: 0 } } }
        );
        
        
        // Return success response
        return res.status(200).json({ success: true, message: 'Your support request has been submitted successfully' });
    } catch (err) {
        // Handle error silently
        return res.status(500).json({ success: false, message: 'An error occurred while submitting your support request' });
    }
};
