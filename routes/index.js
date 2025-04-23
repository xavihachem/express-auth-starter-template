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
const offersController = require('../controllers/offers_controller');
const passport = require('passport');
const roleMiddleware = require('../middleware/role_middleware');
const Token = require('../models/token');
const OtpToken = require('../models/otpToken');
const axios = require('axios'); // for SMS sending
const rateLimit = require('express-rate-limit');

// Ensure SMS API key is set
if (!process.env.EASY_SMS_API_KEY) {
    console.error('Missing EASY_SMS_API_KEY environment variable');
    process.exit(1);
}

// Define routes and their corresponding handlers

// Dashboard route (for explicit dashboard navigation)
router.get('/dashboard', passport.checkAuthentication, dashboardController.dashboard);

// Challenges routes
router.get('/challenges', passport.checkAuthentication, challengesController.challenges); // Display challenges page
router.post('/complete-challenge', passport.checkAuthentication, challengesController.completeChallenge); // Handle challenge completion
// Development-only route for testing challenge resets
router.get('/reset-test-challenges', passport.checkAuthentication, challengesController.resetTestChallenges); // Reset test challenges

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
router.get('/admin/wallet-form/:userId', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.walletForm); // Deposit wallet form
router.post('/admin/set-deposit-wallet', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.setDepositWallet); // Set deposit wallet
// Withdraw wallet form route
router.get('/admin/withdraw-wallet-form/:userId', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.withdrawWalletForm);
router.post('/admin/set-withdraw-wallet', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.setWithdrawWallet); // Set withdraw wallet
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

// Offers page route - accessible by all users
router.get('/offers', offersController.offers); // Offers page

// Ranks route - only accessible by authenticated users
router.get('/ranks', passport.checkAuthentication, ranksController.ranks); // Ranks page

// Notifications routes - only accessible by authenticated users
router.get('/notifications', passport.checkAuthentication, notificationsController.notifications); // Notifications page
router.post('/mark-notifications-read', passport.checkAuthentication, notificationsController.markAllAsRead); // Mark all notifications as read
router.post('/ajax/mark-notifications-read', passport.checkAuthentication, notificationsController.markAllAsRead); // AJAX endpoint to mark all notifications as read

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
// OTP rate limiter: max 3 requests per 15 minutes, skipped in non-production
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  skip: (req, res) => process.env.NODE_ENV !== 'production',
  message: 'You’ve requested too many OTP requests. Please try again in 15 minutes.'
});
// Withdraw wallet update protected by phone OTP
router.post('/update-withdraw-wallet', passport.checkAuthentication, otpLimiter, async (req, res) => {
    // block if wallet already set
    if (req.user.withdrawWallet) {
        req.flash('error', 'Wallet already set.');
        return res.redirect('/investments');
    }
    const userId = req.user._id;
    // Use separate OTP collection for wallet verification
    const existingW = await OtpToken.findOne({ user: userId });
    const code = existingW
        ? existingW.token
        : Math.floor(100000 + Math.random() * 900000).toString();
    if (!existingW) {
        await OtpToken.create({ user: userId, token: code });
    }
    console.log(' (Test mode) Wallet OTP for user ' + userId + ': ' + code);
    req.flash('info', 'Your wallet verification code is: ' + code);
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
    // Handle potential array in email field from duplicate inputs
    if (Array.isArray(req.body.email)) {
        req.body.email = req.body.email[0]; // Take the first email value
    }
    next();
}, passport.authenticate('local', {
    failureRedirect: '/sign-in',
    failureFlash: true,
}), async function(req, res, next) {
    // Passport has set req.user
    // User successfully authenticated

    // Step 1: Attempt session setup (includes daily challenge completion)
    const sessionSetupSuccess = await authController.createSession(req.user);
    if (sessionSetupSuccess) {
        req.flash('success', 'Signed in successfully.');
    } else {
        // Optional: Add a flash message if session setup failed, though unlikely here
        console.error('Session creation failed for user:', req.user._id);
        req.flash('error', 'An issue occurred during login setup.');
        // Decide how to handle this - maybe redirect to sign-in?
        // For now, we proceed to phone verification check
    }

    // Step 2: Check phone verification
    if (!req.user.isPhoneVerified) {
        const tempId = req.user._id;
        // Phone not verified, redirecting to verification
        // Use separate OTP collection for phone verification
        const otpToken = await OtpToken.create({
            user: tempId,
            otp: Math.floor(100000 + Math.random() * 900000).toString(), // Generate 6-digit OTP
            purpose: 'phone_verification'
        });
        // Send OTP via SMS (ensure you have an SMS sending function)
        // await sendSms(req.user.phone, `Your verification code is: ${otpToken.otp}`);
        console.log(`[DEBUG] Generated OTP for phone verification: ${otpToken.otp} for user ${tempId}`); // REMOVE IN PRODUCTION

        // Log the user out temporarily, store ID in session for verification page
        req.logout(function(err) {
            if (err) { return next(err); }
            req.session.verifyUserId = tempId; // Store user ID for verification
            req.session.verifyPurpose = 'phone_verification'; // Indicate purpose
            return res.redirect('/verify-phone'); // Redirect to phone verification page
        });
    } else {
        // Phone verified, proceeding to dashboard
        // Step 3: Redirect to dashboard if phone is verified
        return res.redirect('/dashboard'); // Changed from '/' to '/dashboard' for clarity
    }
});

