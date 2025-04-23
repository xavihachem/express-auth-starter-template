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

        // Retrieve user from session (passport) to avoid extra DB hit
        const user = req.user;
        
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
        
        // Find the user to get their details
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }
        
        // Update the user's deposit wallet
        await User.findByIdAndUpdate(userId, { depositWallet });
        
        // Create a notification for the user if their wallet was changed
        if (user.depositWallet !== depositWallet) {
            const Notification = require('../models/notification');
            await Notification.notifyUser(userId, {
                title: 'Deposit Wallet Updated',
                message: 'Your deposit wallet address has been updated by an administrator.',
                type: 'info',
                icon: 'wallet',
                actionType: 'wallet_updated'
            });
        }
        
        req.flash('success', 'Deposit wallet set successfully');
        return res.redirect('/admin');
    } catch (err) {
        console.log('Error setting deposit wallet:', err);
        req.flash('error', 'Failed to set deposit wallet');
        return res.redirect('/admin');
    }
};

// Show withdraw wallet form for a user
module.exports.withdrawWalletForm = async function(req, res) {
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
        
        // Render the withdraw wallet form
        return res.render('withdraw_wallet_form', { user });
    } catch (err) {
        console.log('Error showing withdraw wallet form:', err);
        req.flash('error', 'Failed to load withdraw wallet form');
        return res.redirect('/admin');
    }
};

// Set withdraw wallet for a user
module.exports.setWithdrawWallet = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const { userId, withdrawWallet } = req.body;
        
        if (!userId || !withdrawWallet) {
            req.flash('error', 'User ID and withdraw wallet are required');
            return res.redirect('/admin');
        }
        
        // Find the user to get their details
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }
        
        // Update the user's withdraw wallet
        await User.findByIdAndUpdate(userId, { withdrawWallet });
        
        // Create a notification for the user if their wallet was changed
        if (user.withdrawWallet !== withdrawWallet) {
            const Notification = require('../models/notification');
            await Notification.notifyUser(userId, {
                title: 'Withdraw Wallet Updated',
                message: 'Your withdraw wallet address has been updated by an administrator.',
                type: 'info',
                icon: 'wallet',
                actionType: 'wallet_updated'
            });
        }
        
        req.flash('success', 'Withdraw wallet set successfully');
        return res.redirect('/admin');
    } catch (err) {
        console.log('Error setting withdraw wallet:', err);
        req.flash('error', 'Failed to set withdraw wallet');
        return res.redirect('/admin');
    }
};

// Show form to edit user balance
module.exports.editBalance = async function(req, res) {
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
        
        // Render the edit balance form
        return res.render('edit_balance', { user });
    } catch (err) {
        console.log('Error showing edit balance form:', err);
        req.flash('error', 'Failed to load edit balance form');
        return res.redirect('/admin');
    }
};

