// Importing required modules and models
const User = require('../models/user');
const Token = require('../models/token');
const authMailer = require('../mailers/auth_mailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
var validator = require('validator');
var axios = require('axios');

// Rendering the home page
module.exports.home = function (req, res) {
    return res.render('home');
};

// Rendering the sign-in page, if already logged in go to home page
module.exports.signin = function (req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    return res.render('sign_in', { 
        site_key: process.env.RECAPTCHA_SITE_KEY,
        page: 'sign_in' // Set page variable for cosmic theme
    })
};

// Rendering the sign-up page, if already logged in go to home page
module.exports.signup = function (req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    return res.render('sign_up', { 
        site_key: process.env.RECAPTCHA_SITE_KEY,
        page: 'sign_up' // Set page variable for cosmic theme
    })
};

// Check invitation code and return inviter's name
module.exports.checkInvitationCode = async function (req, res) {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ success: false, message: 'No invitation code provided' });
        }
        
        // Find user with the provided code
        const inviter = await User.findOne({ userCode: code });
        
        if (!inviter) {
            return res.status(404).json({ success: false, message: 'Invalid invitation code' });
        }
        
        // Return inviter's name
        return res.status(200).json({
            success: true,
            inviterName: inviter.name,
            message: `You were invited by ${inviter.name}`
        });
        
    } catch (err) {
        console.log('Error in checking invitation code:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Create and export createUser function
module.exports.createUser = async function (req, res) {
    try {
        // Validate the inputs provided (email, name, password, invitation code)
        const {
            email,
            name,
            password,
            confirm_password,
            invitation_code,
            phoneNumber,
            phone,
            'g-recaptcha-response': recaptchaResponse,
        } = req.body;
        let errorMsg = '';
        if (!validator.isEmail(email)) {
            errorMsg += 'Invalid email. ';
        }
        if (validator.isEmpty(name)) {
            errorMsg += 'Name is required. ';
        }
        if (
            validator.isEmpty(password) ||
            validator.isEmpty(confirm_password)
        ) {
            errorMsg += 'Password is required. ';
        }
        if (password !== confirm_password) {
            errorMsg += 'Confirm password should be same as password. ';
        }
        if (errorMsg) {
            req.flash('error', errorMsg);
            return res.redirect('back');
        }

        // reCAPTCHA verification bypassed
        // Keeping this comment to document the change

        // Check if user already exists
        const existingUser = await User.findOne({ email }).exec();
        if (existingUser) {
            req.flash('error', 'Email already exists.');
            return res.redirect('back');
        }

        // Clean the password by removing any leading/trailing whitespace
        const cleanPassword = password.trim();
        
        // IMPORTANT: Do NOT hash the password here!
        // The User model has a pre-save hook that will hash the password
        // If we hash it here, it will be double-hashed

        // Generate a permanent user code
        const timestamp = new Date().getTime().toString().slice(-4);
        const random = Math.floor(100000 + Math.random() * 900000);
        const userCode = 'UC' + timestamp + random.toString().substring(0, 2);
        
        // Create user data object
        const userData = {
            email,
            name,
            password: cleanPassword, // Use the clean password, model will hash it
            userCode: userCode, // Explicitly set the user code
            // role is automatically set to 'user' by default
        };
        // Use intlTelInput value or fallback raw phone input
        const finalPhone = phoneNumber && phoneNumber.trim()
            ? phoneNumber.trim()
            : (phone && phone.trim() ? phone.trim() : null);
        if (finalPhone) {
            userData.phoneNumber = finalPhone;
            // Ensure phone number is unique
            const existingUser = await User.findOne({ phoneNumber: finalPhone });
            if (existingUser) {
                req.flash('error', 'Phone number already in use');
                return res.redirect('back');
            }
        }
        
        // If invitation code is provided, find the inviter and update user data
        if (invitation_code) {
            const inviter = await User.findOne({ userCode: invitation_code });
            if (inviter) {
                userData.invitedBy = inviter._id;
                
                // Increment the inviter's userInvites count
                await User.findByIdAndUpdate(
                    inviter._id,
                    { $inc: { userInvites: 1 } }
                );
            }
        }
        
        const newUser = await User.create(userData);
        
        // Generate verification token
        const token = crypto.randomBytes(32).toString('hex');
        
        // Save token to database
        await Token.create({
            user: newUser._id,
            token: token
        });
        
        // Create verification link
        const verificationLink = `${process.env.BASE_URL}/verify-email/${newUser._id}/${token}`;
        
        // Send verification email
        authMailer.emailVerificationMail(newUser, verificationLink);
        
        req.flash('success', 'Account created successfully! Please check your email to verify your account.');
        res.redirect('/sign-in');
    } catch (err) {
        console.log('Error:', err);
        req.flash('error', 'Error while signing up, please try again.');
        return res.redirect('back');
    }
};

// Getting the user credentials and creating user session
module.exports.createSession = function (req, res) {
    req.flash('success', 'Signed in successfully.');
    return res.redirect('/');
};

// Handle email verification
module.exports.verifyEmail = async function (req, res) {
    try {
        // Get user ID and token from params
        const { userId, token } = req.params;
        
        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            req.flash('error', 'Invalid verification link.');
            return res.redirect('/sign-in');
        }
        
        // If user is already verified
        if (user.isEmailVerified) {
            req.flash('success', 'Email already verified. Please sign in.');
            return res.redirect('/sign-in');
        }
        
        // Find the token
        const verificationToken = await Token.findOne({
            user: userId,
            token: token
        });
        
        if (!verificationToken) {
            req.flash('error', 'Invalid or expired verification link. Please sign in and request a new verification email.');
            return res.redirect('/sign-in');
        }
        
        // Verify the user's email
        await User.findByIdAndUpdate(userId, { isEmailVerified: true });
        
        // Delete the token
        await Token.findByIdAndDelete(verificationToken._id);
        
        req.flash('success', 'Email verified successfully! You can now sign in.');
        return res.redirect('/sign-in');
    } catch (err) {
        console.log('Error in email verification:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/sign-in');
    }
};

// Store for rate limiting verification emails
const verificationAttempts = {};

// Resend verification email with rate limiting
module.exports.resendVerificationEmail = async function (req, res) {
    try {
        const { email } = req.body;
        
        if (!email || !validator.isEmail(email)) {
            req.flash('error', 'Please provide a valid email address.');
            return res.redirect('/sign-in');
        }
        
        // Rate limiting check
        const clientIp = req.ip || req.connection.remoteAddress;
        const key = `${email}:${clientIp}`;
        const now = Date.now();
        
        if (verificationAttempts[key]) {
            const lastAttempt = verificationAttempts[key];
            const timeSinceLastAttempt = now - lastAttempt;
            
            // Limit to one request per 5 minutes (300,000 ms)
            if (timeSinceLastAttempt < 300000) {
                const timeLeft = Math.ceil((300000 - timeSinceLastAttempt) / 60000);
                req.flash('error', `Please wait ${timeLeft} minute(s) before requesting another verification email.`);
                return res.redirect('/sign-in');
            }
        }
        
        // Find the user
        const user = await User.findOne({ email });
        
        if (!user) {
            // Don't reveal that the email doesn't exist for security reasons
            // But still update rate limit to prevent email enumeration attacks
            verificationAttempts[key] = now;
            
            // Clean up old entries every hour
            setTimeout(() => {
                delete verificationAttempts[key];
            }, 3600000); // 1 hour
            
            req.flash('success', 'If your email exists in our system, a verification link has been sent.');
            return res.redirect('/sign-in');
        }
        
        // If user is already verified
        if (user.isEmailVerified) {
            req.flash('success', 'Your email is already verified. Please sign in.');
            return res.redirect('/sign-in');
        }
        
        // Update rate limiting
        verificationAttempts[key] = now;
        
        // Clean up old entries after 1 hour
        setTimeout(() => {
            delete verificationAttempts[key];
        }, 3600000); // 1 hour
        
        // Delete any existing tokens for this user
        await Token.deleteMany({ user: user._id });
        
        // Generate new verification token
        const token = crypto.randomBytes(32).toString('hex');
        
        // Save token to database
        await Token.create({
            user: user._id,
            token: token
        });
        
        // Create verification link
        const verificationLink = `${process.env.BASE_URL}/verify-email/${user._id}/${token}`;
        
        // Send verification email
        authMailer.emailVerificationMail(user, verificationLink);
        
        req.flash('success', 'A new verification link has been sent to your email.');
        return res.redirect('/sign-in');
    } catch (err) {
        console.log('Error in resending verification email:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/sign-in');
    }
};

// to logout user using passports's logout method
module.exports.destroySession = function (req, res, next) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Signed out successfully.');
        return res.redirect('/');
    });
};

