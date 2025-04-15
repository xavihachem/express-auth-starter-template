const User = require('../models/user');

// Controller for team page - shows users who signed up using the current user's invitation code
module.exports.team = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to access your team page');
            return res.redirect('/sign-in');
        }

        // Find the current user with complete data
        const currentUser = await User.findById(req.user._id);
        
        if (!currentUser) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        // Find all users who were invited by the current user
        // We use the invitedBy field that stores the ObjectId of the inviter
        const teamMembers = await User.find({ invitedBy: currentUser._id })
            .select('name email userCode userInvites createdAt');
        
        // Render the team page with the team members data
        return res.render('team', {
            currentUser,
            teamMembers,
            teamSize: teamMembers.length
        });
    } catch (err) {
        console.log('Error in team controller:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/');
    }
};