// Update user balance
module.exports.updateBalance = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const { userId, depositAmount, currentBalance, reason, isDeposit } = req.body;
        
        // Handle deposit flow
        if (isDeposit === 'true') {
            const depositValue = parseFloat(depositAmount);
            
            if (!userId || isNaN(depositValue) || depositValue <= 0) {
                req.flash('error', 'User ID and valid deposit amount are required');
                return res.redirect('/admin');
            }
            
            // Find the user to get their current balance
            const user = await User.findById(userId);
            
            if (!user) {
                req.flash('error', 'User not found');
                return res.redirect('/admin');
            }
            
            const oldBalance = user.balance || 0;
            const newBalance = oldBalance + depositValue;
            
            // Add record to deposit history
            user.depositHistory.push({
                amount: depositValue,
                status: 'completed',
                depositDate: new Date(),
                reason: reason || 'Admin deposit',
                transactionId: 'DP' + new Date().getTime().toString()
            });
            
            // Update the user's balance by adding the deposit amount
            user.balance = newBalance;
            await user.save();
            
            // Create a notification for the user about the deposit
            const Notification = require('../models/notification');
            const newNotification = await Notification.notifyUser(userId, {
                title: 'Deposit Added to Your Account',
                message: `An administrator has made a deposit of $${depositValue.toFixed(2)} to your account. ${reason ? `Reason: ${reason}` : ''}`,
                type: 'success',
                icon: 'money-bill-wave',
                actionType: 'balance_updated'
            });
            
            // Update the user's session if they're currently logged in
            // This ensures the notification badge updates in real-time
            try {
                const moment = require('moment');
                const formatNotificationTime = date => moment(date).fromNow();
                
                // Find all active sessions in the session store
                req.sessionStore.all((err, sessions) => {
                    if (err) {
                        console.error('Error accessing session store:', err);
                        return;
                    }
                    
                    // Look for the user's session
                    Object.values(sessions).forEach(sessionData => {
                        if (sessionData.passport && 
                            sessionData.passport.user && 
                            sessionData.passport.user.toString() === userId) {
                            
                            // Session found - update notifications
                            const notificationData = {
                                id: newNotification._id,
                                icon: newNotification.icon,
                                title: newNotification.title,
                                message: newNotification.message,
                                time: formatNotificationTime(newNotification.createdAt),
                                read: false,
                                bgColor: 'success', // Map from notification type
                                actionType: 'balance_updated', // Make sure to use a valid enum value
                                actionId: newNotification.actionId
                            };
                            
                            // Initialize or update session notifications
                            if (!sessionData.notifications) {
                                sessionData.notifications = {
                                    hasUnread: true,
                                    items: [notificationData]
                                };
                            } else {
                                // Add new notification to the beginning of the array
                                sessionData.notifications.items.unshift(notificationData);
                                sessionData.notifications.hasUnread = true;
                            }
                            
                            // Save the updated session
                            req.sessionStore.set(Object.keys(sessions).find(
                                key => sessions[key] === sessionData
                            ), sessionData, err => {
                                if (err) console.error('Error saving session:', err);
                            });
                        }
                    });
                });
            } catch (sessionErr) {
                console.error('Error updating user session notifications:', sessionErr);
                // Non-critical error, continue execution
            }
            
            req.flash('success', `Deposit of $${depositValue.toFixed(2)} added successfully to ${user.name}'s account. New balance: $${newBalance.toFixed(2)}`);
            return res.redirect('/admin');
        } else {
            // Legacy code path for direct balance updates (keeping for backward compatibility)
            const newBalance = parseFloat(req.body.newBalance);
            
            if (!userId || isNaN(newBalance) || newBalance < 0 || !reason) {
                req.flash('error', 'User ID, valid balance amount, and reason are required');
                return res.redirect('/admin');
            }
            
            // Find the user to get their current balance
            const user = await User.findById(userId);
            
            if (!user) {
                req.flash('error', 'User not found');
                return res.redirect('/admin');
            }
            
            const oldBalance = user.balance || 0;
            
            // Update the user's balance
            user.balance = newBalance;
            await user.save();
            
            // Create a notification for the user if their balance was changed
            if (oldBalance !== newBalance) {
                const Notification = require('../models/notification');
                await Notification.notifyUser(userId, {
                    title: 'Balance Updated',
                    message: `Your balance has been updated from $${oldBalance.toFixed(2)} to $${newBalance.toFixed(2)} by an administrator.`,
                    type: 'info',
                    icon: 'money-bill-wave',
                    actionType: 'balance_updated'
                });
            }
            
            req.flash('success', `Balance for ${user.name} updated successfully from $${oldBalance.toFixed(2)} to $${newBalance.toFixed(2)}`);
            return res.redirect('/admin');
        }
    } catch (err) {
        console.log('Error updating user balance:', err);
        req.flash('error', 'Failed to update user balance');
        return res.redirect('/admin');
    }
};

// View withdrawal requests for all users or a specific user
module.exports.viewWithdrawalRequests = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const userId = req.params.userId;
        let withdrawalRequests = [];
        
        if (userId) {
            // Get withdrawal requests for a specific user
            const user = await User.findById(userId);
            
            if (!user) {
                req.flash('error', 'User not found');
                return res.redirect('/admin');
            }
            
            // Format the withdrawal requests with user information
            if (user.withdrawalRequests && user.withdrawalRequests.length > 0) {
                withdrawalRequests = user.withdrawalRequests.map(req => ({
                    ...req.toObject(),
                    user: user
                }));
            }
            
            // Render the withdrawal requests page for a specific user
            return res.render('withdrawal_requests', { 
                withdrawalRequests,
                user
            });
        } else {
            // Get withdrawal requests for all users
            const users = await User.find({
                'withdrawalRequests.0': { $exists: true }
            });
            
            // Combine all withdrawal requests from all users
            users.forEach(user => {
                if (user.withdrawalRequests && user.withdrawalRequests.length > 0) {
                    const userRequests = user.withdrawalRequests.map(req => ({
                        ...req.toObject(),
                        user: user
                    }));
                    withdrawalRequests = [...withdrawalRequests, ...userRequests];
                }
            });
            
            // Sort by request date (newest first)
            withdrawalRequests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
            
            // Render the withdrawal requests page for all users
            return res.render('withdrawal_requests', { 
                withdrawalRequests,
                user: null
            });
        }
    } catch (err) {
        console.log('Error viewing withdrawal requests:', err);
        req.flash('error', 'Failed to load withdrawal requests');
        return res.redirect('/admin');
    }
};

