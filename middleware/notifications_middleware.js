// Import required modules
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

// Middleware to handle notifications
module.exports.setNotifications = async (req, res, next) => {
    try {
        // Only set notifications for authenticated users
        if (req.isAuthenticated()) {
            // If notifications are already in session and we're not on the notifications page,
            // use those to avoid database queries on every request
            if (req.session.notifications && req.originalUrl !== '/notifications') {
                res.locals.notifications = req.session.notifications;
                return next();
            }
            
            // Fetch user's unread notifications count from database
            const unreadCount = await Notification.countDocuments({
                recipient: req.user._id,
                read: false
            });
            
            // Fetch latest 5 notifications for the dropdown
            const latestNotifications = await Notification.find({ recipient: req.user._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('relatedTo', 'name email');
            
            // Format notifications for display
            const formattedNotifications = latestNotifications.map(notification => ({
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
            
            // Create notifications object
            const notifications = {
                hasUnread: unreadCount > 0,
                items: formattedNotifications
            };
            
            // Store in session for subsequent requests
            req.session.notifications = notifications;
            req.session.save();
            
            // Make notifications available to all views
            res.locals.notifications = notifications;
        }
    } catch (err) {
        console.error('Error in notifications middleware:', err);
        // Don't block the request if there's an error with notifications
    }
    
    next();
};
