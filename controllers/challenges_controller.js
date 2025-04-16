const User = require('../models/user');
const Challenge = require('../models/challenge');

// Helper function to check if challenges need to be reset
const checkAndResetChallenges = async (user) => {
    const now = new Date();
    const lastReset = new Date(user.lastChallengeReset);
    
    // Check if it's a new day (24 hours have passed)
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
        
        // Reset completed challenges and update reset time
        await User.findByIdAndUpdate(user._id, {
            completedChallenges: [],
            lastChallengeReset: now
        });
        
        return true; // Challenges were reset
    }
    
    return false; // No reset needed
};

// Controller for challenges page
module.exports.challenges = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to access your challenges');
            return res.redirect('/sign-in');
        }

        // Find the current user with complete data
        const currentUser = await User.findById(req.user._id);
        
        if (!currentUser) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }
        
        // Check if challenges need to be reset
        const challengesReset = await checkAndResetChallenges(currentUser);
        
        // If challenges were reset, get the updated user data
        const user = challengesReset ? 
            await User.findById(currentUser._id) : 
            currentUser;
        
        // Get all active challenges
        const allChallenges = await Challenge.find({ active: true, type: 'daily' });
        
        // Separate completed and available challenges
        const completedChallengeIds = user.completedChallenges || [];
        const completedChallenges = allChallenges.filter(challenge => 
            completedChallengeIds.includes(challenge.id)
        );
        const availableChallenges = allChallenges.filter(challenge => 
            !completedChallengeIds.includes(challenge.id)
        );
        
        // Render the challenges page
        return res.render('challenges', {
            user,
            completedChallenges,
            availableChallenges,
            challengePoints: user.challengePoints || 0,
            completedToday: completedChallengeIds.length,
            totalChallenges: allChallenges.length
        });
    } catch (err) {
        console.log('Error in challenges controller:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/');
    }
};

// Complete a challenge
module.exports.completeChallenge = async function(req, res) {
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to complete challenges');
            return res.redirect('/sign-in');
        }

        const { challengeId } = req.body;
        
        if (!challengeId || typeof challengeId !== 'string') {
            req.flash('error', 'Valid challenge ID is required');
            return res.redirect('/challenges');
        }
        
        // Find the challenge
        const challenge = await Challenge.findOne({ id: challengeId, active: true });
        
        if (!challenge) {
            req.flash('error', 'Challenge not found or inactive');
            return res.redirect('/challenges');
        }
        
        // Find the user
        const user = await User.findById(req.user._id);
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/challenges');
        }
        
        // Check if challenges need to be reset
        await checkAndResetChallenges(user);
        
        // Check if user has already completed this challenge
        if (user.completedChallenges && user.completedChallenges.includes(challengeId)) {
            req.flash('info', 'You have already completed this challenge');
            return res.redirect('/challenges');
        }
        
        // Update user's completed challenges and points
        const completedChallenges = [...(user.completedChallenges || []), challengeId];
        const challengePoints = (user.challengePoints || 0) + (challenge.points || 1);
        
        await User.findByIdAndUpdate(user._id, {
            completedChallenges,
            challengePoints
        });
        
        req.flash('success', `Challenge completed! You earned ${challenge.points} points.`);
        return res.redirect('/challenges');
    } catch (err) {
        console.log('Error completing challenge:', err);
        req.flash('error', 'Failed to complete challenge');
        return res.redirect('/challenges');
    }
};

// Initialize default challenges if none exist
module.exports.initializeChallenges = async function() {
    try {
        // Check if challenges already exist
        const existingChallenges = await Challenge.countDocuments();
        
        if (existingChallenges === 0) {
            // Default challenges to create
            const defaultChallenges = [
                {
                    id: 'daily-login',
                    title: 'Daily Login',
                    description: 'Log in to your account today',
                    points: 1,
                    type: 'daily'
                },
                {
                    id: 'visit-team',
                    title: 'Visit Team Page',
                    description: 'Check your team page',
                    points: 2,
                    type: 'daily'
                },
                {
                    id: 'update-profile',
                    title: 'Update Profile',
                    description: 'Update your profile information',
                    points: 3,
                    type: 'daily'
                },
                {
                    id: 'invite-friend',
                    title: 'Invite a Friend',
                    description: 'Share your invitation code with a friend',
                    points: 5,
                    type: 'daily'
                }
            ];
            
            // Create the default challenges
            await Challenge.insertMany(defaultChallenges);
            console.log('Default challenges initialized');
        }
    } catch (err) {
        console.log('Error initializing challenges:', err);
    }
};