// Approve a withdrawal request
module.exports.approveWithdrawal = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const { userId, requestId } = req.body;
        
        if (!userId || !requestId) {
            req.flash('error', 'User ID and request ID are required');
            return res.redirect('/admin');
        }
        
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }
        
        // Find the withdrawal request
        const requestIndex = user.withdrawalRequests.findIndex(req => req.requestId === requestId);
        
        if (requestIndex === -1) {
            req.flash('error', 'Withdrawal request not found');
            return res.redirect('/admin/withdrawal-requests');
        }
        
        // Check if the request is already processed
        if (user.withdrawalRequests[requestIndex].status !== 'pending') {
            req.flash('error', 'This withdrawal request has already been processed');
            return res.redirect('/admin/withdrawal-requests');
        }
        
        // Get the withdrawal amount
        const withdrawalAmount = user.withdrawalRequests[requestIndex].amount;
        
        // Update the withdrawal request status to approved
        user.withdrawalRequests[requestIndex].status = 'approved';
        user.withdrawalRequests[requestIndex].processedDate = new Date();
        
        // The amount was already deducted when the request was created, so we don't need to deduct it again
        // Just update the withdraw field to track total withdrawals
        user.withdraw = (user.withdraw || 0) + withdrawalAmount;
        
        // Save the updated user
        await user.save();
        
        // Create notification for the user
        const Notification = require('../models/notification');
        await Notification.notifyUser(userId, {
            title: 'Withdrawal Request Approved',
            message: `Your withdrawal request for $${user.withdrawalRequests[requestIndex].amount.toFixed(2)} has been approved.`,
            type: 'success',
            icon: 'check-circle',
            actionType: 'withdrawal_request',
            actionId: requestId
        });
        
        req.flash('success', `Withdrawal request for $${user.withdrawalRequests[requestIndex].amount.toFixed(2)} has been approved`);
        return res.redirect('/admin/withdrawal-requests');
    } catch (err) {
        console.log('Error approving withdrawal request:', err);
        req.flash('error', 'Failed to approve withdrawal request');
        return res.redirect('/admin/withdrawal-requests');
    }
};

// Reject a withdrawal request
module.exports.rejectWithdrawal = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const { userId, requestId } = req.body;
        
        if (!userId || !requestId) {
            req.flash('error', 'User ID and request ID are required');
            return res.redirect('/admin');
        }
        
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }
        
        // Find the withdrawal request
        const requestIndex = user.withdrawalRequests.findIndex(req => req.requestId === requestId);
        
        if (requestIndex === -1) {
            req.flash('error', 'Withdrawal request not found');
            return res.redirect('/admin/withdrawal-requests');
        }
        
        // Check if the request is already processed
        if (user.withdrawalRequests[requestIndex].status !== 'pending') {
            req.flash('error', 'This withdrawal request has already been processed');
            return res.redirect('/admin/withdrawal-requests');
        }
        
        // Get the withdrawal amount
        const withdrawalAmount = user.withdrawalRequests[requestIndex].amount;
        
        // Update the withdrawal request status to rejected
        user.withdrawalRequests[requestIndex].status = 'rejected';
        user.withdrawalRequests[requestIndex].processedDate = new Date();
        
        // Return the funds to the user's balance
        user.balance += withdrawalAmount;
        
        // Save the updated user
        await user.save();
        
        // Create notification for the user
        const Notification = require('../models/notification');
        await Notification.notifyUser(userId, {
            title: 'Withdrawal Request Rejected',
            message: `Your withdrawal request for $${withdrawalAmount.toFixed(2)} has been rejected. The funds have been returned to your balance.`,
            type: 'danger',
            icon: 'times-circle',
            actionType: 'withdrawal_request',
            actionId: requestId
        });
        
        req.flash('success', `Withdrawal request for $${withdrawalAmount.toFixed(2)} has been rejected and funds returned to user's balance`);
        return res.redirect('/admin/withdrawal-requests');
    } catch (err) {
        console.log('Error rejecting withdrawal request:', err);
        req.flash('error', 'Failed to reject withdrawal request');
        return res.redirect('/admin/withdrawal-requests');
    }
};

