// Import required modules
const User = require('../models/user');
const Notification = require('../models/notification');
const moment = require('moment');

// Helper function to format notification time
function formatNotificationTime(date) {
    return moment(date).fromNow();
}

// Helper function to map notification type to background color
function getNotificationBgColor(type) {
    const colorMap = {
        'info': 'info',
        'success': 'success',
        'warning': 'warning',
        'danger': 'danger'
    };
    return colorMap[type] || 'primary';
}

// Controller for notifications page
module.exports.notifications = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to view notifications');
            return res.redirect('/sign-in');
        }
        
        // Fetch user's notifications from database
        let userNotifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 }) // Sort by newest first
            .populate('relatedTo', 'name email');
        
        // Format notifications for display
        const formattedNotifications = userNotifications.map(notification => ({
            id: notification._id,
            icon: notification.icon,
            title: notification.title,
            message: notification.message,
            time: formatNotificationTime(notification.createdAt),
            read: notification.read,
            bgColor: getNotificationBgColor(notification.type),
            actionType: notification.actionType,
            actionId: notification.actionId,
            relatedTo: notification.relatedTo
        }));
        
        // Check if there are any unread notifications
        const hasUnread = formattedNotifications.some(notification => !notification.read);
        
        // Create notifications object for the view
        const notifications = {
            hasUnread,
            items: formattedNotifications
        };
        
        // Store in session for navbar display
        req.session.notifications = notifications;
        req.session.save();
        
        return res.render('notifications', {
            title: 'Notifications',
            user: req.user,
            notifications
        });
    } catch (err) {
        console.error('Error in notifications controller:', err);
        req.flash('error', 'An error occurred while loading notifications');
        return res.redirect('back');
    }
};

// Mark all notifications as read
module.exports.markAllAsRead = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            if (req.xhr) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }
            req.flash('error', 'Please sign in to manage notifications');
            return res.redirect('/sign-in');
        }
        
        // Update all unread notifications to read in the database
        await Notification.markAllAsRead(req.user._id);
        
        // Update session notifications
        if (req.session.notifications) {
            req.session.notifications.hasUnread = false;
            req.session.notifications.items = req.session.notifications.items.map(item => {
                return { ...item, read: true };
            });
            req.session.save();
        }
        
        // If it's an AJAX request, send JSON response
        if (req.xhr) {
            return res.status(200).json({ success: true });
        }
        
        // Otherwise redirect back to notifications page
        req.flash('success', 'All notifications marked as read');
        return res.redirect('/notifications');
    } catch (err) {
        console.error('Error marking notifications as read:', err);
        if (req.xhr) {
            return res.status(500).json({ success: false, message: 'An error occurred' });
        }
        req.flash('error', 'An error occurred while marking notifications as read');
        return res.redirect('back');
    }
};