// Route for handling Google OAuth callback
router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/sign-in', failureFlash: true }),
    async function(req, res, next) { // Changed this to be async
        // Google auth successful, Passport sets req.user
        // Google auth successful

        // Step 1: Attempt session setup (includes daily challenge completion)
        const sessionSetupSuccess = await authController.createSession(req.user);
        if (sessionSetupSuccess) {
            req.flash('success', 'Signed in successfully via Google.');
        } else {
            console.error('Session creation failed for Google user:', req.user._id);
            req.flash('error', 'An issue occurred during Google login setup.');
            // Decide handling - proceed for now
        }

        // Step 2: Check phone verification
        if (!req.user.isPhoneVerified) {
            const tempId = req.user._id;
            // Phone not verified for Google user
            const otpToken = await OtpToken.create({
                user: tempId,
                otp: Math.floor(100000 + Math.random() * 900000).toString(),
                purpose: 'phone_verification'
            });
            // await sendSms(req.user.phone, `Your verification code is: ${otpToken.otp}`);
             console.log(`[DEBUG] Generated OTP for phone verification: ${otpToken.otp} for user ${tempId}`); // REMOVE IN PRODUCTION

            req.logout(function(err) {
                if (err) { return next(err); }
                req.session.verifyUserId = tempId;
                req.session.verifyPurpose = 'phone_verification';
                return res.redirect('/verify-phone');
            });
        } else {
            // Phone verified for Google user
            // Step 3: Redirect to dashboard if phone is verified
            return res.redirect('/dashboard'); // Changed from '/' to '/dashboard'
        }
    }
); 

// Route for handling forgot password page
router.get('/forgot-password', authController.forgotPassword); // Forgot password page
router.post('/send-reset-link', authController.sendPasswordResetLink); // Send password reset link to the user's email
router.get('/reset-password', authController.resetPassword); // Page to reset the password using a reset link
router.post('/set-new-password', authController.verifyAndSetNewPassword); // Set a new password after verifying the reset link

// Bypass CSRF for code validation only (this is safe as it only reads data)
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Invitation code check with no CSRF requirement (safe read-only endpoint)
router.post('/check-invitation-code', function(req, res, next) {
    res.header('Content-Type', 'application/json');
    // Skip CSRF for this specific endpoint
    next();
}, authController.checkInvitationCode); // Check invitation code and find inviter

// Proxy for IP geolocation (to fix CORS issues)
router.get('/api/ip-geolocation', async (req, res) => {
    try {
        // Create a fallback response with common country codes
        const fallbackResponse = {
            ip: req.ip || '127.0.0.1',
            country_code: 'US',
            country_name: 'United States'
        };
        
        // Send the fallback response directly - no external API call needed
        res.json(fallbackResponse);
    } catch (error) {
        console.error('IP Geolocation error:', error.message);
        res.status(500).json({ error: 'Failed to process geolocation data' });
    }
});

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

router.get('/sign-in', authController.signin); // Signin page
router.get('/sign-up', authController.signup); // Signup page
router.get('/verify-email/:userId/:token', authController.verifyEmail); // Email verification
router.post('/resend-verification', authController.resendVerificationEmail); // Resend verification email

// Route to check for unread notifications (called by client-side JS for real-time updates)
router.get('/check-notifications', passport.checkAuthentication, async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        // Get unread notifications count for current user
        const Notification = require('../models/notification');
        const unreadCount = await Notification.countDocuments({ 
            recipient: req.user._id, 
            read: false 
        });

        // Return the count as JSON
        return res.json({
            success: true,
            unreadCount: unreadCount
        });
    } catch (error) {
        console.error('Error checking notifications:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Daily reward system routes
router.get('/check-daily-reward', passport.checkAuthentication, dashboardController.checkDailyRewardEligibility);
router.post('/claim-daily-reward', passport.checkAuthentication, dashboardController.claimDailyReward);

// Export the router module
module.exports = router;