// Change user role (admin/user)
module.exports.changeRole = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const { userId, newRole } = req.body;
        
        if (!userId || !newRole) {
            req.flash('error', 'User ID and new role are required');
            return res.redirect('/admin');
        }
        
        // Validate the new role
        if (newRole !== 'admin' && newRole !== 'user') {
            req.flash('error', 'Invalid role');
            return res.redirect('/admin');
        }
        
        // Find the user to get their details
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }

        // Prevent self-demotion
        if (user._id.toString() === req.user._id.toString() && newRole !== 'admin') {
            req.flash('error', 'You cannot remove your own admin rights');
            return res.redirect('/admin');
        }
        
        // Update the user's role
        await User.findByIdAndUpdate(userId, { role: newRole });
        
        // Create a notification for the user
        const Notification = require('../models/notification');
        await Notification.notifyUser(userId, {
            title: 'Role Updated',
            message: `Your account role has been changed to ${newRole}.`,
            type: 'info',
            icon: 'user-shield',
            actionType: 'role_updated'
        });
        
        req.flash('success', `User role updated to ${newRole} successfully`);
        return res.redirect('/admin');
    } catch (err) {
        console.log('Error changing user role:', err);
        req.flash('error', 'Failed to change user role');
        return res.redirect('/admin');
    }
};

// Show form to update user password
module.exports.updatePasswordForm = async function(req, res) {
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
        
        // Find the user to get their details
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }
        
        // Render the password update form
        return res.render('reset_user_password', {
            user
        });
    } catch (err) {
        console.log('Error showing password update form:', err);
        req.flash('error', 'Failed to load password update form');
        return res.redirect('/admin');
    }
};

// Update user password
module.exports.updateUserPassword = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You are not authorized to perform this action');
            return res.redirect('/');
        }

        const { userId, newPassword, confirmPassword } = req.body;
        
        if (!userId || !newPassword || !confirmPassword) {
            req.flash('error', 'All fields are required');
            return res.redirect(`/admin/update-password/${userId}`);
        }
        
        // Validate password match
        if (newPassword !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect(`/admin/update-password/${userId}`);
        }
        
        // Validate password strength
        if (newPassword.length < 8) {
            req.flash('error', 'Password must be at least 8 characters long');
            return res.redirect(`/admin/update-password/${userId}`);
        }
        
        // Find the user to get their details
        const user = await User.findById(userId);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin');
        }
        
        // Update the user's password using the static method
        await User.changePassword(userId, newPassword);
        
        // Create a notification for the user
        const Notification = require('../models/notification');
        await Notification.notifyUser(userId, {
            title: 'Password Updated',
            message: 'Your password has been updated by an administrator. Please use your new password for future logins.',
            type: 'warning',
            icon: 'key',
            actionType: 'general'
        });
        
        req.flash('success', 'User password updated successfully');
        return res.redirect('/admin');
    } catch (err) {
        console.log('Error updating user password:', err);
        req.flash('error', 'Failed to update user password');
        return res.redirect('/admin');
    }
};