//to render the chaange password
module.exports.changePassword = function (req, res) {
    return res.render('change_password', {
        site_key: process.env.RECAPTCHA_SITE_KEY,
    });
};

//to update the password once user provide the current and new password
module.exports.updatePassword = async function (req, res) {
    try {

        if (req.body.new_password != req.body.confirm_new_password) {
            req.flash('error', 'Confirm password should be same.');
            return res.redirect('back');
        }
        let user = await User.findOne({ _id: req.user.id })
            .select('+password')
            .exec();

        let macthPasswrrd = await bcrypt.compare(
            req.body.current_password,
            user.password
        );
        if (!macthPasswrrd) {
            req.flash('error', 'Invalid password.');
            return res.redirect('back');
        }

        // Hash the password directly before updating
        const hashedPassword = await bcrypt.hash(req.body.new_password, 10);
        
        // Update the password directly in the database, bypassing any middleware
        await User.updateOne(
            { _id: user.id },
            { $set: { password: hashedPassword } }
        );
        
        req.flash('success', 'Password updated.');
        authMailer.passwordChangeAlertMail(user);
        return res.redirect('back');
    } catch (err) {
        console.log('Error : ', err);
        return res.redirect('back');
    }
};

module.exports.forgotPassword = function (req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    return res.render('forgot_password');
};

