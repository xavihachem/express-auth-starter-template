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
            
            // REFERRAL REWARD SYSTEM:
            // First, determine the user's new VIP level after deposit
            const newVipStatus = determineVipLevel(newBalance);
            const newVipLevel = newVipStatus.level;
            
            // Check if this is a higher VIP level than they've ever reached before
            const previousHighest = user.highestVipLevelReached || 0;
            
            if (newVipLevel > previousHighest) {
                // This is a new milestone! Update their highest level reached
                user.highestVipLevelReached = newVipLevel;
                
                // If they were invited by someone, reward the referrer
                if (user.invitedBy) {
                    try {
                        // Get the referrer user
                        const referrer = await User.findById(user.invitedBy);
                        if (referrer) {
                            // Calculate reward points based on the new VIP level reached
                            let rewardPoints = 0;
                            
                            // We only award points for the *new* levels reached, not previous ones
                            // e.g., If going from level 0 to 3, points are awarded for levels 1, 2, and 3
                            for (let level = previousHighest + 1; level <= newVipLevel; level++) {
                                // Award points based on level achieved
                                let levelPoints = 0;
                                switch (level) {
                                    case 1:
                                        levelPoints = 100; // +100 points for level 1
                                        break;
                                    case 2:
                                        levelPoints = 200; // +200 points for level 2
                                        break;
                                    case 3:
                                        levelPoints = 300; // +300 points for level 3
                                        break;
                                    case 4:
                                        levelPoints = 400; // +400 points for level 4
                                        break;
                                }
                                rewardPoints += levelPoints;
                            }
                            
                            if (rewardPoints > 0) {
                                // Add challenge points to the referrer
                                const previousPoints = referrer.challengePoints || 0;
                                referrer.challengePoints = previousPoints + rewardPoints;
                                
                                // Save the referrer's updated information
                                await referrer.save();
                                
                                // Create a notification for the referrer about the earned points
                                const Notification = require('../models/notification');
                                await Notification.notifyUser(referrer._id, {
                                    title: 'Referral Level Reward',
                                    message: `You earned ${rewardPoints} points because a user you invited reached VIP Level ${newVipLevel}!`,
                                    type: 'success',
                                    icon: 'user-friends',
                                    actionType: 'balance_updated'
                                });
                            }
                        }
                    } catch (referralErr) {
                        // Don't stop the deposit process if referral reward fails
                    }
                }
            }
            
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

        const { userId, requestId, rejectionNote } = req.body;
        
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
        
        // Update the withdrawal request status to rejected and add rejection note
        user.withdrawalRequests[requestIndex].status = 'rejected';
        user.withdrawalRequests[requestIndex].processedDate = new Date();
        user.withdrawalRequests[requestIndex].rejectionNote = rejectionNote || 'No reason provided';
        
        // Return the funds to the user's balance
        user.balance += withdrawalAmount;
        
        // Save the updated user
        await user.save();
        
        // Create notification for the user with the rejection note
        const Notification = require('../models/notification');
        await Notification.notifyUser(userId, {
            title: 'Withdrawal Request Rejected',
            message: `Your withdrawal request for $${withdrawalAmount.toFixed(2)} has been rejected. The funds have been returned to your balance.\n\nReason: ${rejectionNote || 'No reason provided'}`,
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
        
        // Check if user has already claimed their reward today (resets at midnight)
        const now = new Date();
        
        let timeToNextReward = null;
        let canClaim = true;
        
        if (user.lastDailyRewardClaim) {
            const lastClaim = new Date(user.lastDailyRewardClaim);
            
            // Check if last claim was on the same calendar day
            if (lastClaim.getDate() === now.getDate() && 
                lastClaim.getMonth() === now.getMonth() && 
                lastClaim.getFullYear() === now.getFullYear()) {
                
                canClaim = false;
                
                // Calculate time until midnight for the next reset
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                timeToNextReward = tomorrow - now;
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
                : `You need to wait before claiming the next reward.`
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
        
        // Check if user has already claimed reward today (resets at midnight)
        const now = new Date();

        // CRITICAL check to prevent exploit by page refresh
        if (user.lastDailyRewardClaim) {
            const lastClaim = new Date(user.lastDailyRewardClaim);
            
            // Check if last claim was on the same calendar day
            if (lastClaim.getDate() === now.getDate() && 
                lastClaim.getMonth() === now.getMonth() && 
                lastClaim.getFullYear() === now.getFullYear()) {
                
                // Calculate time until midnight for the next reset
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                const timeToNextReward = tomorrow - now;
                
                return res.json({
                    success: false,
                    challengesCompleted: true,
                    message: 'You have already claimed your daily reward today. New rewards will be available at midnight.',
                    timeToNextReward: timeToNextReward,
                    cooldownActive: true
                });
            }
        }
        
        // Double-check to prevent race conditions - find the absolutely latest user data
        const latestUserData = await User.findById(userId);
        
        // Re-verify challenge completion with the latest data
        const latestCompletedChallenges = latestUserData.completedChallenges || [];
        const latestDailyLoginCompleted = latestCompletedChallenges.includes('daily-login');
        const latestStartInvestingCompleted = latestCompletedChallenges.includes('start-investing');
        
        // Double-check challenges are completed
        if (!latestDailyLoginCompleted || !latestStartInvestingCompleted) {
            return res.json({
                success: false,
                challengesCompleted: false,
                dailyLoginCompleted: latestDailyLoginCompleted,
                startInvestingCompleted: latestStartInvestingCompleted,
                message: 'You need to complete all daily challenges before claiming your reward'
            });
        }
        
        if (latestUserData.lastDailyRewardClaim) {
            const lastClaim = new Date(latestUserData.lastDailyRewardClaim);
            
            // Check if last claim was on the same calendar day (race condition check)
            if (lastClaim.getDate() === now.getDate() && 
                lastClaim.getMonth() === now.getMonth() && 
                lastClaim.getFullYear() === now.getFullYear()) {
                
                // Calculate time until midnight for the next reset
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                const timeToNextReward = tomorrow - now;
                
                return res.json({
                    success: false,
                    challengesCompleted: true,
                    message: 'You have already claimed your daily reward today. New rewards will be available at midnight.',
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

/**
 * View support tickets
 * Displays all support tickets for admin users
 */
module.exports.viewTickets = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You do not have permission to access this page');
            return res.redirect('/dashboard');
        }
        
        console.log('View tickets request received');
        const adminId = req.user._id;
        console.log('Admin user accessing tickets:', adminId);
        
        // Get pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Find all admin users with support notifications
        console.log('Searching for admin users with support notifications');
        const admins = await User.find({ role: 'admin' });
        console.log('Admin users found:', admins.length);
        
        // Extract all support tickets from admin notifications
        const allTickets = [];
        
        for (const admin of admins) {
            console.log(`Admin ${admin._id} (${admin.name})`);
            console.log(`Admin ${admin._id} has ${admin.notifications.length} notifications`);
            
            // Filter notifications to only include support tickets
            const supportNotifications = admin.notifications.filter(notification => 
                notification.type === 'support'
            );
            
            console.log(`Admin ${admin._id} has ${supportNotifications.length} support notifications`);
            
            // Extract ticket details from each support notification
            for (const notification of supportNotifications) {
                console.log('Support notification details:', notification);
                
                // Extract user info from the notification message
                const messageParts = notification.message.match(/Support request from (.+) \((.+)\): (.+)/);
                
                if (messageParts) {
                    const [_, userName, userEmail, subject] = messageParts;
                    
                    allTickets.push({
                        id: notification._id,
                        adminId: admin._id,
                        userId: notification.from,
                        userName: userName,
                        userEmail: userEmail,
                        subject: subject,
                        message: notification.message,
                        status: notification.status || 'open',
                        createdAt: notification.createdAt,
                        responses: notification.responses || []
                    });
                }
            }
        }
        
        // Remove duplicate tickets (same subject, user email, and created within 1 minute)
        const uniqueTickets = [];
        const ticketMap = new Map();
        
        for (const ticket of allTickets) {
            const key = `${ticket.userEmail}-${ticket.subject}`;
            
            if (!ticketMap.has(key)) {
                ticketMap.set(key, ticket);
                uniqueTickets.push(ticket);
            }
        }
        
        // Sort tickets by date (newest first)
        uniqueTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log(`Deduplicated tickets: ${uniqueTickets.length} (from ${allTickets.length} total)`);
        
        // Apply pagination
        const totalTickets = uniqueTickets.length;
        const totalPages = Math.ceil(totalTickets / limit);
        const paginatedTickets = uniqueTickets.slice(skip, skip + limit);
        
        console.log(`Rendering tickets page with ${paginatedTickets.length} tickets (page ${page} of ${totalPages})`);
        
        return res.render('tickets', {
            title: 'Support Tickets',
            tickets: paginatedTickets,
            pagination: {
                page,
                limit,
                totalTickets,
                totalPages
            }
        });
    } catch (err) {
        console.error('Error in viewTickets controller:', err);
        req.flash('error', 'An error occurred while retrieving support tickets');
        return res.redirect('/admin');
    }
};

/**
 * View ticket details
 * Displays detailed information about a specific support ticket
 */
module.exports.viewTicketDetails = async function(req, res) {
    try {
        console.log('View ticket details request received');
        
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You do not have permission to access this page');
            return res.redirect('/dashboard');
        }
        
        const { ticketId, adminId } = req.params;
        console.log(`Viewing ticket: ${ticketId} from admin: ${adminId}`);
        
        // Find the admin user
        const admin = await User.findById(adminId);
        if (!admin) {
            req.flash('error', 'Admin not found');
            return res.redirect('/admin/tickets');
        }
        
        // Find the ticket in the admin's notifications
        if (!admin.notifications || admin.notifications.length === 0) {
            req.flash('error', 'Ticket not found');
            return res.redirect('/admin/tickets');
        }
        
        // Find the specific ticket by ID
        const notification = admin.notifications.find(n => n._id.toString() === ticketId);
        if (!notification || notification.type !== 'support') {
            req.flash('error', 'Ticket not found');
            return res.redirect('/admin/tickets');
        }
        
        // Extract user info from the notification message
        // Format: 'Support request from {userName} ({userEmail}): {subject}'
        const messageParts = notification.message.match(/Support request from (.+) \((.+)\): (.+)/);
        if (!messageParts) {
            req.flash('error', 'Invalid ticket format');
            return res.redirect('/admin/tickets');
        }
        
        const [_, userName, userEmail, subject] = messageParts;
        
        // Create ticket object
        const ticket = {
            id: notification._id,
            adminId: admin._id,
            userName: userName,
            userEmail: userEmail,
            subject: subject,
            message: notification.details,
            status: notification.status || 'open',
            createdAt: notification.createdAt,
            responses: notification.responses || []
        };
        
        console.log('Rendering ticket details page');
        console.log('Session CSRF token for view:', req.csrfToken ? req.csrfToken() : 'No CSRF token function available');
        
        return res.render('ticket_details', {
            title: 'Ticket Details',
            user: req.user,
            ticket: ticket,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    } catch (err) {
        console.error('Error in viewTicketDetails controller:', err);
        req.flash('error', 'An error occurred while loading ticket details');
        return res.redirect('/admin/tickets');
    }
};

/**
 * Respond to a support ticket
 * Adds a response to a user's support ticket and updates its status
 */
module.exports.respondToTicket = async function(req, res) {
    try {
        console.log('Respond to ticket request received');
        console.log('Request body:', req.body);
        console.log('CSRF token in request:', req.body._csrf);
        
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            console.log('User not authenticated or not admin');
            req.flash('error', 'You do not have permission to perform this action');
            return res.redirect('/dashboard');
        }
        
        const { ticketId, adminId, message } = req.body;
        console.log('Ticket ID:', ticketId);
        console.log('Admin ID:', adminId);
        console.log('Message:', message);
        
        if (!ticketId || !adminId || !message || message.trim() === '') {
            req.flash('error', 'All fields are required');
            return res.redirect(`/admin/ticket/${ticketId}/${adminId}`);
        }
        
        // Find the admin who received the ticket
        const admin = await User.findById(adminId);
        
        if (!admin) {
            req.flash('error', 'Admin not found');
            return res.redirect('/admin/tickets');
        }
        
        // Find the ticket in the admin's notifications
        const ticketIndex = admin.notifications.findIndex(notification => 
            notification._id.toString() === ticketId && notification.type === 'support'
        );
        
        if (ticketIndex === -1) {
            req.flash('error', 'Ticket not found');
            return res.redirect('/admin/tickets');
        }
        
        // Create the response
        const response = {
            from: 'admin',
            adminName: req.user.name,
            message: message,
            createdAt: new Date()
        };
        
        // Add the response to the ticket
        if (!admin.notifications[ticketIndex].responses) {
            admin.notifications[ticketIndex].responses = [];
        }
        
        admin.notifications[ticketIndex].responses.push(response);
        
        // Save the updated admin
        await User.findByIdAndUpdate(
            adminId,
            { $set: { [`notifications.${ticketIndex}.responses`]: admin.notifications[ticketIndex].responses } }
        );
        
        // Extract user info from the notification message
        const messageParts = admin.notifications[ticketIndex].message.match(/Support request from (.+) \((.+)\): (.+)/);
        
        if (messageParts) {
            const [_, userName, userEmail, subject] = messageParts;
            
            // Find the user by email to notify them
            const user = await User.findOne({ email: userEmail });
            
            if (user) {
                // Add a notification to the user about the response using the Notification model
                const Notification = require('../models/notification');
                
                await Notification.create({
                    recipient: user._id,
                    title: 'Support Ticket Response',
                    message: `Your ticket "${subject}" has received a response: "${message}"`,
                    type: 'info',
                    icon: 'comment-dots',
                    actionType: 'general',
                    read: false,
                    createdAt: new Date()
                });
                
                // Also add to user's notifications array for backward compatibility
                const notificationMessage = {
                    message: 'Support ticket response',
                    details: `Your support ticket "${subject}" has received a response: "${message}"`,
                    type: 'info',
                    createdAt: new Date()
                };
                
                await User.findByIdAndUpdate(
                    user._id,
                    { $push: { notifications: { $each: [notificationMessage], $position: 0 } } }
                );
            }
        }
        
        req.flash('success', 'Response added successfully');
        return res.redirect(`/admin/ticket/${ticketId}/${adminId}`);
    } catch (err) {
        console.error('Error in respond to ticket controller:', err);
        req.flash('error', 'An error occurred while responding to the ticket');
        return res.redirect('/admin/tickets');
    }
};

/**
 * Change ticket status
 * Changes the status of a support ticket (open/closed)
 */
module.exports.changeTicketStatus = async function(req, res) {
    try {
        // Check if user is authenticated and is an admin
        if (!req.isAuthenticated() || req.user.role !== 'admin') {
            req.flash('error', 'You do not have permission to perform this action');
            return res.redirect('/dashboard');
        }
        
        const { ticketId, adminId, status } = req.body;
        
        // Validate input
        if (!ticketId || !adminId || !status || !['open', 'closed'].includes(status)) {
            req.flash('error', 'Invalid input');
            return res.redirect('/admin/tickets');
        }
        
        // Find the admin
        const admin = await User.findById(adminId);
        
        if (!admin) {
            req.flash('error', 'Admin not found');
            return res.redirect('/admin/tickets');
        }
        
        // Find the notification/ticket
        const ticketIndex = admin.notifications.findIndex(notification => 
            notification._id.toString() === ticketId && notification.type === 'support'
        );
        
        if (ticketIndex === -1) {
            req.flash('error', 'Ticket not found');
            return res.redirect('/admin/tickets');
        }
        
        // Update ticket status using findByIdAndUpdate to avoid version conflicts
        await User.findByIdAndUpdate(
            adminId,
            { $set: { [`notifications.${ticketIndex}.status`]: status } }
        );
        
        // Extract user info from the notification message to notify them about status change
        const messageParts = admin.notifications[ticketIndex].message.match(/Support request from (.+) \((.+)\): (.+)/);
        
        if (messageParts) {
            const [_, userName, userEmail, subject] = messageParts;
            
            // Find the user by email to notify them
            const user = await User.findOne({ email: userEmail });
            
            if (user) {
                // Add a notification to the user about the status change
                const notificationMessage = {
                    message: `Support ticket ${status === 'open' ? 'reopened' : 'closed'}`,
                    details: `Your support ticket "${subject}" has been ${status === 'open' ? 'reopened' : 'closed'} by admin ${req.user.name}.`,
                    type: 'info',
                    createdAt: new Date()
                };
                
                await User.findByIdAndUpdate(
                    user._id,
                    { $push: { notifications: { $each: [notificationMessage], $position: 0 } } }
                );
            }
        }
        
        req.flash('success', `Ticket ${status === 'open' ? 'reopened' : 'closed'} successfully`);
        return res.redirect(`/admin/ticket/${ticketId}/${adminId}`);
    } catch (err) {
        console.error('Error in change ticket status controller:', err);
        req.flash('error', 'An error occurred while changing ticket status');
        return res.redirect('/admin/tickets');
    }
};