// Helper function to determine VIP level and daily reward based on user balance
function determineVipLevel(balance) {

    
    // Define VIP level ranges and rewards
    const vipLevels = [
        { level: 1, minBalance: 80, maxBalance: 200, reward: 2.1 },
        { level: 2, minBalance: 200, maxBalance: 500, reward: 6.4 },
        { level: 3, minBalance: 500, maxBalance: 1000, reward: 13.3 },
        { level: 4, minBalance: 2000, maxBalance: 5000, reward: 62.5 }
    ];
    
    // Handle the case where balance is exactly at the boundary
    for (const vipLevel of vipLevels) {
        if (balance === vipLevel.maxBalance) {

            return vipLevel;
        }
    }
    
    // Handle the case for VIP level 3 differently for ranges between 1000-2000
    if (balance >= 1000 && balance < 2000) {

        return { level: 3, minBalance: 500, maxBalance: 2000, reward: 13.3 };
    }
    
    // Find the matching VIP level
    for (const vipLevel of vipLevels) {
        if (balance >= vipLevel.minBalance && balance < vipLevel.maxBalance) {

            return vipLevel;
        }
    }
    
    // For balances over 5000, give them the highest VIP level
    if (balance >= 5000) {

        return { level: 4, minBalance: 2000, maxBalance: Infinity, reward: 62.5 };
    }
    

    return { level: 0, reward: 0 }; // No VIP level
}

// Check if user is eligible for daily reward
module.exports.checkDailyRewardEligibility = async function(req, res) {
    const startTime = Date.now();
    
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            return res.status(401).json({ 
                success: false, 
                message: 'You must be logged in to check reward eligibility' 
            });
        }

        const userId = req.user._id;
        
        // Get user with current balance
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Check if required daily challenges are completed
        const completedChallenges = user.completedChallenges || [];
        const dailyLoginCompleted = completedChallenges.includes('daily-login');
        const startInvestingCompleted = completedChallenges.includes('start-investing');
        
        // Check if both required challenges are completed
        if (!dailyLoginCompleted || !startInvestingCompleted) {
            return res.json({
                success: true,
                eligible: false,
                challengesCompleted: false,
                dailyLoginCompleted,
                startInvestingCompleted,
                message: 'You need to complete all daily challenges to claim your reward',
                vipLevel: 0,
                reward: 0,
                timeToNextReward: null
            });
        }
        
        // Determine VIP level and reward
        const vipStatus = determineVipLevel(user.balance);
        
        // Check if user qualifies for any VIP level
        if (vipStatus.level === 0) {
            return res.json({
                success: true,
                eligible: false,
                challengesCompleted: true,
                message: 'You need at least $80 balance to qualify for daily rewards',
                vipLevel: 0,
                reward: 0,
                timeToNextReward: null
            });
        }
        
        // Check if enough time has passed since last claim (24 hours)
        const now = new Date();
        const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        let timeToNextReward = null;
        let canClaim = true;
        
        if (user.lastDailyRewardClaim) {
            const lastClaim = new Date(user.lastDailyRewardClaim);
            const timeSinceClaim = now - lastClaim;
            
            if (timeSinceClaim < cooldownPeriod) {
                canClaim = false;
                timeToNextReward = cooldownPeriod - timeSinceClaim;
            }
        }
        
        return res.json({
            success: true,
            eligible: canClaim,
            challengesCompleted: true,
            vipLevel: vipStatus.level,
            reward: vipStatus.reward,
            timeToNextReward: timeToNextReward,
            message: canClaim 
                ? `You can claim your VIP Level ${vipStatus.level} reward of $${vipStatus.reward}` 
                : `You can claim your next reward in ${Math.ceil(timeToNextReward / 1000)} seconds`
        });
        
    } catch (err) {
        console.error('[DAILY_REWARD_DEBUG] Error checking reward eligibility:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to check reward eligibility' 
        });
    }
};

