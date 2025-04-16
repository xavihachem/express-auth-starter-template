const User = require('../models/user');

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
        
        // Render the profile page
        return res.render('profile', {
            title: 'User Profile',
            user: user,
            stats: stats,
            accessPercentage: accessPercentage
        });
    } catch (err) {
        console.log('Error in profile controller:', err);
        req.flash('error', 'An error occurred while loading your profile');
        return res.redirect('/');
    }
};
