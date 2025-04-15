const User = require('../models/user');

// Controller for investments page - shows deposit and withdraw options or access request page based on user's access level
module.exports.investments = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to access your investments page');
            return res.redirect('/sign-in');
        }

        // Find the current user with complete data
        const currentUser = await User.findById(req.user._id);
        
        if (!currentUser) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }
        
        // Check if user has investment access
        if (currentUser.investmentAccess !== 'access') {
            // Render the investment access request page
            return res.render('investment_request', {
                currentUser,
                accessStatus: currentUser.investmentAccess
            });
        }
        
        // User has access, render the investments page with the user data
        return res.render('investments', {
            currentUser,
            balance: currentUser.balance || 0,
            withdraw: currentUser.withdraw || 0,
            withdrawWallet: currentUser.withdrawWallet || '',
            depositWallet: currentUser.depositWallet || ''
        });
    } catch (err) {
        console.log('Error in investments controller:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/');
    }
};

// Handle deposit wallet update
module.exports.updateDepositWallet = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to update your deposit wallet');
            return res.redirect('/sign-in');
        }

        const { depositWallet } = req.body;
        
        // Update the user's deposit wallet
        await User.findByIdAndUpdate(req.user._id, { depositWallet });
        
        req.flash('success', 'Deposit wallet updated successfully');
        return res.redirect('/investments');
    } catch (err) {
        console.log('Error updating deposit wallet:', err);
        req.flash('error', 'Failed to update deposit wallet');
        return res.redirect('/investments');
    }
};

// Handle withdraw wallet update
module.exports.updateWithdrawWallet = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to update your withdraw wallet');
            return res.redirect('/sign-in');
        }

        const { withdrawWallet } = req.body;
        
        // Update the user's withdraw wallet
        await User.findByIdAndUpdate(req.user._id, { withdrawWallet });
        
        req.flash('success', 'Withdraw wallet updated successfully');
        return res.redirect('/investments');
    } catch (err) {
        console.log('Error updating withdraw wallet:', err);
        req.flash('error', 'Failed to update withdraw wallet');
        return res.redirect('/investments');
    }
};

// Handle investment access request
module.exports.requestInvestmentAccess = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to request investment access');
            return res.redirect('/sign-in');
        }

        // Find the current user
        const user = await User.findById(req.user._id);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }
        
        // Check if user already has pending or granted access
        if (user.investmentAccess === 'pending') {
            req.flash('info', 'Your investment access request is already pending approval');
            return res.redirect('/investments');
        }
        
        if (user.investmentAccess === 'access') {
            req.flash('success', 'You already have investment access');
            return res.redirect('/investments');
        }
        
        // Update user's investment access status to pending
        await User.findByIdAndUpdate(req.user._id, { investmentAccess: 'pending' });
        
        req.flash('success', 'Investment access requested successfully. Please wait for admin approval.');
        return res.redirect('/investments');
    } catch (err) {
        console.log('Error requesting investment access:', err);
        req.flash('error', 'Failed to request investment access');
        return res.redirect('/investments');
    }
};

// Handle withdraw request
module.exports.requestWithdraw = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to request a withdrawal');
            return res.redirect('/sign-in');
        }

        const { amount } = req.body;
        const withdrawAmount = parseFloat(amount);
        
        // Validate withdraw amount
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            req.flash('error', 'Please enter a valid withdrawal amount');
            return res.redirect('/investments');
        }
        
        // Find the current user
        const user = await User.findById(req.user._id);
        
        // Check if user has sufficient balance
        if (!user || user.balance < withdrawAmount) {
            req.flash('error', 'Insufficient balance for withdrawal');
            return res.redirect('/investments');
        }
        
        // Check if user has set a withdraw wallet
        if (!user.withdrawWallet) {
            req.flash('error', 'Please set a withdraw wallet address first');
            return res.redirect('/investments');
        }
        
        // Update user's balance and withdraw amount
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 
                balance: -withdrawAmount,
                withdraw: withdrawAmount
            }
        });
        
        req.flash('success', `Withdrawal request for ${withdrawAmount} submitted successfully`);
        return res.redirect('/investments');
    } catch (err) {
        console.log('Error requesting withdrawal:', err);
        req.flash('error', 'Failed to process withdrawal request');
        return res.redirect('/investments');
    }
};
