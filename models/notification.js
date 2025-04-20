const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['info', 'success', 'warning', 'danger'],
            default: 'info'
        },
        icon: {
            type: String,
            default: 'bell'
        },
        read: {
            type: Boolean,
            default: false
        },
        relatedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        actionType: {
            type: String,
            enum: ['investment_request', 'withdrawal_request', 'investment_access_approved', 'investment_access_rejected', 'withdrawal_cancelled', 'balance_updated', 'wallet_updated', 'role_updated', 'general'],
            default: 'general'
        },
        actionId: {
            type: String,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }
);

// Static method to create a notification for all admins
notificationSchema.statics.notifyAdmins = async function(notificationData) {
    try {
        const User = mongoose.model('User');
        const admins = await User.find({ role: 'admin' });
        
        const notifications = [];
        
        for (const admin of admins) {
            const notification = new this({
                recipient: admin._id,
                ...notificationData
            });
            
            notifications.push(notification);
        }
        
        if (notifications.length > 0) {
            await this.insertMany(notifications);
        }
        
        return notifications;
    } catch (error) {
        console.error('Error creating admin notifications:', error);
        throw error;
    }
};

// Static method to create a notification for a specific user
notificationSchema.statics.notifyUser = async function(userId, notificationData) {
    try {
        const notification = new this({
            recipient: userId,
            ...notificationData
        });
        
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating user notification:', error);
        throw error;
    }
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
    try {
        const result = await this.updateMany(
            { recipient: userId, read: false },
            { $set: { read: true } }
        );
        
        return result;
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        throw error;
    }
};

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
