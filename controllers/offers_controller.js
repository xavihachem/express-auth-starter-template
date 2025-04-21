// Controller for Offers page
const User = require('../models/user');

module.exports.offers = async function(req, res) {
    try {
        // If user is authenticated, we can fetch user data
        let user = null;
        if (req.isAuthenticated()) {
            user = await User.findById(req.user._id);
        }
        
        return res.render('offers', {
            title: 'VIP Offers | Moonify',
            user: user
        });
    } catch (err) {
        console.error('Error in offers controller:', err);
        req.flash('error', 'An error occurred while loading the offers page');
        return res.redirect('back');
    }
};
