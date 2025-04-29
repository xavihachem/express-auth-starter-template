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

        // Check if request is from mobile device using the mobile query parameter
        const isMobile = req.query.mobile === 'true';
        const itemsPerPage = isMobile ? 4 : 5; // 4 items on mobile, 5 on desktop
        
        // Team Members Pagination
        const teamPage = parseInt(req.query.teamPage) || 1;
        
        // Find all users who were invited by the current user
        // We use the invitedBy field that stores the ObjectId of the inviter
        const allTeamMembers = await User.find({ invitedBy: currentUser._id })
            .select('name email userCode userInvites createdAt');
            
        // Calculate total pages based on full array length
        const totalTeamMembers = allTeamMembers.length;
        const totalTeamPages = Math.ceil(totalTeamMembers / itemsPerPage);
        
        // Get the slice of data for the current page
        const teamStartIndex = (teamPage - 1) * itemsPerPage;
        const teamEndIndex = teamStartIndex + itemsPerPage;
        
        // Order by newest first (joined date)
        const paginatedTeamMembers = allTeamMembers
            .slice(teamStartIndex, teamEndIndex)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Render the team page with the team members data
        return res.render('team', {
            currentUser,
            teamMembers: paginatedTeamMembers,
            teamSize: allTeamMembers.length,
            teamCurrentPage: teamPage,
            teamTotalPages: totalTeamPages,
            isMobile: isMobile
        });
    } catch (err) {
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/');
    }
};
