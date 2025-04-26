// Importing required modules
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const bcrypt = require('bcryptjs');
var validator = require('validator');
var axios = require('axios');

// Authentication using passport
passport.use(
    'local', // strategy name
    new localStrategy(
        {
            usernameField: 'email', // username field name
            passReqToCallback: true, // allows access to request object in callback function
        },
        async function (req, email, password, done) {
            // passport authentication callback function
            try {
                // Check if email and password are provided
                if (!email || !password) {
                    req.flash('error', 'Email and password are required.');
                    return done(null, false);
                }
                
                if (!validator.isEmail(email)) {
                    // validate email using validator module
                    req.flash('error', 'Invalid email format.'); // flash error message
                    return done(null, false); // return authentication failure
                }

                // reCAPTCHA verification bypassed
                // Keeping this comment to document the change

                // Find user in database by email
                let user = await User.findOne({
                    email: email,
                })
                    .select('+password') // explicitly select password field for comparison
                    .exec();

                // If user not found, flash error message and return authentication failure
                if (!user) {
                    req.flash('error', 'Invalid Username or Password!');
                    return done(null, false);
                }

                // Compare password with hashed password in database
                
                
                // Ensure consistent password handling by trimming whitespace
                const cleanPassword = password.trim();
                
                // Try with both original and cleaned password to be safe
                let matchPassword = await bcrypt.compare(cleanPassword, user.password);
                
                // If the cleaned password doesn't match, try the original as a fallback
                if (!matchPassword && cleanPassword !== password) {
                    matchPassword = await bcrypt.compare(password, user.password);
                }
                

                if (!matchPassword) {
                    // If password doesn't match, flash error message and return authentication failure
                    req.flash('error', 'Invalid Username or Password!');
                    return done(null, false);
                }
                
                // Check if email is verified
                if (user.isEmailVerified === false) {
                    req.flash('error', 'Please verify your email before signing in. Check your inbox for the verification link.');
                    return done(null, false);
                }
                
                // For existing accounts without the isEmailVerified field, automatically mark them as verified
                if (user.isEmailVerified === undefined) {
                    console.log('Auto-verifying legacy account:', user.email);
                    // Update the user to set isEmailVerified to true
                    await User.findByIdAndUpdate(user._id, { isEmailVerified: true });
                }

                // Return authentication success with user object
                return done(null, user);
            } catch (err) {
                console.log('Error in passport : ', err); 
                return done(err); // Return authentication failure with error object
            }
        }
    )
);

//serilizing user to decide whcih key to be kept in cookies
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

//serilizing user to decide whcih key to be kept in cookies
passport.deserializeUser(async function (id, done) {
    try {
        let user = await User.findById(id).exec();
        return done(null, user);
    } catch (err) {
        console.log('Error in passport : ', err);
        return done(err);
    }
});

passport.checkAuthentication = function (req, res, next) {
    //if user signed in, call the nexyt function
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/sign-in');
};

passport.setAuthenticatedUser = function (req, res, next) {
    if (req.isAuthenticated()) {
        res.locals.user = req.user;
    }
    return next();
};

module.exports = passport;
