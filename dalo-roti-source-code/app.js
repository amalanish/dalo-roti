// ==========================================================================
// Dalo Roti - Frontend SPA Controller & API client
// Recreates the exact screen flow: Login -> Signup -> Home -> Donate -> Pickups
// ==========================================================================

const API_BASE = ''; // Backend server endpoints

// Application State
let appState = {
    currentUser: null,
    pickupPeriod: 'AM',
    foodItemCount: 2
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Render Lucide icons
    lucide.createIcons();
    
    // Fetch and populate NGOs list dynamically
    await fetchNgos();
    
    // Check for existing login session
    const storedUser = localStorage.getItem('daloRotiUser');
    if (storedUser) {
        appState.currentUser = JSON.parse(storedUser);
        document.getElementById('home-user-name').textContent = `Hi ${appState.currentUser.name}`;
        updateHeaderProfileUI();
        navigateToScreen('home');
    } else {
        navigateToScreen('login');
    }
}

// SPA Screen Navigation Router
function navigateToScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show targeted screen
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Show/Hide bottom navbar
    const navBar = document.getElementById('app-nav-bar');
    const authScreens = ['login', 'signup'];
    if (authScreens.includes(screenId)) {
        navBar.style.display = 'none';
    } else {
        navBar.style.display = 'flex';
        updateNavbarActiveState(screenId);
    }
    
    // Scroll to top
    if (targetScreen) {
        targetScreen.scrollTop = 0;
    }
}

// Update active state in bottom navbar
function updateNavbarActiveState(screenId) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        
        // Match navigation item to screen
        const clickAttr = item.getAttribute('onclick');
        if (clickAttr && clickAttr.includes(screenId)) {
            item.classList.add('active');
        }
    });
    
    lucide.createIcons();
}

// Authentication Logic
function handleLoginSubmit(event) {
    if (event) event.preventDefault();
    const mobile = document.getElementById('login-mobile').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!mobile || !password) return;
    
    // Validate credentials: ID: 9820098200, Password: password321
    if (mobile === '9820098200' && password === 'password321') {
        appState.currentUser = {
            name: 'Amal',
            mobile: mobile
        };
        localStorage.setItem('daloRotiUser', JSON.stringify(appState.currentUser));
        document.getElementById('home-user-name').textContent = `Hi ${appState.currentUser.name}`;
        updateHeaderProfileUI();
        
        showToast("Logged in successfully as Amal!");
        navigateToScreen('home');
    } else {
        // Fallback for custom entries / warning
        showToast("Invalid credentials. Try: 9820098200 / password321", "error");
    }
}

function handleSignupSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const mobile = document.getElementById('signup-mobile').value.trim();
    const address = document.getElementById('signup-address').value.trim();
    
    appState.currentUser = {
        name: name,
        mobile: mobile,
        address: address
    };
    
    localStorage.setItem('daloRotiUser', JSON.stringify(appState.currentUser));
    document.getElementById('home-user-name').textContent = `Hi ${appState.currentUser.name}`;
    updateHeaderProfileUI();
    
    showToast("Account created successfully!");
    navigateToScreen('home');
}

function logout() {
    appState.currentUser = null;
    localStorage.removeItem('daloRotiUser');
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();
    showToast("Logged out.");
    navigateToScreen('login');
}

// Form Field Helpers
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i data-lucide="eye"></i>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<i data-lucide="eye-off"></i>';
    }
    lucide.createIcons();
}

function setAmPm(period) {
    appState.pickupPeriod = period;
    
    // Reset classes
    document.getElementById('ampm-am').classList.remove('active');
    document.getElementById('ampm-pm').classList.remove('active');
    
    // Set active
    if (period === 'AM') {
        document.getElementById('ampm-am').classList.add('active');
    } else {
        document.getElementById('ampm-pm').classList.add('active');
    }
}

