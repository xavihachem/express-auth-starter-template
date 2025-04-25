// Script to generate background stars and falling stars for cosmic theme pages
document.addEventListener('DOMContentLoaded', function() {
    // Create background twinkling stars
    createBackgroundStars();
    
    // Create falling stars with special effects (for auth pages)
    if (document.body.classList.contains('auth')) {
        createFallingStars();
    }
});

// Function to create background twinkling stars
function createBackgroundStars() {
    const starsContainer = document.getElementById('stars-bg');
    if (!starsContainer) return;
    
    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star-bg');
        
        // Random position
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        
        // Random size
        const size = Math.random() * 2 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // Random twinkle animation
        star.style.setProperty('--twinkle-duration', `${Math.random() * 3 + 2}s`);
        star.style.setProperty('--twinkle-delay', `${Math.random() * 5}s`);
        
        starsContainer.appendChild(star);
    }
}

// Function to create falling stars with special effects
function createFallingStars() {
    // Create container for falling stars if it doesn't exist
    let nightContainer = document.querySelector('.night-auth');
    if (!nightContainer) {
        const authSection = document.querySelector('.auth-section');
        if (!authSection) return;
        
        nightContainer = document.createElement('div');
        nightContainer.classList.add('night-auth');
        authSection.appendChild(nightContainer);
    }
    
    // Get the card element for special effects
    const card = document.querySelector('.cosmic-card');
    if (!card) return;
    
    // Create falling stars - reduced count
    const starCount = 3; // Much fewer stars
    
    // Function to create a single star
    function createStar() {
        // Create star element
        const star = document.createElement('div');
        star.classList.add('falling-star');
        
        // Position stars in the top left corner
        star.style.left = `${Math.random() * 15}%`; // Random position in top left area
        star.style.top = `${Math.random() * 15}%`; // Random position in top left area
        
        // No need to add trail elements - they're now handled with CSS ::before
        
        // Add star to container
        nightContainer.appendChild(star);
        
        // Add intersection observer to detect when star passes through card
        createStarIntersectionObserver(star, card);
        
        // Remove star after animation completes and create a new one
        star.addEventListener('animationend', function(e) {
            if (e.animationName === 'falling') {
                star.remove();
                setTimeout(createStar, Math.random() * 5000 + 3000); // 3-8 second delay between stars
            }
        });
    }
    
    // Create initial stars with significant staggered timing
    for (let i = 0; i < starCount; i++) {
        setTimeout(() => createStar(), i * 4000); // 4 seconds between each initial star
    }
}

// Function to create intersection observer for star and card
function createStarIntersectionObserver(star, card) {
    // Track star position for glow effect
    let isIntersecting = false;
    let trailElement = null;
    
    const animationHandler = () => {
        const starRect = star.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        
        // Check if star is intersecting with card
        if (starRect.right >= cardRect.left && 
            starRect.left <= cardRect.right && 
            starRect.bottom >= cardRect.top && 
            starRect.top <= cardRect.bottom) {
            
            // Calculate star position relative to card
            const starX = ((starRect.left + starRect.width/2) - cardRect.left) / cardRect.width * 100;
            const starY = ((starRect.top + starRect.height/2) - cardRect.top) / cardRect.height * 100;
            
            // First time entering the card
            if (!isIntersecting) {
                isIntersecting = true;
                
                // Add highlight class
                card.classList.add('cosmic-highlight');
                
                // Create trail effect
                if (!trailElement) {
                    trailElement = document.createElement('div');
                    trailElement.classList.add('cosmic-trail');
                    card.appendChild(trailElement);
                }
                
                // Set initial position
                updateTrailPosition(trailElement, starX, starY);
            } else {
                // Update trail position as star moves
                if (trailElement) {
                    updateTrailPosition(trailElement, starX, starY);
                }
            }
        } else if (isIntersecting) {
            // Star has left the card
            isIntersecting = false;
            
            // Fade out effects
            setTimeout(() => {
                // Remove highlight with a smooth transition
                card.classList.remove('cosmic-highlight');
                
                // Remove trail effect
                if (trailElement) {
                    trailElement.classList.add('fade-out');
                    setTimeout(() => {
                        if (trailElement && trailElement.parentNode) {
                            trailElement.remove();
                        }
                        trailElement = null;
                    }, 500);
                }
            }, 100);
        }
    };
    
    // Use requestAnimationFrame for smooth tracking
    function trackStar() {
        animationHandler();
        requestAnimationFrame(trackStar);
    }
    
    // Start tracking
    trackStar();
}

// Function to update the cosmic trail position
function updateTrailPosition(trailElement, x, y) {
    // Position the trail element
    trailElement.style.left = `${x}%`;
    trailElement.style.top = `${y}%`;
}

// Function to create shooting stars for platform pages
function createPlatformShootingStars() {
    // Create container for falling stars if it doesn't exist
    let nightContainer = document.querySelector('.night-platform');
    if (!nightContainer) return;
    
    // Get all platform cards for special effects
    const cards = document.querySelectorAll('.dashboard-main-card');
    if (cards.length === 0) return;
    
    // Create falling stars - moderate count
    const starCount = 5; // Moderate star count for platform
    
    // Function to create a single star
    function createStar() {
        // Create star element
        const star = document.createElement('div');
        star.classList.add('falling-star');
        
        // Random position across the top of the screen
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 20}%`;
        
        // Add star to container
        nightContainer.appendChild(star);
        
        // Add intersection observer to detect when star passes through cards
        cards.forEach(card => {
            createStarIntersectionObserver(star, card);
        });
        
        // Remove star after animation completes and create a new one
        star.addEventListener('animationend', function(e) {
            if (e.animationName === 'falling') {
                star.remove();
                setTimeout(createStar, Math.random() * 6000 + 4000); // 4-10 second delay between stars
            }
        });
    }
    
    // Create initial stars with staggered timing
    for (let i = 0; i < starCount; i++) {
        setTimeout(() => createStar(), i * 2000); // 2 seconds between each initial star
    }
}
