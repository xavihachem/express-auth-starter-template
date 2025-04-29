const User = require('../models/user');

/**
 * Renders the ranks page showing users ranked by challenge points
 * Only accessible by authenticated users
 */
module.exports.ranks = async function(req, res) {
    try {
        // Get all users sorted by challenge points in descending order
        const users = await User.find({})
            .select('name email userCode challengePoints role')
            .sort({ challengePoints: -1 })
            .limit(50);  // Limit to top 50 users
        
        // Find the current user's rank
        const currentUser = await User.findById(req.user._id);
        
        // Count users with MORE points (for rank calculation)
        const userCount = await User.countDocuments({
            challengePoints: { $gt: currentUser.challengePoints }
        });
        
        // Users with the same number of points should have the same rank
        const currentUserRank = userCount + 1; // Add 1 because ranks start at 1, not 0
        
        // Render the ranks page with the sorted users
        return res.render('ranks', {
            title: 'User Rankings',
            users: users,
            currentUserRank: currentUserRank
        });
    } catch (err) {
        req.flash('error', 'An error occurred while fetching rankings');
        return res.redirect('back');
    }
};
