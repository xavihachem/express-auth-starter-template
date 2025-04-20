// Import required modules
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');
const dashboardController = require('../controllers/dashboard_controller');
const teamController = require('../controllers/team_controller');
const investmentsController = require('../controllers/investments_controller');
const challengesController = require('../controllers/challenges_controller');
const ranksController = require('../controllers/ranks_controller');
const profileController = require('../controllers/profile_controller');
const notificationsController = require('../controllers/notifications_controller');
const passport = require('passport');
const roleMiddleware = require('../middleware/role_middleware');
const Token = require('../models/token');
const axios = require('axios'); // for SMS sending

// Ensure SMS API key is set
if (!process.env.EASY_SMS_API_KEY) {
    console.error('Missing EASY_SMS_API_KEY environment variable');
    process.exit(1);
}

// Define routes and their corresponding handlers

// Dashboard route (for explicit dashboard navigation)
router.get('/dashboard', passport.checkAuthentication, dashboardController.dashboard);
router.get('/', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        // If user is authenticated, redirect to dashboard
        return res.redirect('/dashboard');
    }
    // Otherwise, render the landing page without using the layout template
    res.render('landing', { layout: false });
}); // Show landing page or redirect to dashboard

// Admin panel route - only accessible by admin users
router.get('/admin', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.adminPanel); // Admin panel
router.post('/admin/grant-investment-access', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.grantInvestmentAccess); // Grant investment access
router.post('/admin/reject-investment-access', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.rejectInvestmentAccess); // Reject investment access
router.get('/admin/wallet-form/:userId', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.walletForm); // Wallet form
router.post('/admin/set-deposit-wallet', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.setDepositWallet); // Set deposit wallet
router.get('/admin/edit-balance/:userId', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.editBalance); // Edit balance form
router.post('/admin/update-balance', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.updateBalance); // Update user balance
router.get('/admin/withdrawal-requests', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.viewWithdrawalRequests); // View all withdrawal requests
router.get('/admin/withdrawal-requests/:userId', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.viewWithdrawalRequests); // View user's withdrawal requests
router.post('/admin/approve-withdrawal', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.approveWithdrawal); // Approve withdrawal request
router.post('/admin/reject-withdrawal', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.rejectWithdrawal); // Reject withdrawal request
router.post('/admin/change-role', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.changeRole); // Change user role
router.get('/admin/update-password/:userId', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.updatePasswordForm); // Show password update form
router.post('/admin/update-password', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.updateUserPassword); // Update user password

// Team page route - only accessible by authenticated users
router.get('/team', passport.checkAuthentication, teamController.team); // Team page

// Challenges routes - only accessible by authenticated users
router.get('/challenges', passport.checkAuthentication, challengesController.challenges); // Challenges page
router.post('/complete-challenge', passport.checkAuthentication, challengesController.completeChallenge); // Complete a challenge

// Ranks route - only accessible by authenticated users
router.get('/ranks', passport.checkAuthentication, ranksController.ranks); // Ranks page

// Notifications routes - only accessible by authenticated users
router.get('/notifications', passport.checkAuthentication, notificationsController.notifications); // Notifications page
router.post('/mark-notifications-read', passport.checkAuthentication, notificationsController.markAllAsRead); // Mark all notifications as read

// Import multer for file uploads
const upload = require('../config/multer');

// Profile routes
router.get('/profile', passport.checkAuthentication, profileController.profile);
router.post('/update-name', passport.checkAuthentication, profileController.updateName);
router.get('/upload-avatar', passport.checkAuthentication, profileController.showAvatarUpload);
// Handle avatar upload with proper error handling
router.post('/update-avatar', passport.checkAuthentication, function(req, res, next) {
    upload.single('avatar')(req, res, function(err) {
        if (err) {
            // Handle multer errors
            req.flash('error', err.message || 'Only JPEG, JPG, PNG, and GIF files are allowed');
            return res.redirect('/profile');
        }
        // No errors, proceed to controller
        next();
    });
}, profileController.updateAvatar); // Profile page

