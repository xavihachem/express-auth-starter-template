/**
 * Daily Rewards System
 * 
 * This script handles the daily rewards functionality on the dashboard.
 * It checks eligibility, processes claims, and updates the UI accordingly.
 * It now also checks if required daily challenges have been completed.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if the daily rewards card is present on the page
    const rewardCard = document.getElementById('daily-reward-card');
    if (!rewardCard) return;

    console.log('[DAILY_REWARD_CLIENT] Initializing daily rewards system');
    
    // Cache DOM elements
    const statusLoading = document.getElementById('reward-status-loading');
    const noVipStatus = document.getElementById('no-vip-status');
    const waitingForCooldown = document.getElementById('waiting-for-cooldown');
    const canClaimReward = document.getElementById('can-claim-reward');
    const claimSuccess = document.getElementById('claim-success');
    const rewardError = document.getElementById('reward-error');
    const errorMessage = document.getElementById('error-message');
    const cooldownTimer = document.getElementById('cooldown-timer');
    const cooldownMessage = document.getElementById('cooldown-message');
    const vipLevelDisplay = document.getElementById('vip-level-display');
    const rewardAmountDisplay = document.getElementById('reward-amount-display');
    const claimButton = document.getElementById('claim-reward-btn');
    const claimedAmount = document.getElementById('claimed-amount');
    const newBalance = document.getElementById('new-balance');
    const successMessage = document.getElementById('success-message');
    
    // Create a new section for incomplete challenges
    const challengesSection = document.createElement('div');
    challengesSection.id = 'incomplete-challenges';
    challengesSection.classList.add('text-center', 'd-none');
    challengesSection.innerHTML = `
        <div class="rounded-circle bg-info bg-opacity-10 p-3 mx-auto mb-3" style="width: fit-content;">
            <i class="fas fa-tasks fa-2x text-info"></i>
        </div>
        <h4>Complete Daily Challenges First</h4>
        <p id="challenges-message">You need to complete the required daily challenges before claiming your reward.</p>
        <div class="mt-3">
            <div class="d-flex justify-content-center align-items-center mb-2">
                <div id="challenge-daily-login" class="challenge-status me-2">
                    <i class="fas fa-circle text-danger"></i>
                </div>
                <span>Daily Login Challenge</span>
            </div>
            <div class="d-flex justify-content-center align-items-center mb-2">
                <div id="challenge-start-investing" class="challenge-status me-2">
                    <i class="fas fa-circle text-danger"></i>
                </div>
                <span>Start Investing Challenge</span>
            </div>
        </div>
        <a href="/challenges" class="btn btn-primary mt-2">
            <i class="fas fa-trophy me-2"></i>Go to Challenges
        </a>
    `;
    
    // Add the new section to the card body
    const cardBody = document.querySelector('#daily-reward-card .card-body');
    cardBody.appendChild(challengesSection);
    
    // State variables
    let countdownInterval = null;
    let timeToNextReward = null;
    let rewardData = null;
    
    // Check local storage for recent claims before checking eligibility
    checkLocalStorageForClaims();
    
    /**
     * Check localStorage for recent claims to prevent refresh exploits
     */
    function checkLocalStorageForClaims() {
        console.log('[DAILY_REWARD_CLIENT] Checking localStorage for recent claims');
        
        // Hide the loading state and show a better initial state if we've recently claimed
        const lastClaimTime = localStorage.getItem('lastDailyRewardClaim');
        if (lastClaimTime) {
            const now = Date.now();
            const timeSinceClaim = now - parseInt(lastClaimTime);
            const cooldownPeriod = 1 * 60 * 1000; // 1 minute in milliseconds (matches server)
            
            console.log(`[DAILY_REWARD_CLIENT] Last claim from localStorage: ${new Date(parseInt(lastClaimTime)).toISOString()}`);
            console.log(`[DAILY_REWARD_CLIENT] Time since last claim: ${timeSinceClaim / 1000} seconds`);
            
            if (timeSinceClaim < cooldownPeriod) {
                // If local cooldown is active, show cooldown UI immediately for a better user experience
                const timeToNextReward = cooldownPeriod - timeSinceClaim;
                console.log(`[DAILY_REWARD_CLIENT] Local cooldown active, ${timeToNextReward / 1000} seconds remaining`);
                
                // Hide the loading spinner and show cooldown info right away
                statusLoading.classList.add('d-none');
                
                // Update the cooldown timer with a nicer message
                const formattedTime = formatMilliseconds(timeToNextReward);
                cooldownMessage.innerHTML = `<i class="fas fa-hourglass-half text-warning me-2"></i> You've already claimed your reward.<br>Next reward available in ${formattedTime}.`;
                
                // Update the UI
                window.timeToNextReward = timeToNextReward;
                startCountdown();
                showSection(waitingForCooldown);
                
                // Still check with the server in the background for accuracy
                setTimeout(checkRewardEligibility, 500);
                return;
            } else {
                // If local cooldown has expired, clear it and check eligibility
                console.log('[DAILY_REWARD_CLIENT] Local cooldown expired, checking with server');
                localStorage.removeItem('lastDailyRewardClaim');
            }
        }
        
        // Show loading state while we check with the server
        showSection(statusLoading);
        
        // No recent claims in localStorage, proceed with server check
        checkRewardEligibility();
    }
    
    // Add event listener to claim button
    if (claimButton) {
        claimButton.addEventListener('click', claimReward);
    }
    
    /**
     * Check if user is eligible for daily reward
     */
    function checkRewardEligibility() {
        console.log('[DAILY_REWARD_CLIENT] Checking reward eligibility');
        
        // Show loading state
        showSection(statusLoading);
        
        fetch('/check-daily-reward')
            .then(response => response.json())
            .then(data => {
                console.log('[DAILY_REWARD_CLIENT] Eligibility response:', data);
                
                if (!data.success) {
                    console.log('[DAILY_REWARD_CLIENT] Error checking eligibility:', data.message);
                    showError(data.message || 'Failed to check reward eligibility');
                    return;
                }
                
                // Store reward data for later use
                rewardData = data;
                
                // Check if daily challenges have been completed
                if (data.hasOwnProperty('challengesCompleted') && !data.challengesCompleted) {
                    console.log('[DAILY_REWARD_CLIENT] Daily challenges not completed');
                    
                    // Update challenge indicators
                    updateChallengeStatus('daily-login', data.dailyLoginCompleted);
                    updateChallengeStatus('start-investing', data.startInvestingCompleted);
                    
                    // Show incomplete challenges section
                    showSection(document.getElementById('incomplete-challenges'));
                    return;
                }
                
                // If user is eligible for a reward
                if (data.eligible) {
                    console.log('[DAILY_REWARD_CLIENT] User eligible for reward');
                    
                    // Update reward display
                    vipLevelDisplay.textContent = data.vipLevel;
                    rewardAmountDisplay.textContent = data.reward.toFixed(2);
                    
                    // Show the claim section
                    showSection(canClaimReward);
                } 
                // If user doesn't have VIP status yet
                else if (data.vipLevel === 0) {
                    console.log('[DAILY_REWARD_CLIENT] User does not have VIP status');
                    showSection(noVipStatus);
                }
                // If user needs to wait for cooldown
                else if (data.timeToNextReward) {
                    console.log('[DAILY_REWARD_CLIENT] Cooldown active, time remaining:', data.timeToNextReward);
                    
                    // Set time to next reward and start countdown
                    window.timeToNextReward = data.timeToNextReward;
                    const formattedTime = formatMilliseconds(data.timeToNextReward);
                    cooldownMessage.innerHTML = `<i class="fas fa-hourglass-half text-warning me-2"></i> Next reward available in ${formattedTime}.`;
                    
                    // Update the UI
                    startCountdown();
                    
                    // Show cooldown section
                    showSection(waitingForCooldown);
                }
            })
            .catch(error => {
                console.error('[DAILY_REWARD_CLIENT] Error fetching reward eligibility:', error);
                showError('Failed to connect to the server. Please try again later.');
            });
    }
    
    /**
     * Update the challenge status indicators
     */
    function updateChallengeStatus(challengeId, completed) {
        const indicator = document.getElementById(`challenge-${challengeId}`);
        if (indicator) {
            const icon = indicator.querySelector('i');
            if (completed) {
                icon.className = 'fas fa-check-circle text-success';
            } else {
                icon.className = 'fas fa-times-circle text-danger';
            }
        }
    }
    
    /**
     * Claim the daily reward
     */
    function claimReward() {
        console.log('[DAILY_REWARD_CLIENT] Attempting to claim reward');
        
        // Disable the button to prevent double claims
        claimButton.disabled = true;
        claimButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing';
        
        // Find CSRF token - first try meta tag
        let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        // If not in meta tag, try hidden input field (common in Express apps)
        if (!csrfToken) {
            const csrfInput = document.querySelector('input[name="_csrf"]');
            if (csrfInput) csrfToken = csrfInput.value;
        }
        
        console.log('[DAILY_REWARD_CLIENT] Found CSRF token:', csrfToken ? 'Yes' : 'No');
        
        // Create FormData for the request
        const formData = new FormData();
        if (csrfToken) {
            formData.append('_csrf', csrfToken);
        }
        
        // Make API request to claim the reward
        fetch('/claim-daily-reward', {
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken || ''
            },
            body: formData
        })
        .then(response => {
            // Check for HTML response (which might indicate an error or CSRF issue)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                console.error('[DAILY_REWARD_CLIENT] Received HTML response instead of JSON');
                throw new Error('CSRF token issue or server error. Please refresh the page and try again.');
            }
            return response.json();
        })
        .then(data => {
            console.log('[DAILY_REWARD_CLIENT] Claim response:', data);
            
            // Reset the button state
            claimButton.disabled = false;
            claimButton.innerHTML = '<i class="fas fa-gift me-2"></i>Claim Reward';
            
            if (!data.success) {
                console.log('[DAILY_REWARD_CLIENT] Error claiming reward:', data.message);
                
                // If challenges are not completed, show challenge message
                if (data.hasOwnProperty('challengesCompleted') && !data.challengesCompleted) {
                    console.log('[DAILY_REWARD_CLIENT] Daily challenges not completed');
                    
                    // Update challenge indicators
                    updateChallengeStatus('daily-login', data.dailyLoginCompleted);
                    updateChallengeStatus('start-investing', data.startInvestingCompleted);
                    
                    // Show incomplete challenges section
                    showSection(document.getElementById('incomplete-challenges'));
                    return;
                }
                
                // If cooldown is active, show cooldown message
                if (data.cooldownActive && data.timeToNextReward) {
                    console.log('[DAILY_REWARD_CLIENT] Cooldown active after claim attempt:', data.timeToNextReward);
                    
                    // Update the cooldown timer
                    window.timeToNextReward = data.timeToNextReward;
                    const formattedTime = formatMilliseconds(data.timeToNextReward);
                    cooldownMessage.innerHTML = `<i class="fas fa-hourglass-half text-warning me-2"></i> Next reward available in ${formattedTime}.`;
                    
                    // Show the cooldown section
                    showSection(waitingForCooldown);
                } else {
                    // Show generic error message
                    showError(data.message || 'Failed to claim reward. Please try again later.');
                }
                
                // Re-check eligibility after a failed claim
                setTimeout(checkRewardEligibility, 1000);
                return;
            }
            
            // Update success message
            claimedAmount.textContent = data.reward.toFixed(2);
            newBalance.textContent = data.newBalance.toFixed(2);
            
            // Update balance display in stats area if it exists
            // Find all stat counters first
            const statCounters = document.querySelectorAll('.stat-counter');
            
            // Loop through them to find the one that displays balance
            for (const counter of statCounters) {
                if (counter.nextElementSibling && counter.nextElementSibling.textContent.includes('Balance')) {
                    console.log('[DAILY_REWARD_CLIENT] Found balance display, updating to: $' + data.newBalance.toFixed(2));
                    counter.innerText = '$' + data.newBalance.toFixed(2);
                    break;
                }
            }
            
            // Show success message
            showSection(claimSuccess);
            
            // Store the claim time in localStorage to prevent refresh exploits
            localStorage.setItem('lastDailyRewardClaim', Date.now());
            
            // Don't automatically re-check - let the user see the success message
            // When they click the button again or refresh, the server-side check will enforce the cooldown
        })
        .catch(error => {
            console.error('[DAILY_REWARD_CLIENT] Error claiming reward:', error);
            showError('Failed to connect to the server. Please try again later.');
            // Re-enable the claim button
            claimButton.disabled = false;
            claimButton.innerHTML = '<i class="fas fa-gift me-2"></i>Claim Reward';
        });
    }
    
    /**
     * Format milliseconds into a human-readable string (Hours and Minutes)
     * @param {number} ms - Milliseconds to format
     * @returns {string} Formatted time string
     */
    function formatMilliseconds(ms) {
        if (ms <= 0) {
            return "less than a minute";
        }
        const totalSeconds = Math.ceil(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        let parts = [];
        if (hours > 0) {
            parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
        }
        if (minutes > 0) {
            parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
        }

        // Handle case where only seconds remain (less than a minute)
        if (parts.length === 0 && totalSeconds > 0) {
            return "less than a minute";
        } else if (parts.length === 0) {
            // Should not happen if ms > 0, but safeguard
            return "soon"; 
        }
        
        return parts.join(' and ');
    }
    
    /**
     * Update the cooldown timer display
     */
    function updateCooldownTimer() {
        if (window.timeToNextReward === null) return;
        
        const formattedTime = formatMilliseconds(window.timeToNextReward);
        cooldownMessage.innerHTML = `<i class="fas fa-hourglass-half text-warning me-2"></i> Next reward available in ${formattedTime}.`;
    }
    
    /**
     * Start the countdown timer
     */
    function startCountdown() {
        // Clear any existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // Start a new interval
        countdownInterval = setInterval(() => {
            if (window.timeToNextReward <= 0) {
                clearInterval(countdownInterval);
                checkRewardEligibility();
                return;
            }
            
            window.timeToNextReward -= 1000;
            updateCooldownTimer();
        }, 1000);
    }
    
    /**
     * Show error message
     */
    function showError(message) {
        errorMessage.textContent = message;
        showSection(rewardError);
    }
    
    /**
     * Show a specific section and hide others
     */
    function showSection(section) {
        // Hide all sections
        statusLoading.classList.add('d-none');
        noVipStatus.classList.add('d-none');
        waitingForCooldown.classList.add('d-none');
        canClaimReward.classList.add('d-none');
        claimSuccess.classList.add('d-none');
        rewardError.classList.add('d-none');
        document.getElementById('incomplete-challenges').classList.add('d-none');
        
        // Show the requested section
        if (section) {
            section.classList.remove('d-none');
        }
    }
});
