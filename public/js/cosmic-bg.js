// Script to generate background stars and falling stars for cosmic theme pages
document.addEventListener('DOMContentLoaded', function() {
    // Create background twinkling stars
    createBackgroundStars();
    
    // Create falling stars with special effects
    createFallingStars();
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
    // Track star position for card glow effect
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
            
            // Apply glow effect to card
            card.classList.add('star-passing');
            card.style.setProperty('--star-x', `${starX}%`);
            card.style.setProperty('--star-y', `${starY}%`);
            
            // Remove glow effect after a short delay
            setTimeout(() => {
                card.classList.remove('star-passing');
            }, 300);
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