module.exports.sendPasswordResetLink = async function (req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    try {
        let validationError = '';
        if (!validator.isEmail(req.body.email)) {
            validationError = validationError + 'Invalid email. ';
        }

        // reCAPTCHA validation check removed

        if (!!validationError) {
            req.flash('error', validationError);
            return res.redirect('back');
        }

        // reCAPTCHA verification bypassed
        // Keeping this comment to document the change

        let user = await User.findOne({ email: req.body.email }).exec();
        if (user) {
            let token = await Token.findOne({ userId: user._id });
            if (token) await token.deleteOne();
            let resetToken = crypto.randomBytes(32).toString('hex');
            await new Token({
                user: user._id,
                token: resetToken,
                createdAt: Date.now(),
            }).save();
            let baseURL = process.env.BASE_URL;
            user.resetLink = `${baseURL}/reset-password?id=${user._id}&key=${resetToken}`;
            req.flash(
                'success',
                'An email has been sent to mailbox. please follow the instructions to reset your password.'
            );
            authMailer.passwordResetLinkMail(user);
        } else {
            req.flash(
                'error',
                `Email is not registered with us. Please retry will correct email.`
            );
        }
    } catch (err) {
        console.log('Error : ', err);
    }
    return res.redirect('back');
};

module.exports.resetPassword = async function (req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    try {
        let isTokenValid = await Token.findOne({
            user: req.query.id,
            token: req.query.key,
        }).exec();

        return res.render('reset_password', {
            isTokenValid: isTokenValid,
            id: req.query.id,
            key: req.query.key,
        });
    } catch (err) {
        console.log('Error : ', err);
        return res.redirect('/');
    }
};

// This function is used to verify and set the new password for a user based on the reset token they received.
module.exports.verifyAndSetNewPassword = async function (req, res) {
    try {
        // Extracting the required data from request body.
        const { id, key, new_password, confirm_new_password } = req.body;

        // Finding if the reset token is valid and belongs to the user.
        const isTokenValid = await Token.findOne({
            user: id,
            token: key,
        }).exec();

        // If token is not valid, displaying an error message and redirecting to the previous page.
        if (!isTokenValid) {
            req.flash(
                'error',
                'Password reset link expired, please try again.'
            );
            return res.redirect('back');
        }

        // Checking if new password and confirm password fields match.
        if (new_password !== confirm_new_password) {
            req.flash('error', 'Confirm password should be same.');
            return res.redirect('back');
        }

        // Hash the password directly before updating
        const hashedPassword = await bcrypt.hash(new_password, 10);
        
        // Update the password directly in the database, bypassing any middleware
        const updateResult = await User.updateOne(
            { _id: id },
            { $set: { password: hashedPassword } }
        );
        
        if (updateResult.modifiedCount === 0) {
            req.flash('error', 'User not found or password not updated');
            return res.redirect('/sign-in');
        }
        
        // Get the user for the email notification
        const user = await User.findById(id);
        
        // Deleting the reset token from the database as it is not required anymore.
        await Token.findByIdAndDelete(isTokenValid._id);
        req.flash('success', 'Password updated.');

        authMailer.passwordChangeAlertMail(user); // Restore mailer call

        // Redirecting the user to the login page.
        return res.redirect('/sign-in');
    } catch (err) {
        console.log('Error : ', err);
        // Adding a redirect in the catch block to prevent hanging
        req.flash('error', 'An unexpected error occurred during password reset.');
        return res.redirect('/forgot-password'); 
    }
};