// Claim daily reward
module.exports.claimDailyReward = async function(req, res) {
    // Check if CSRF token is present and valid
    if (!req.headers['csrf-token'] && !req.body._csrf) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token required for this operation'
        });
    }
    const startTime = Date.now();
    
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {

            return res.status(401).json({ 
                success: false, 
                message: 'You must be logged in to claim a reward' 
            });
        }

        const userId = req.user._id;

        
        // Get user with current balance and lastDailyRewardClaim field
        const user = await User.findById(userId);
        if (!user) {

            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        

        
        // Check if required daily challenges are completed
        const completedChallenges = user.completedChallenges || [];
        const dailyLoginCompleted = completedChallenges.includes('daily-login');
        const startInvestingCompleted = completedChallenges.includes('start-investing');
        

        
        // Check if both required challenges are completed
        if (!dailyLoginCompleted || !startInvestingCompleted) {

            return res.json({
                success: false,
                challengesCompleted: false,
                dailyLoginCompleted,
                startInvestingCompleted,
                message: 'You need to complete all daily challenges before claiming your reward'
            });
        }
        

        
        // Determine VIP level and reward
        const vipStatus = determineVipLevel(user.balance);

        
        // Check if user qualifies for any VIP level
        if (vipStatus.level === 0) {

            return res.json({
                success: false,
                challengesCompleted: true,
                message: 'You need at least $80 balance to qualify for daily rewards'
            });
        }
        
        // Check if enough time has passed since last claim (24 hours)
        const now = new Date();
        const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        
        // CRITICAL check to prevent exploit by page refresh
        if (user.lastDailyRewardClaim) {
            const lastClaim = new Date(user.lastDailyRewardClaim);
            const timeSinceClaim = now - lastClaim;
            

            
            // Strengthen the cooldown check with additional logging
            if (timeSinceClaim < cooldownPeriod) {
                const timeToNextReward = cooldownPeriod - timeSinceClaim;

                
                return res.json({
                    success: false,
                    challengesCompleted: true,
                    message: `You can claim your next reward in ${Math.ceil(timeToNextReward / 1000)} seconds`,
                    timeToNextReward: timeToNextReward,
                    cooldownActive: true
                });
            }

        }
        
        // Double-check to prevent race conditions - find the absolutely latest user data
        const latestUserData = await User.findById(userId);
        if (latestUserData.lastDailyRewardClaim) {
            const lastClaim = new Date(latestUserData.lastDailyRewardClaim);
            const timeSinceClaim = now - lastClaim;
            

            
            // This check catches any claims that might have happened between our first check and now
            if (timeSinceClaim < cooldownPeriod) {
                const timeToNextReward = cooldownPeriod - timeSinceClaim;

                
                return res.json({
                    success: false,
                    challengesCompleted: true,
                    message: `You can claim your next reward in ${Math.ceil(timeToNextReward / 1000)} seconds`,
                    timeToNextReward: timeToNextReward,
                    cooldownActive: true
                });
            }
        }
        
        // Update user balance and last claim time
        const newBalance = parseFloat(user.balance) + parseFloat(vipStatus.reward);

        
        // Add deposit record
        const transactionId = 'DR' + Date.now().toString();
        const depositRecord = {
            amount: vipStatus.reward,
            status: 'completed',
            depositDate: now,
            reason: `VIP Level ${vipStatus.level} Daily Reward`,
            transactionId: transactionId
        };

        
        try {
            // Use a timestamp string to ensure consistent format
            const currentTimestamp = now.toISOString();

            
            // Update user document - trying with findByIdAndUpdate first
            const updateResult = await User.findByIdAndUpdate(userId, {
                balance: newBalance,
                lastDailyRewardClaim: currentTimestamp,
                $push: { depositHistory: depositRecord }
            }, { new: true });
            

            
            if (!updateResult) {
                // If the first method fails, try the alternative approach

                
                // Get the user again, update manually, and save
                const userToUpdate = await User.findById(userId);
                userToUpdate.balance = newBalance;
                userToUpdate.lastDailyRewardClaim = currentTimestamp;
                userToUpdate.depositHistory.push(depositRecord);
                await userToUpdate.save();


            }
        } catch (updateError) {
            console.error('Error updating user document:', updateError);
            throw updateError;  // Re-throw to be caught by outer catch block
        }
        
        // Create a notification for the user
        try {
            const Notification = require('../models/notification');
            await Notification.notifyUser(userId, {
                title: 'Daily Reward Claimed',
                message: `You have claimed your VIP Level ${vipStatus.level} daily reward of $${vipStatus.reward}.`,
                type: 'success',
                icon: 'gift',
                actionType: 'balance_updated'
            });

        } catch (notificationError) {
            console.error('Error creating notification:', notificationError);
            // Continue even if notification fails - don't block the reward
        }
        
        const executionTime = Date.now() - startTime;

        
        return res.json({
            success: true,
            message: `You have successfully claimed your VIP Level ${vipStatus.level} reward of $${vipStatus.reward}`,
            newBalance: newBalance,
            reward: vipStatus.reward,
            vipLevel: vipStatus.level,
            transactionId: transactionId
        });
        
    } catch (err) {
        console.error('Error processing reward claim:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to process reward claim' 
        });
    }
};
