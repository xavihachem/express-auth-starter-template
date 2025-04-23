const User = require('../models/user');
const Challenge = require('../models/challenge');

// Helper function to check if challenges need to be reset
const checkAndResetChallenges = async (user) => {
    // Handle case where lastChallengeReset is undefined or invalid
    if (!user.lastChallengeReset) {
        await User.findByIdAndUpdate(user._id, {
            lastChallengeReset: new Date()
        });
        return false; // No reset needed, just initialized the date
    }
    
    const now = new Date();
    const lastReset = new Date(user.lastChallengeReset);
    
    // Check if it's a new day (24 hours have passed)
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
        
        // Reset completed challenges and update reset time
        const resetResult = await User.findByIdAndUpdate(user._id, {
            completedChallenges: [],
            lastChallengeReset: now
        }, { new: true });
        
        return true; // Challenges were reset
    }
    
    return false; // No reset needed
};

// Helper function to get active override challenges
async function getActiveChallengesOverride() {
    let dailyLoginChallenge = await Challenge.findOne({ id: 'daily-login' });
    if (!dailyLoginChallenge) {
        dailyLoginChallenge = {
            id: 'daily-login',
            title: 'Daily Login',
            description: 'Log in to your account today',
            points: 1,
            type: 'daily',
            active: true,
            isInMemory: true // Mark as in-memory if needed
        };
    }

    // 'start-investing' is always in-memory based on current logic
    const startInvestingChallenge = {
        id: 'start-investing',
        title: 'Start Investing',
        description: 'Visit the investments page and start your first investment',
        points: 2,
        type: 'daily',
        active: true,
        isInMemory: true // Mark as in-memory
    };

    const overrideChallenges = [dailyLoginChallenge, startInvestingChallenge].filter(c => c && c.active);
    return overrideChallenges;
}

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
        
        // Get the list of challenges using the override logic
        const allChallenges = await getActiveChallengesOverride();
        
        // OVERRIDE: Filter completed challenges to only include our supported ones
        let completedChallengeIds = user.completedChallenges || [];
        
        // Filter to only include our supported challenges
        completedChallengeIds = completedChallengeIds.filter(id => 
            id === 'daily-login' || id === 'start-investing'
        );
        
        // Create completed challenges based on our hardcoded list
        const completedChallenges = [];
        
        for (const id of completedChallengeIds) {
            if (id === 'daily-login' && allChallenges.find(c => c.id === 'daily-login')) {
                completedChallenges.push(allChallenges.find(c => c.id === 'daily-login'));
            } else if (id === 'start-investing' && allChallenges.find(c => c.id === 'start-investing')) {
                completedChallenges.push(allChallenges.find(c => c.id === 'start-investing'));
            }
        }
        
        // Filter available challenges to exclude completed ones
        const availableChallenges = allChallenges.filter(challenge => 
            !completedChallengeIds.includes(challenge.id)
        );
        
        // Render the challenges page
        return res.render('challenges', {
            title: 'Daily Challenges',
            availableChallenges,
            completedChallenges,
            challengePoints: user.challengePoints || 0,
            completedToday: completedChallengeIds.length,
            totalChallenges: allChallenges.length,
            user: req.user,
            messages: req.flash(),
            layout: 'layout' // Ensure the layout is used
        });
    } catch (err) {
        console.log('Error loading challenges page:', err);
        req.flash('error', 'Failed to load challenges');
        return res.redirect('/');
    }
};