// Investments page routes - only accessible by authenticated users
router.get('/investments', passport.checkAuthentication, investmentsController.investments); // Investments page
router.post('/request-investment-access', passport.checkAuthentication, investmentsController.requestInvestmentAccess); // Request investment access
// Withdraw wallet update protected by phone OTP
router.post('/update-withdraw-wallet', passport.checkAuthentication, async (req, res) => {
    // block if wallet already set
    if (req.user.withdrawWallet) {
        req.flash('error', 'Withdraw wallet is already set. Contact support to change it.');
        return res.redirect('/investments');
    }
    const userId = req.user._id;
    // check for existing token in last 10 minutes
    const ttlDate = new Date(Date.now() - 600000);
    let record = await Token.findOne({ user: userId, createdAt: { $gt: ttlDate } });
    let code;
    if (record) {
        code = record.token;
        req.flash('info', 'Reusing existing verification code');
    } else {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        await Token.create({ user: userId, token: code, createdAt: new Date() });
        // send SMS only when new code
        try {
            await axios.post(
                'https://restapi.easysendsms.app/v1/rest/sms/send',
                { from: 'Moonify', to: req.user.phoneNumber.replace(/^\+|^00/, ''), text: 'Your wallet verification code is ' + code, type: '0' },
                { headers: { apikey: process.env.EASY_SMS_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' } }
            );
        } catch (smsError) {
            console.error('Wallet SMS error:', smsError.response?.status, smsError.response?.data || smsError.message);
        }
        req.flash('info', 'Verification code sent to your phone');
    }
    console.log('🔒 Wallet OTP for user', userId, ':', code);
    // stash and redirect to verify page
    req.session.pendingWithdrawWallet = req.body.withdrawWallet;
    return res.redirect('/verify-wallet');
});
router.post('/request-withdraw', passport.checkAuthentication, investmentsController.requestWithdraw); // Request withdrawal
router.get('/cancel-withdrawal/:requestId', passport.checkAuthentication, investmentsController.cancelWithdrawal); // Cancel withdrawal request

// Phone verification routes
router.get('/verify-phone', authController.showPhoneVerificationForm); // Show code entry
router.post('/verify-phone', authController.handlePhoneVerification); // Process verification

// Wallet verification routes for withdraw wallet update
router.get('/verify-wallet', passport.checkAuthentication, investmentsController.showWalletVerificationForm);
router.post('/verify-wallet', passport.checkAuthentication, investmentsController.handleWalletVerification);

// Login with phone verification check
router.post('/create-session', function(req, res, next) {
    // Fix the email field if it's an array
    if (Array.isArray(req.body.email)) {
        req.body.email = req.body.email[0]; // Take the first email value
    }
    next();
}, passport.authenticate('local', {
    failureRedirect: '/sign-in',
    failureFlash: true,
}), async function(req, res, next) {
    // At this point passport has set req.user
    if (!req.user.isPhoneVerified) {
        const tempId = req.user._id;
        const now = Date.now();
        const tenMinAgo = new Date(now - 600000);
        // Atomic upsert: reuse existing token or insert new
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const preRecord = await Token.findOneAndUpdate(
            { user: tempId, createdAt: { $gt: tenMinAgo } },
            { $setOnInsert: { user: tempId, token: newCode, createdAt: new Date() } },
            { new: false, upsert: true }
        );
        let code;
        if (preRecord) {
            // Existing token found: skip SMS
            code = preRecord.token;
            console.log(`🔒 Reusing SMS code for user ${tempId}: ${code}`);
            req.flash('info', `Your verification code is: ${code}`);
            return req.logout(function(err) {
                if (err) return next(err);
                req.session.tempUserId = tempId;
                return res.redirect('/verify-phone');
            });
        }
        // New token created: send SMS
        code = newCode;
        console.log(`🔒 Debug phone verification code for user ${tempId}: ${code}`);
        try {
            const smsKey = process.env.EASY_SMS_API_KEY;
            await axios.post(
                'https://restapi.easysendsms.app/v1/rest/sms/send',
                {
                    from: 'Moonify',
                    to: req.user.phoneNumber.replace(/^\+|^00/, ''),
                    text: `Your verification code is ${code}`,
                    type: '0'
                },
                {
                    headers: {
                        apikey: smsKey,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    }
                }
            );
        } catch (smsError) {
            // Log detailed error response from EasySendSMS
            console.error('Failed to send SMS:', smsError.response?.status, smsError.response?.data || smsError.message);
            req.flash('error', 'Unable to send SMS; please try again or contact support.');
            req.flash('info', `Your verification code is: ${code}`);
        }
        // Logout and redirect to verification page
        return req.logout(function(err) {
            if (err) return next(err);
            req.session.tempUserId = tempId;
            return res.redirect('/verify-phone');
        });
    }
    // proceed to login user
    req.logIn(req.user, err => {
        if (err) return next(err);
        return res.redirect('/dashboard');
    });
});

router.get('/sign-in', authController.signin); // Signin page
router.get('/sign-up', authController.signup); // Signup page
router.get('/verify-email/:userId/:token', authController.verifyEmail); // Email verification
router.post('/resend-verification', authController.resendVerificationEmail); // Resend verification email

router.post('/check-invitation-code', authController.checkInvitationCode); // Check invitation code and find inviter
router.post('/create-user', authController.createUser); // Create a new user

router.get('/sign-out', authController.destroySession); // Destroy the current session

router.get(
    '/change-password',
    passport.checkAuthentication,
    authController.changePassword
); // Page to change the password, accessible only to authenticated users

router.post(
    '/update-password',
    passport.checkAuthentication,
    authController.updatePassword
); // Endpoint to update the password, accessible only to authenticated users

router.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
); // Endpoint to authenticate using Google OAuth

router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/sign-in' }),
    authController.createSession
); // Callback URL for Google OAuth authentication

router.get('/forgot-password', authController.forgotPassword); // Forgot password page
router.post('/send-reset-link', authController.sendPasswordResetLink); // Send password reset link to the user's email
router.get('/reset-password', authController.resetPassword); // Page to reset the password using a reset link
router.post('/set-new-password', authController.verifyAndSetNewPassword); // Set a new password after verifying the reset link

// Export the router module
module.exports = router;
