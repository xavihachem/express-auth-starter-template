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
            withdrawWallet: user.withdrawWallet || 'Not set'
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
        
        // Render the profile page
        return res.render('profile', {
            title: 'User Profile',
            user: user,
            stats: stats,
            accessPercentage: accessPercentage,
            userRank: userRank,
            canChangeName: canChangeName,
            daysUntilNameChange: daysUntilNameChange
        });
    } catch (err) {
        console.log('Error in profile controller:', err);
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
 * Updates the user's avatar with an uploaded image
 */
module.exports.updateAvatar = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to update your profile');
            return res.redirect('/sign-in');
        }
        
        // Check if file was uploaded
        if (!req.file) {
            req.flash('error', 'Please select an image to upload');
            return res.redirect('/profile');
        }
        
        // Find the current user
        const user = await User.findById(req.user._id);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }
        
        // Check if user has changed their avatar in the last week
        if (user.lastAvatarChange && ((new Date() - new Date(user.lastAvatarChange)) / (1000 * 60 * 60 * 24) < 7)) {
            const daysLeft = Math.ceil(7 - ((new Date() - new Date(user.lastAvatarChange)) / (1000 * 60 * 60 * 24)));
            req.flash('error', `You can only change your profile picture once every 7 days. Please wait ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}.`);
            return res.redirect('/profile');
        }
        
        // Process the image - crop to square and resize
        const { cropX, cropY, cropWidth, cropHeight } = req.body;
        
        // Generate unique output filename
        const outputFilename = `${uuidv4()}.jpg`;
        const outputPath = path.join('public/uploads/avatars', outputFilename);
        const fullOutputPath = path.join(__dirname, '..', outputPath);
        
        // Use sharp to process the image from memory buffer
        await sharp(req.file.buffer)
            .extract({
                left: parseInt(cropX) || 0,
                top: parseInt(cropY) || 0,
                width: parseInt(cropWidth) || 300,
                height: parseInt(cropHeight) || 300
            })
            .resize(200, 200) // Final size of avatar
            .jpeg({ quality: 90 })
            .toFile(fullOutputPath);
            
        // If user already had an avatar, delete the old one
        if (user.avatar) {
            try {
                const oldAvatarPath = path.join(__dirname, '..', 'public', user.avatar);
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            } catch (err) {
                console.log('Warning: Could not delete old avatar file:', err.message);
                // Continue processing even if we can't delete the old file
            }
        }
        
        // Update the user's avatar path in the database
        // Store relative path from public folder
        user.avatar = `/uploads/avatars/${outputFilename}`;
        user.lastAvatarChange = new Date(); // Track when the avatar was last changed
        await user.save();
        
        req.flash('success', 'Your profile picture has been updated successfully');
        return res.redirect('/profile');
    } catch (err) {
        console.log('Error in update avatar controller:', err);
        req.flash('error', 'An error occurred while updating your profile picture');
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
        
        return res.render('avatar-upload', {
            title: 'Upload Profile Picture',
            user: req.user
        });
    } catch (err) {
        console.log('Error in show avatar upload controller:', err);
        req.flash('error', 'An error occurred while loading the avatar upload page');
        return res.redirect('/profile');
    }
};

/**
 * Handles contact support form submissions
 * Creates a notification for admins and confirms receipt to the user
 */
module.exports.contactSupport = async function(req, res) {
    try {
        console.log('Contact support request received:', req.body);
        
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            console.log('User not authenticated');
            return res.status(401).json({ success: false, message: 'Please sign in to contact support' });
        }
        
        // Get subject and message from request body
        // This handles both form data and JSON requests
        const subject = req.body.subject;
        const message = req.body.message;
        
        console.log('Support request data:', { subject, message });
        
        // Validate input
        if (!subject || !message || subject.trim() === '' || message.trim() === '') {
            console.log('Invalid input: subject or message is empty');
            return res.status(400).json({ success: false, message: 'Subject and message are required' });
        }
        
        // Find the current user
        const user = await User.findById(req.user._id);
        console.log('User found:', user ? user._id : 'No user found');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Check if user has already submitted a ticket in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Find all admin users to check for recent tickets from this user
        const adminUsers = await User.find({ role: 'admin' });
        console.log('Admin users found:', adminUsers.length);
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
            console.log('User has already submitted a ticket in the last 24 hours');
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
                    
                    console.log('Adding support notification to admin:', admin._id);
                    console.log('Notification:', supportNotification);
                    
                    // Use findByIdAndUpdate instead of save to avoid version conflicts
                    const updatedAdmin = await User.findByIdAndUpdate(
                        admin._id,
                        { $push: { notifications: { $each: [supportNotification], $position: 0 } } },
                        { new: true }
                    );
                    
                    console.log('Admin after update - notifications count:', 
                        updatedAdmin.notifications ? updatedAdmin.notifications.length : 'undefined');
                    console.log('Admin notification saved');
                } catch (error) {
                    console.error('Error adding notification to admin:', error);
                }
            }
        } else {
            console.log('No admin users found to notify');
        }
        
        // Add a confirmation notification to the user using findByIdAndUpdate to avoid version conflicts
        const confirmationNotification = {
            message: 'Your support request has been received',
            details: `We have received your support request: "${subject}". Our team will get back to you soon.`,
            type: 'info',
            createdAt: new Date()
        };
        
        console.log('Adding confirmation notification to user');
        
        // Use findByIdAndUpdate instead of save to avoid version conflicts
        await User.findByIdAndUpdate(
            user._id,
            { $push: { notifications: { $each: [confirmationNotification], $position: 0 } } }
        );
        
        console.log('User notification saved');
        
        // Return success response
        console.log('Support request submitted successfully');
        return res.status(200).json({ success: true, message: 'Your support request has been submitted successfully' });
    } catch (err) {
        console.error('Error in contact support controller:', err);
        return res.status(500).json({ success: false, message: 'An error occurred while submitting your support request' });
    }
};