// Complete a challenge
module.exports.completeChallenge = async function(req, res) {
    console.log('[CHALLENGE_DEBUG] Starting challenge completion process');
    try {
        // Check if user is authenticated
        if (!req.isAuthenticated()) {
            console.log('[CHALLENGE_DEBUG] User not authenticated');
            req.flash('error', 'Please sign in to complete challenges');
            return res.redirect('/sign-in');
        }
        
        const { challengeId } = req.body;
        console.log(`[CHALLENGE_DEBUG] Processing challenge completion for ID: ${challengeId}`);
        
        if (!challengeId || typeof challengeId !== 'string') {
            console.log('[CHALLENGE_DEBUG] Invalid challenge ID provided');
            req.flash('error', 'Valid challenge ID is required');
            return res.redirect('/challenges');
        }
        
        // Find the challenge within the override list
        const availableChallenges = await getActiveChallengesOverride();
        const challenge = availableChallenges.find(c => c.id === challengeId);
        console.log(`[CHALLENGE_DEBUG] Challenge found: ${challenge ? 'Yes' : 'No'}`);
        
        if (!challenge) {
            console.log('[CHALLENGE_DEBUG] Challenge not found or inactive');
            req.flash('error', 'Challenge not found or inactive');
            return res.redirect('/challenges');
        }
        
        // Find the user
        const user = await User.findById(req.user._id);
        console.log(`[CHALLENGE_DEBUG] User found: ${user ? 'Yes' : 'No'}`);
        
        if (!user) {
            console.log('[CHALLENGE_DEBUG] User not found');
            req.flash('error', 'User not found');
            return res.redirect('/challenges');
        }
        
        // Check if challenges need to be reset
        const resetResult = await checkAndResetChallenges(user);
        console.log(`[CHALLENGE_DEBUG] Challenges reset: ${resetResult}`);
        
        // Get updated user if challenges were reset
        const updatedUser = resetResult ? await User.findById(req.user._id) : user;
        
        // Check if user has already completed this challenge
        if (updatedUser.completedChallenges && updatedUser.completedChallenges.includes(challengeId)) {
            console.log('[CHALLENGE_DEBUG] Challenge already completed');
            req.flash('info', 'You have already completed this challenge');
            return res.redirect('/challenges');
        }
        
        // Update user's completed challenges and points
        const completedChallenges = [...(updatedUser.completedChallenges || []), challengeId];
        const challengePoints = (updatedUser.challengePoints || 0) + (challenge.points || 1);
        
        console.log(`[CHALLENGE_DEBUG] Updating user - adding challenge ${challengeId} to completed list`);
        console.log(`[CHALLENGE_DEBUG] New points total will be: ${challengePoints}`);
        
        const updateResult = await User.findByIdAndUpdate(updatedUser._id, {
            completedChallenges,
            challengePoints
        }, { new: true });
        
        console.log(`[CHALLENGE_DEBUG] Update successful: ${!!updateResult}`);
        
        // Special handling for the start-investing challenge - no redirection, just show success
        if (challengeId === 'start-investing') {
            console.log('[CHALLENGE_DEBUG] Start Investing challenge completed - staying on challenges page');
            req.flash('success', `Challenge completed! You earned ${challenge.points} points. You are now investing!`);
            return res.redirect('/challenges');
        }
        
        req.flash('success', `Challenge completed! You earned ${challenge.points} points.`);
        return res.redirect('/challenges');
    } catch (err) {
        console.log('[CHALLENGE_DEBUG] Error completing challenge:', err);
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

// Testing helper to reset specific challenges for a user
// This is purely for development and testing purposes
module.exports.resetTestChallenges = async function(req, res) {
    try {
        // Only allow in non-production environments
        if (process.env.NODE_ENV === 'production') {
            console.log('[CHALLENGE_DEBUG] Reset attempted in production environment');
            req.flash('error', 'This feature is not available in production');
            return res.redirect('/challenges');
        }
        
        // Check authentication
        if (!req.isAuthenticated()) {
            req.flash('error', 'Please sign in to reset challenges');
            return res.redirect('/sign-in');
        }
        
        console.log(`[CHALLENGE_DEBUG] Resetting test challenges for user: ${req.user._id}`);
        
        // Get the user
        const user = await User.findById(req.user._id);
        
        if (!user) {
            console.log('[CHALLENGE_DEBUG] User not found');
            req.flash('error', 'User not found');
            return res.redirect('/challenges');
        }
        
        // Get the challenge IDs to reset from query or default to start-investing
        const challengeIds = req.query.challenges ? 
            req.query.challenges.split(',') : 
            ['start-investing'];
            
        console.log(`[CHALLENGE_DEBUG] Challenges to reset: ${challengeIds.join(', ')}`);
        
        // Calculate points to subtract
        let pointsToSubtract = 0;
        let completedChallenges = [...(user.completedChallenges || [])];
        
        // Log before state
        console.log(`[CHALLENGE_DEBUG] Current completed challenges: ${completedChallenges.join(', ')}`);
        console.log(`[CHALLENGE_DEBUG] Current challenge points: ${user.challengePoints || 0}`);
        
        // Process each challenge to reset
        challengeIds.forEach(id => {
            if (completedChallenges.includes(id)) {
                // Only subtract points if challenge was completed
                if (id === 'start-investing') pointsToSubtract += 2;
                else if (id === 'daily-login') pointsToSubtract += 1;
                else pointsToSubtract += 1; // Default 1 point
            }
        });
        
        // Remove the specified challenges from completedChallenges
        completedChallenges = completedChallenges.filter(id => !challengeIds.includes(id));
        
        // Update the user
        const challengePoints = Math.max(0, (user.challengePoints || 0) - pointsToSubtract);
        
        await User.findByIdAndUpdate(user._id, {
            completedChallenges,
            challengePoints
        });
        
        console.log(`[CHALLENGE_DEBUG] Reset successful - removed ${pointsToSubtract} points`);
        console.log(`[CHALLENGE_DEBUG] Challenges after reset: ${completedChallenges.join(', ')}`);
        
        req.flash('success', `Successfully reset challenges: ${challengeIds.join(', ')}`);
        return res.redirect('/challenges');
    } catch (err) {
        console.log('[CHALLENGE_DEBUG] Error resetting challenges:', err);
        req.flash('error', 'Failed to reset challenges');
        return res.redirect('/challenges');
    }
};
