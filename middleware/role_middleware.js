// Middleware to check if the user has the required role
module.exports.checkRole = function(role) {
    return function(req, res, next) {
        // If user is not authenticated, redirect to sign-in
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to access this page');
            return res.redirect('/sign-in');
        }

        // If user doesn't have the required role, show error and redirect to home
        if (req.user.role !== role) {
            req.flash('error', 'You do not have permission to access this page');
            return res.redirect('/');
        }

        // User has the required role, proceed to the next middleware
        return next();
    };
};

// Middleware to check if the user is an admin
module.exports.isAdmin = function(req, res, next) {
    return module.exports.checkRole('admin')(req, res, next);
};

// Middleware to check if the user is a regular user
module.exports.isUser = function(req, res, next) {
    return module.exports.checkRole('user')(req, res, next);
};
