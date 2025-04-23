/**
 * Daily Rewards System
 * 
 * This script handles the daily rewards functionality on the dashboard.
 * It checks eligibility, processes claims, and updates the UI accordingly.
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
                const seconds = Math.ceil(timeToNextReward / 1000);
                cooldownMessage.innerHTML = `<i class="fas fa-hourglass-half text-warning me-2"></i> You've already claimed your reward.<br>Next reward available in <span id="cooldown-timer">${seconds}</span> second${seconds !== 1 ? 's' : ''}.`;
                
                // Update the UI
                window.timeToNextReward = timeToNextReward;
                updateCooldownTimer();
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
                rewardData = data;
                
                if (!data.success) {
                    // Handle API error
                    showError(data.message || 'Failed to check reward eligibility');
                    return;
                }
                
                // No VIP level
                if (data.vipLevel === 0) {
                    showSection(noVipStatus);
                    return;
                }
                
                // Update reward info
                vipLevelDisplay.textContent = data.vipLevel;
                rewardAmountDisplay.textContent = data.reward.toFixed(2);
                
                // Check if user can claim now
                if (data.eligible) {
                    showSection(canClaimReward);
                } else {
                    // Start countdown timer if needed
                    timeToNextReward = data.timeToNextReward;
                    updateCooldownTimer();
                    startCountdown();
                    showSection(waitingForCooldown);
                }
            })
            .catch(error => {
                console.error('[DAILY_REWARD_CLIENT] Error checking eligibility:', error);
                showError('Failed to connect to the server. Please try again later.');
            });
    }
    
    /**
     * Claim the daily reward
     */
    function claimReward() {
        console.log('[DAILY_REWARD_CLIENT] Claiming reward');
        
        // Disable the claim button
        claimButton.disabled = true;
        claimButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';
        
        // Get CSRF token - check both meta tag and input field methods
        let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        // If not found in meta tag, try to find it in a hidden input field (common Express CSRF pattern)
        if (!csrfToken) {
            csrfToken = document.querySelector('input[name="_csrf"]')?.value;
        }
        
        console.log('[DAILY_REWARD_CLIENT] CSRF Token:', csrfToken);
        
        // Create form data for the request
        const formData = new FormData();
        if (csrfToken) {
            formData.append('_csrf', csrfToken);
        }
        
        fetch('/claim-daily-reward', {
            method: 'POST',
            headers: {
                'CSRF-Token': csrfToken || ''
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('[DAILY_REWARD_CLIENT] Claim response:', data);
            
            if (!data.success) {
                // Handle failed claim
                showError(data.message || 'Failed to claim reward');
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
     * Update the cooldown timer display
     */
    function updateCooldownTimer() {
        if (window.timeToNextReward === null) return;
        
        const seconds = Math.ceil(window.timeToNextReward / 1000);
        
        // Update just the timer value without changing the whole message
        const timerElements = document.querySelectorAll('#cooldown-timer');
        timerElements.forEach(element => {
            element.textContent = seconds;
        });
        
        // Only update the full message if it doesn't contain our custom message
        if (!cooldownMessage.innerHTML.includes("You've already claimed your reward")) {
            cooldownMessage.innerHTML = `<i class="fas fa-hourglass-half text-warning me-2"></i> Next reward available in <span id="cooldown-timer">${seconds}</span> second${seconds !== 1 ? 's' : ''}.`;
        }
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
        
        // Show the requested section
        if (section) {
            section.classList.remove('d-none');
        }
    }
});