// Dynamic Food Item list
function addFoodItemRow() {
    appState.foodItemCount++;
    const container = document.getElementById('food-items-container');
    
    const row = document.createElement('div');
    row.className = 'food-item-row';
    row.id = `food-row-${appState.foodItemCount}`;
    row.innerHTML = `
        <div class="input-group flex-grow">
            <label>Food Item</label>
            <input type="text" class="food-item-name" placeholder="e.g., Bread, Fruits">
        </div>
        <div class="input-group width-120">
            <label>Quantity</label>
            <input type="text" class="food-item-qty" placeholder="e.g., 3 kg">
        </div>
    `;
    container.appendChild(row);
}

// Handle Food Donation Form submit
async function handleFoodDonation(event) {
    event.preventDefault();
    
    const name = document.getElementById('donor-full-name').value.trim();
    const address = document.getElementById('donor-full-address').value.trim();
    const phone = document.getElementById('donor-phone-num').value.trim();
    
    const pickupDate = document.getElementById('pickup-date').value;
    const pickupTime = document.getElementById('pickup-time').value;
    
    // Gather all food item rows
    const itemNames = Array.from(document.querySelectorAll('.food-item-name')).map(input => input.value.trim()).filter(val => val !== '');
    const itemQties = Array.from(document.querySelectorAll('.food-item-qty')).map(input => input.value.trim()).filter(val => val !== '');
    
    const ngoSelect = document.getElementById('ngo-select-list').value;
    
    if (itemNames.length === 0 || !ngoSelect) {
        showToast("Please enter at least one food item and select an NGO.", "error");
        return;
    }
    
    // Compile single fields for the Python database
    const foodItemsCombined = itemNames.join(', ');
    const quantitiesCombined = itemQties.join(', ');
    
    const payload = {
        donorName: name,
        donorPhone: phone,
        foodItem: `${foodItemsCombined} (Scheduled: ${pickupDate} @ ${pickupTime} ${appState.pickupPeriod})`,
        quantity: quantitiesCombined,
        expiryHours: 8.0,
        address: address,
        claimedBy: ngoSelect,
        foodType: 'veg', // default
        category: 'cooked'
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/donations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast("Donation scheduled successfully!");
            document.getElementById('food-donation-form').reset();
            
            // Redirect to pickups overview screen
            navigateToScreen('pickups');
        } else {
            showToast("Failed to schedule donation on server.", "error");
        }
    } catch (err) {
        console.error("Donation submit error:", err);
        // Fallback: local success simulation
        showToast("Local Mock: Donation scheduled successfully!");
        navigateToScreen('pickups');
    }
}

// Global Notification Toast
function showToast(message, type = "success") {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    if (!toast || !toastMsg) return;
    
    toastMsg.textContent = message;
    toast.className = ""; // reset
    
    if (type === "error") {
        toast.classList.add('toast-error');
    }
    
    // Trigger animation
    toast.classList.remove('toast-hidden');
    
    setTimeout(() => {
        toast.classList.add('toast-hidden');
    }, 3000);
}

// Fetch and populate NGOs list
async function fetchNgos() {
    try {
        const response = await fetch(`${API_BASE}/api/ngos`);
        if (response.ok) {
            const ngos = await response.json();
            const selectList = document.getElementById('ngo-select-list');
            if (selectList) {
                // Clear existing options except placeholder
                selectList.innerHTML = '<option value="" disabled selected>Select an NGO...</option>';
                
                // Add option for each NGO
                ngos.forEach(ngo => {
                    const option = document.createElement('option');
                    option.value = ngo.name;
                    option.textContent = `${ngo.name} (${ngo.town})`;
                    selectList.appendChild(option);
                });
            }
            
            // Populate the Partner NGOs Screen list with location symbol
            const partnerContainer = document.getElementById('ngo-partner-list-container');
            if (partnerContainer) {
                partnerContainer.innerHTML = '';
                
                ngos.forEach(ngo => {
                    const card = document.createElement('div');
                    card.className = 'ngo-list-card';
                    card.innerHTML = `
                        <strong><i data-lucide="map-pin" class="ngo-loc-icon"></i> ${ngo.name}</strong>
                        <p>${ngo.address || (ngo.town + ', Mumbai')}</p>
                    `;
                    partnerContainer.appendChild(card);
                });
                
                // Refresh Lucide icons inside the newly generated list
                lucide.createIcons();
            }
        }
    } catch (err) {
        console.error("Error fetching NGOs:", err);
    }
}

