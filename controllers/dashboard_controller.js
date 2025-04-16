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

        const { userId, newBalance, reason } = req.body;
        const balanceAmount = parseFloat(newBalance);
        
        if (!userId || isNaN(balanceAmount) || balanceAmount < 0 || !reason) {
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
        await User.findByIdAndUpdate(userId, { balance: balanceAmount });
        
        // Create a notification for the user if their balance was changed
        if (oldBalance !== balanceAmount) {
            const Notification = require('../models/notification');
            await Notification.notifyUser(userId, {
                title: 'Balance Updated',
                message: `Your balance has been updated from $${oldBalance.toFixed(2)} to $${balanceAmount.toFixed(2)} by an administrator.`,
                type: 'info',
                icon: 'money-bill-wave',
                actionType: 'balance_updated'
            });
        }
        
        req.flash('success', `Balance for ${user.name} updated successfully from $${oldBalance.toFixed(2)} to $${balanceAmount.toFixed(2)}`);
        return res.redirect('/admin');
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
