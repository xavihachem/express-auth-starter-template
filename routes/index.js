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

// Define routes and their corresponding handlers
router.get('/', passport.checkAuthentication, dashboardController.dashboard); // Dashboard based on user role

// Admin panel route - only accessible by admin users
router.get('/admin', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.adminPanel); // Admin panel
router.post('/admin/grant-investment-access', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.grantInvestmentAccess); // Grant investment access
router.post('/admin/reject-investment-access', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.rejectInvestmentAccess); // Reject investment access
router.get('/admin/wallet-form/:userId', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.walletForm); // Wallet form
router.post('/admin/set-deposit-wallet', passport.checkAuthentication, roleMiddleware.isAdmin, dashboardController.setDepositWallet); // Set deposit wallet

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
router.post('/update-avatar', passport.checkAuthentication, upload.single('avatar'), profileController.updateAvatar); // Profile page

// Investments page routes - only accessible by authenticated users
router.get('/investments', passport.checkAuthentication, investmentsController.investments); // Investments page
router.post('/request-investment-access', passport.checkAuthentication, investmentsController.requestInvestmentAccess); // Request investment access
// Deposit wallet can only be set by admins now
router.post('/update-withdraw-wallet', passport.checkAuthentication, investmentsController.updateWithdrawWallet); // Update withdraw wallet
router.post('/request-withdraw', passport.checkAuthentication, investmentsController.requestWithdraw); // Request withdrawal
router.get('/cancel-withdrawal/:requestId', passport.checkAuthentication, investmentsController.cancelWithdrawal); // Cancel withdrawal request

// Original home route (can be used as a fallback)
router.get('/home', passport.checkAuthentication, authController.home); // Original home page
router.get('/sign-in', authController.signin); // Signin page
router.get('/sign-up', authController.signup); // Signup page

router.post('/check-invitation-code', authController.checkInvitationCode); // Check invitation code and find inviter
router.post('/create-user', authController.createUser); // Create a new user

router.post(
    '/create-session',
    passport.authenticate('local', {
        failureRedirect: '/sign-in',
        failureFlash: true,
    }),
    authController.createSession
); // Create a new session for the user after authentication

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