// Handle NGO Registration
async function handleNgoRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('reg-ngo-name').value.trim();
    const phone = document.getElementById('reg-ngo-phone').value.trim();
    const address = document.getElementById('reg-ngo-address').value.trim();
    const town = document.getElementById('reg-ngo-town').value.trim();
    const details = document.getElementById('reg-ngo-details').value.trim();
    
    const payload = {
        name,
        phone,
        address,
        town,
        details
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/ngos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast("NGO successfully registered and listed!");
            document.getElementById('ngo-register-form').reset();
            
            // Refresh NGO select dropdown list
            await fetchNgos();
            
            // Redirect to Donate screen to see it
            navigateToScreen('donate');
        } else {
            showToast("Failed to register NGO.", "error");
        }
    } catch (err) {
        console.error("NGO registration error:", err);
        showToast("Error connecting to server.", "error");
    }
}

// Auto-fill demo login helper for Amal profile
function fillDemoLogin(mobile, password) {
    const mobInput = document.getElementById('login-mobile');
    const pwdInput = document.getElementById('login-password');
    if (mobInput && pwdInput) {
        mobInput.value = mobile;
        pwdInput.value = password;
        
        // Wait a small moment to let user see inputs filling, then submit
        setTimeout(() => {
            handleLoginSubmit();
        }, 200);
    }
}

// Update avatar and dropdown content elements dynamically
function updateHeaderProfileUI() {
    const user = appState.currentUser;
    if (!user) return;
    const initial = user.name.charAt(0).toUpperCase();
    
    document.querySelectorAll('.header-avatar-initial').forEach(el => {
        el.textContent = initial;
    });
    document.querySelectorAll('.dropdown-user-name').forEach(el => {
        el.textContent = user.name;
    });
    document.querySelectorAll('.dropdown-user-phone').forEach(el => {
        el.textContent = user.mobile;
    });
}

// Profile dropdown controllers
function toggleProfileDropdown(event) {
    event.stopPropagation();
    const currentWrapper = event.currentTarget.closest('.profile-dropdown-wrapper');
    const currentContent = currentWrapper.querySelector('.profile-dropdown-content');
    
    // Toggle active state of the current menu
    const isActive = currentContent.classList.contains('active');
    closeAllDropdowns();
    
    if (!isActive) {
        currentContent.classList.add('active');
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.profile-dropdown-content').forEach(content => {
        content.classList.remove('active');
    });
}

// Dynamic profile modal controllers
function showProfileDetails(event) {
    if (event) event.preventDefault();
    closeAllDropdowns();
    
    const user = appState.currentUser || { name: 'Amal', mobile: '9820098200' };
    const firstChar = user.name.charAt(0).toUpperCase();
    
    // Update initials in avatar elements
    document.querySelectorAll('.header-avatar-initial').forEach(el => {
        el.textContent = firstChar;
    });
    
    // Update dropdown content name/phone fields dynamically
    document.querySelectorAll('.dropdown-user-name').forEach(el => {
        el.textContent = user.name;
    });
    document.querySelectorAll('.dropdown-user-phone').forEach(el => {
        el.textContent = user.mobile;
    });
    
    // Update profile modal content fields dynamically
    const nameEl = document.querySelector('.profile-detail-name');
    const phoneEl = document.querySelector('.profile-detail-phone');
    const addrEl = document.querySelector('.profile-detail-address');
    const avatarEl = document.querySelector('.profile-page-avatar');
    
    if (nameEl) nameEl.textContent = user.name;
    if (phoneEl) phoneEl.textContent = user.mobile;
    if (avatarEl) avatarEl.textContent = firstChar;
    if (addrEl) {
        addrEl.textContent = user.address || '13 line, kurlacomplex, bandra east, mumbai, maharastra';
    }
    
    // Show Modal card
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.classList.add('active');
        // Render new icons inside modal (like close cross icon)
        lucide.createIcons();
    }
}

function closeProfileModal(event) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close dropdowns on clicking anywhere outside
window.addEventListener('click', function(e) {
    if (!e.target.closest('.profile-dropdown-wrapper')) {
        closeAllDropdowns();
    }
});
