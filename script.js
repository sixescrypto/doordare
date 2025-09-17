// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDaHwBJS6IEtdwYLtptKJPWufvxKDoh2T0",
    authDomain: "doordare-edf1b.firebaseapp.com",
    projectId: "doordare-edf1b",
    storageBucket: "doordare-edf1b.firebasestorage.app",
    messagingSenderId: "417997891539",
    appId: "1:417997891539:web:5f3977b84cbb4d3012b126"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Application State
let appState = {
    suggestedDares: [],
    activeDares: [],
    completedDares: [],
    isAdmin: false,
    nextDareId: 1,
    adminPassword: 'Team6123!', // In production, this should be handled securely
    userVotes: {}, // Track user votes: { dareId: { votes: 'up'|'down'|null, reward: 'up'|'down'|null } }
    pagination: {
        suggestedDares: { currentPage: 1, itemsPerPage: 5 },
        activeDares: { currentPage: 1, itemsPerPage: 5 },
        completedDares: { currentPage: 1, itemsPerPage: 5 }
    }
};

// DOM Elements
const elements = {
    submitDareBtn: document.getElementById('submitDareBtn'),
    adminBtn: document.getElementById('adminBtn'),
    howItWorksBtn: document.getElementById('howItWorksBtn'),
    submitModal: document.getElementById('submitModal'),
    adminModal: document.getElementById('adminModal'),
    howItWorksModal: document.getElementById('howItWorksModal'),
    closeHowItWorks: document.getElementById('closeHowItWorks'),
    dareForm: document.getElementById('dareForm'),
    adminForm: document.getElementById('adminForm'),
    suggestedDares: document.getElementById('suggestedDares'),
    activeDares: document.getElementById('activeDares'),
    completedDares: document.getElementById('completedDares'),
    adminPanel: document.getElementById('adminPanel'),
    logoutBtn: document.getElementById('logoutBtn'),
    toggleStream: document.getElementById('toggleStream'),
    toggleStreamBottom: document.getElementById('toggleStreamBottom'),
    livestreamContainer: document.getElementById('livestreamContainer'),
    openPumpfun: document.getElementById('openPumpfun'),
    openPumpfunBottom: document.getElementById('openPumpfunBottom'),
    streamPreview: document.getElementById('streamPreview'),
    livestreamFrame: document.getElementById('livestreamFrame'),
    livestreamSection: document.querySelector('.livestream-section'),
    initialControls: document.querySelector('.initial-controls')
};

// Initialize the application
async function init() {
    await loadFromFirestore();
    bindEventListeners();
    renderAllDares();
    setupRealtimeListener(); // Enable real-time updates
    
    // Automatically load livestream on page load
    setTimeout(() => {
        loadLivestream();
    }, 1000);
}

// Event Listeners
function bindEventListeners() {
    // Modal controls
    elements.submitDareBtn.addEventListener('click', () => openModal('submitModal'));
    elements.adminBtn.addEventListener('click', () => openModal('adminModal'));
    elements.howItWorksBtn.addEventListener('click', () => openModal('howItWorksModal'));
    
    // Close How It Works modal with custom button
    elements.closeHowItWorks.addEventListener('click', () => closeModal('howItWorksModal'));
    
    // Close modal functionality
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal').id);
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
    
    // Form submissions
    elements.dareForm.addEventListener('submit', handleDareSubmission);
    elements.adminForm.addEventListener('submit', handleAdminLogin);
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // Admin button delegation
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('admin-btn')) {
            handleAdminAction(e);
        }
    });
    
    // Stream controls
    elements.toggleStream.addEventListener('click', toggleLivestream);
    elements.toggleStreamBottom.addEventListener('click', toggleLivestream);
    elements.openPumpfun.addEventListener('click', openPumpfunPage);
    elements.openPumpfunBottom.addEventListener('click', openPumpfunPage);
    elements.streamPreview.addEventListener('click', loadLivestream);
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    // Reset forms
    if (modalId === 'submitModal') {
        elements.dareForm.reset();
    }
    if (modalId === 'adminModal') {
        elements.adminForm.reset();
    }
}

// Dare Submission
function handleDareSubmission(e) {
    e.preventDefault();
    
    const title = document.getElementById('dareTitle').value.trim();
    const description = document.getElementById('dareDescription').value.trim();
    const reward = parseInt(document.getElementById('initialReward').value);
    
    if (!title || !description || !reward) {
        alert('Please fill in all fields');
        return;
    }
    
    const newDare = {
        id: appState.nextDareId++,
        title,
        description,
        reward,
        votes: 0,
        rewardVotes: 0,
        status: 'suggested',
        createdAt: new Date().toISOString(),
        completedBy: null
    };
    
    appState.suggestedDares.unshift(newDare);
    resetPagination('suggestedDares'); // Reset to page 1 when new dare is added
    saveToFirestore();
    renderAllDares();
    closeModal('submitModal');
    
    showNotification('Dare submitted successfully!');
}

// Admin Functions
function handleAdminLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    
    if (password === appState.adminPassword) {
        appState.isAdmin = true;
        elements.adminPanel.classList.remove('hidden');
        closeModal('adminModal');
        renderAllDares();
        showNotification('Admin logged in successfully!');
    } else {
        alert('Incorrect password');
    }
}

function handleLogout() {
    appState.isAdmin = false;
    elements.adminPanel.classList.add('hidden');
    renderAllDares();
    showNotification('Logged out successfully!');
}

// Dare Rendering
function renderAllDares() {
    renderDareSection('suggestedDares', appState.suggestedDares, 'suggested');
    renderDareSection('activeDares', appState.activeDares, 'active');
    renderDareSection('completedDares', appState.completedDares, 'completed');
}

function renderDareSection(containerId, dares, status) {
    const container = document.getElementById(containerId);
    const paginationKey = containerId;
    const currentPage = appState.pagination[paginationKey].currentPage;
    const itemsPerPage = appState.pagination[paginationKey].itemsPerPage;
    
    if (dares.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No ${status} dares yet</h3>
                <p>${getEmptyStateMessage(status)}</p>
            </div>
        `;
        return;
    }
    
    // Sort dares by votes (descending)
    const sortedDares = [...dares].sort((a, b) => b.votes - a.votes);
    
    // Calculate pagination
    const totalPages = Math.ceil(sortedDares.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageDares = sortedDares.slice(startIndex, endIndex);
    
    // Render current page dares
    const daresHtml = currentPageDares.map((dare, index) => 
        createDareCard(dare, startIndex + index + 1, status)
    ).join('');
    
    // Generate pagination HTML
    const paginationHtml = totalPages > 1 ? createPaginationHtml(paginationKey, currentPage, totalPages) : '';
    
    container.innerHTML = daresHtml + paginationHtml;
    
    // Bind voting event listeners
    bindVotingListeners();
    bindPaginationListeners(paginationKey);
}

function createPaginationHtml(paginationKey, currentPage, totalPages) {
    if (totalPages <= 1) return '';
    
    let paginationHtml = '<div class="pagination-container"><div class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
        paginationHtml += `<button class="pagination-btn" data-section="${paginationKey}" data-page="${currentPage - 1}">‹</button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        paginationHtml += `<button class="pagination-btn ${activeClass}" data-section="${paginationKey}" data-page="${i}">${i}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        paginationHtml += `<button class="pagination-btn" data-section="${paginationKey}" data-page="${currentPage + 1}">›</button>`;
    }
    
    paginationHtml += '</div></div>';
    return paginationHtml;
}

function bindPaginationListeners(paginationKey) {
    const paginationBtns = document.querySelectorAll(`[data-section="${paginationKey}"]`);
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', handlePaginationClick);
    });
}

function handlePaginationClick(e) {
    const section = e.target.dataset.section;
    const page = parseInt(e.target.dataset.page);
    
    appState.pagination[section].currentPage = page;
    saveToFirestore();
    renderAllDares();
}

function resetPagination(section = null) {
    if (section) {
        appState.pagination[section].currentPage = 1;
    } else {
        // Reset all sections
        Object.keys(appState.pagination).forEach(key => {
            appState.pagination[key].currentPage = 1;
        });
    }
}

function createDareCard(dare, position, status) {
    const statusBadge = `<span class="status-badge status-${status}">${status.toUpperCase()}</span>`;
    
    // Get user's current votes for this dare
    const userVote = appState.userVotes[dare.id] || { votes: null, reward: null };
    
    const votingSection = status !== 'completed' ? `
        <div class="voting-section">
            <div class="vote-group dare-votes">
                <span class="vote-label">Dare Rating</span>
                <div class="vote-controls">
                    <button class="vote-btn ${userVote.votes === 'up' ? 'voted' : ''}" data-id="${dare.id}" data-type="up" data-target="votes" title="Vote up this dare">▲</button>
                    <span class="vote-count">${dare.votes}</span>
                    <button class="vote-btn ${userVote.votes === 'down' ? 'voted' : ''}" data-id="${dare.id}" data-type="down" data-target="votes" title="Vote down this dare">▼</button>
                </div>
            </div>
            <div class="vote-group reward-votes">
                <span class="vote-label">Reward Amount</span>
                <div class="vote-controls">
                    <button class="vote-btn ${userVote.reward === 'up' ? 'voted' : ''}" data-id="${dare.id}" data-type="up" data-target="reward" title="Vote to increase reward">▲</button>
                    <span class="vote-count">${dare.rewardVotes}</span>
                    <button class="vote-btn ${userVote.reward === 'down' ? 'voted' : ''}" data-id="${dare.id}" data-type="down" data-target="reward" title="Vote to decrease reward">▼</button>
                </div>
            </div>
        </div>
    ` : '';
    
    const adminActions = appState.isAdmin && status === 'suggested' ? `
        <div class="admin-actions">
            <button class="admin-btn" data-id="${dare.id}" data-action="activate">Activate</button>
            <button class="admin-btn" data-id="${dare.id}" data-action="delete">Delete</button>
        </div>
    ` : '';
    
    const completedActions = appState.isAdmin && status === 'active' ? `
        <div class="admin-actions">
            <button class="admin-btn" data-id="${dare.id}" data-action="complete">Mark Complete</button>
            <button class="admin-btn" data-id="${dare.id}" data-action="deactivate">Deactivate</button>
        </div>
    ` : '';
    
    const completedAdminActions = appState.isAdmin && status === 'completed' ? `
        <div class="admin-actions">
            <button class="admin-btn" data-id="${dare.id}" data-action="delete">Delete</button>
        </div>
    ` : '';
    
    const completedInfo = status === 'completed' && dare.completedBy ? `
        <div class="completed-info">
            <p><strong>Completed by:</strong> ${dare.completedBy}</p>
        </div>
    ` : '';
    
    return `
        <div class="dare-card" data-id="${dare.id}">
            <div class="dare-number">${position}</div>
            <div class="dare-content">
                ${statusBadge}
                <h3 class="dare-title">${dare.title}</h3>
                <p class="dare-description">${dare.description}</p>
                <div class="dare-meta">
                    <div class="reward-section">
                        <span class="reward-amount">$${dare.reward}</span>
                    </div>
                    ${votingSection}
                </div>
                ${completedInfo}
                ${adminActions}
                ${completedActions}
                ${completedAdminActions}
            </div>
        </div>
    `;
}

function getEmptyStateMessage(status) {
    switch (status) {
        case 'suggested':
            return 'Be the first to submit a dare!';
        case 'active':
            return 'No active dares at the moment. Check back soon!';
        case 'completed':
            return 'No dares have been completed yet. Be the first!';
        default:
            return '';
    }
}

// Voting System
function bindVotingListeners() {
    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', handleVoting);
    });
}

function handleVoting(e) {
    const dareId = parseInt(e.target.dataset.id);
    const voteType = e.target.dataset.type; // 'up' or 'down'
    const target = e.target.dataset.target; // 'votes' or 'reward'
    
    const dare = findDareById(dareId);
    if (!dare) return;
    
    // Get or create user vote record for this dare
    if (!appState.userVotes[dareId]) {
        appState.userVotes[dareId] = { votes: null, reward: null };
    }
    
    const userVote = appState.userVotes[dareId];
    const currentVote = userVote[target];
    
    // Calculate vote changes - each action affects by count of 1 only
    let voteChange = 0;
    let rewardChange = 0;
    
    if (target === 'votes') {
        if (currentVote === null) {
            // First vote - add 1 or subtract 1
            voteChange = voteType === 'up' ? 1 : -1;
            userVote.votes = voteType;
        } else if (currentVote !== voteType) {
            // Changing vote direction - only change by 1 in new direction
            voteChange = voteType === 'up' ? 1 : -1;
            userVote.votes = voteType;
        } else {
            // Trying to vote the same way again - remove vote
            voteChange = voteType === 'up' ? -1 : 1;
            userVote.votes = null;
        }
        
        dare.votes += voteChange;
        dare.votes = Math.max(0, dare.votes); // Prevent negative votes
        
    } else if (target === 'reward') {
        if (currentVote === null) {
            // First vote - add/subtract $5 and 1 vote count
            rewardChange = voteType === 'up' ? 5 : -5;
            voteChange = voteType === 'up' ? 1 : -1;
            userVote.reward = voteType;
        } else if (currentVote !== voteType) {
            // Changing vote direction - only change by 1 in new direction  
            rewardChange = voteType === 'up' ? 5 : -5;
            voteChange = voteType === 'up' ? 1 : -1;
            userVote.reward = voteType;
        } else {
            // Trying to vote the same way again - remove vote
            rewardChange = voteType === 'up' ? -5 : 5;
            voteChange = voteType === 'up' ? -1 : 1;
            userVote.reward = null;
        }
        
        dare.reward += rewardChange;
        dare.rewardVotes += voteChange;
        
        // Prevent reward from going below $5
        if (dare.reward < 5) {
            dare.reward = 5;
        }
    }
    
    saveToFirestore();
    renderAllDares();
}

// Admin Actions
function handleAdminAction(e) {
    const dareId = parseInt(e.target.dataset.id);
    const action = e.target.dataset.action;
    
    const dare = findDareById(dareId);
    if (!dare) return;
    
    switch (action) {
        case 'activate':
            moveDare(dareId, 'suggestedDares', 'activeDares');
            dare.status = 'active';
            resetPagination('activeDares'); // Reset target section pagination
            showNotification('Dare activated!');
            break;
            
        case 'deactivate':
            moveDare(dareId, 'activeDares', 'suggestedDares');
            dare.status = 'suggested';
            resetPagination('suggestedDares'); // Reset target section pagination
            showNotification('Dare deactivated!');
            break;
            
        case 'complete':
            const completedBy = prompt('Who completed this dare?');
            if (completedBy) {
                dare.completedBy = completedBy;
                dare.status = 'completed';
                moveDare(dareId, 'activeDares', 'completedDares');
                resetPagination('completedDares'); // Reset target section pagination
                showNotification(`Dare marked as completed by ${completedBy}!`);
            }
            break;
            
        case 'delete':
            const dareType = dare ? dare.status : 'unknown';
            const confirmMessage = dareType === 'completed' 
                ? 'Are you sure you want to delete this completed dare? This action cannot be undone.' 
                : 'Are you sure you want to delete this dare?';
            
            if (confirm(confirmMessage)) {
                deleteDare(dareId);
                showNotification('Dare deleted!');
            }
            break;
    }
    
    saveToFirestore();
    renderAllDares();
}

// Utility Functions
function findDareById(id) {
    return [...appState.suggestedDares, ...appState.activeDares, ...appState.completedDares]
        .find(dare => dare.id === id);
}

function moveDare(dareId, fromArray, toArray) {
    const fromList = appState[fromArray];
    const toList = appState[toArray];
    
    const dareIndex = fromList.findIndex(dare => dare.id === dareId);
    if (dareIndex !== -1) {
        const dare = fromList.splice(dareIndex, 1)[0];
        toList.unshift(dare);
    }
}

function deleteDare(dareId) {
    const arrays = ['suggestedDares', 'activeDares', 'completedDares'];
    
    arrays.forEach(arrayName => {
        const array = appState[arrayName];
        const index = array.findIndex(dare => dare.id === dareId);
        if (index !== -1) {
            array.splice(index, 1);
        }
    });
}

function showNotification(message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #ff0000;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: 600;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Livestream Functions
function toggleLivestream() {
    const isHidden = elements.livestreamContainer.classList.contains('hidden');
    
    if (isHidden) {
        // Show stream content
        elements.livestreamContainer.classList.remove('hidden');
        // Hide initial controls and show bottom controls
        elements.initialControls.style.display = 'none';
        showNotification('Livestream shown');
    } else {
        // Hide stream content
        elements.livestreamContainer.classList.add('hidden');
        // Show initial controls and hide bottom controls
        elements.initialControls.style.display = 'flex';
        showNotification('Livestream hidden');
    }
}

function toggleStreamVisibility() {
    const isHidden = elements.livestreamContainer.classList.contains('hidden');
    
    if (isHidden) {
        elements.livestreamContainer.classList.remove('hidden');
        elements.toggleStreamBtn.textContent = 'Hide Stream';
        showNotification('Livestream shown');
    } else {
        elements.livestreamContainer.classList.add('hidden');
        elements.toggleStreamBtn.textContent = 'Show Stream';
        showNotification('Livestream hidden');
    }
}

function loadLivestream() {
    const livestreamApiUrl = 'https://livestream-api.pump.fun/livestream?mintId=V5cCiSixPLAiEDX2zZquT5VuLm4prr5t35PWmjNpump';
    
    // Update stream status to show loading
    const statusElement = document.querySelector('.stream-status span:last-child');
    if (statusElement) {
        statusElement.textContent = 'LOADING';
    }
    
    console.log('🔄 Auto-loading livestream data from API:', livestreamApiUrl);
    
    // Instead of iframe, fetch the API data directly
    fetchLivestreamData(livestreamApiUrl);
}

function fetchLivestreamData(apiUrl) {
    // Try to fetch the livestream API data
    fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json, text/html, */*',
            'User-Agent': 'Mozilla/5.0 (compatible; DoOrDare/1.0)'
        },
        mode: 'cors'
    })
    .then(response => {
        console.log('API Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        console.log('Content type:', contentType);
        
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            return response.text();
        }
    })
    .then(data => {
        console.log('API Response data:', data);
        handleLivestreamData(data);
    })
    .catch(error => {
        console.log('Direct API fetch failed:', error);
        // Try with CORS proxy
        tryWithProxy(apiUrl);
    });
}

function tryWithProxy(apiUrl) {
    console.log('Trying with CORS proxy...');
    
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
    
    fetch(proxyUrl)
        .then(response => response.json())
        .then(data => {
            console.log('Proxy response:', data);
            
            if (data.contents) {
                try {
                    // Try to parse as JSON first
                    const jsonData = JSON.parse(data.contents);
                    handleLivestreamData(jsonData);
                } catch {
                    // If not JSON, treat as text/HTML
                    handleLivestreamData(data.contents);
                }
            } else {
                throw new Error('No data from proxy');
            }
        })
        .catch(error => {
            console.log('Proxy fetch failed:', error);
            // Create a mock livestream interface
            createMockLivestream();
        });
}

function handleLivestreamData(data) {
    console.log('Processing livestream data:', typeof data, data);
    
    if (typeof data === 'object' && data !== null) {
        // JSON response
        createLivestreamInterface(data);
    } else if (typeof data === 'string') {
        // Check if it contains video stream URLs
        if (data.includes('.m3u8') || data.includes('.mp4') || data.includes('rtmp://') || data.includes('wss://')) {
            extractAndDisplayStream(data);
        } else if (data.includes('<html') || data.includes('<!DOCTYPE')) {
            // HTML response - try to extract useful info
            parseHtmlForStreamData(data);
        } else {
            // Raw data - show it for debugging
            showRawApiData(data);
        }
    } else {
        createMockLivestream();
    }
}

function createLivestreamInterface(apiData) {
    console.log('Creating simplified livestream interface with data:', apiData);
    
    const isLive = apiData.isLive;
    const participants = apiData.numParticipants || 0;
    const thumbnail = apiData.thumbnail;
    
    const interfaceHtml = `
        <div style="width: 100%; height: 100%; background: #000; color: white; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center;">
            <div style="position: relative; width: 100%; height: 100%; max-width: 100%; max-height: 100%;">
                <!-- Stream Thumbnail/Preview -->
                ${thumbnail ? `
                    <img src="${thumbnail}" style="width: 100%; height: 100%; object-fit: cover;" alt="Live Stream">
                ` : `
                    <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); display: flex; align-items: center; justify-content: center;">
                        <div style="text-align: center;">
                            <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.7;">📹</div>
                            <h3 style="color: #ccc; margin: 0;">Stream Preview</h3>
                        </div>
                    </div>
                `}
                
                <!-- Live Status Overlay -->
                <div style="position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.8); padding: 8px 15px; border-radius: 20px; backdrop-filter: blur(10px);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 8px; height: 8px; background: ${isLive ? '#ff0000' : '#666'}; border-radius: 50%; ${isLive ? 'animation: pulse 2s infinite;' : ''}"></div>
                        <span style="color: white; font-weight: 600; font-size: 0.9rem;">${isLive ? 'LIVE' : 'OFFLINE'}</span>
                    </div>
                </div>
                
                <!-- Viewer Count -->
                ${isLive ? `
                    <div style="position: absolute; bottom: 15px; right: 15px; background: rgba(255,0,0,0.9); padding: 8px 15px; border-radius: 15px;">
                        <span style="color: white; font-weight: 600; font-size: 0.9rem;">${participants} watching</span>
                    </div>
                ` : ''}
                
                <!-- Click to Open Overlay -->
                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease;" onclick="window.parent.openPumpfunPage()" onmouseover="this.style.background='rgba(0,0,0,0.4)'" onmouseout="this.style.background='rgba(0,0,0,0.2)'">
                    <div style="background: rgba(255,0,0,0.9); padding: 15px 30px; border-radius: 25px; backdrop-filter: blur(10px); transition: all 0.3s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <span style="color: white; font-weight: 700; font-size: 1.1rem;">WATCH LIVE</span>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
        </style>
    `;
    
    displayCustomContent(interfaceHtml);
}

function extractAndDisplayStream(data) {
    console.log('Extracting stream URLs from data');
    
    // Extract potential stream URLs
    const streamRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+\.(?:m3u8|mp4|webm|flv))/gi;
    const rtmpRegex = /(rtmp:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    const wsRegex = /(wss?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
    
    const streamUrls = [
        ...(data.match(streamRegex) || []),
        ...(data.match(rtmpRegex) || []),
        ...(data.match(wsRegex) || [])
    ];
    
    if (streamUrls.length > 0) {
        const playerHtml = `
            <div style="width: 100%; height: 100%; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
                <h2 style="color: #ff0000; margin-bottom: 20px;">🔴 LIVE STREAM</h2>
                ${streamUrls.map((url, index) => `
                    <video controls autoplay muted style="width: 90%; max-height: 300px; margin: 10px; border-radius: 10px;">
                        <source src="${url}" type="application/x-mpegURL">
                        <source src="${url}" type="video/mp4">
                        Stream ${index + 1}: ${url}
                    </video>
                `).join('')}
                <div style="margin-top: 20px;">
                    <button onclick="window.parent.openPumpfunPage()" style="background: #ff0000; color: white; border: none; padding: 10px 20px; border-radius: 20px;">
                        Open Full Site
                    </button>
                </div>
            </div>
        `;
        
        displayCustomContent(playerHtml);
        showNotification(`Found ${streamUrls.length} stream URL(s)!`);
    } else {
        showRawApiData(data);
    }
}

function parseHtmlForStreamData(html) {
    console.log('Parsing HTML for stream data');
    
    // Look for common stream-related elements
    const videoRegex = /<video[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const iframeRegex = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
    
    const videoSources = [];
    const iframeSources = [];
    
    let match;
    while ((match = videoRegex.exec(html)) !== null) {
        videoSources.push(match[1]);
    }
    
    while ((match = iframeRegex.exec(html)) !== null) {
        iframeSources.push(match[1]);
    }
    
    if (videoSources.length > 0 || iframeSources.length > 0) {
        const streamHtml = `
            <div style="width: 100%; height: 100%; background: #1a1a1a; color: white; padding: 20px; overflow: auto;">
                <h2 style="color: #ff0000; text-align: center; margin-bottom: 20px;">🔴 EXTRACTED STREAM DATA</h2>
                
                ${videoSources.length > 0 ? `
                    <h3>Video Sources Found:</h3>
                    ${videoSources.map(src => `
                        <video controls style="width: 100%; margin: 10px 0; border-radius: 10px;">
                            <source src="${src}">
                        </video>
                    `).join('')}
                ` : ''}
                
                ${iframeSources.length > 0 ? `
                    <h3>Iframe Sources Found:</h3>
                    ${iframeSources.map(src => `
                        <p style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 5px; word-break: break-all;">
                            ${src}
                        </p>
                    `).join('')}
                ` : ''}
                
                <button onclick="window.parent.openPumpfunPage()" style="background: #ff0000; color: white; border: none; padding: 15px 30px; border-radius: 25px; margin-top: 20px;">
                    Open Full Site
                </button>
            </div>
        `;
        
        displayCustomContent(streamHtml);
        showNotification('Stream elements extracted from HTML!');
    } else {
        showRawApiData(html.substring(0, 2000) + '...');
    }
}

function showRawApiData(data) {
    const debugHtml = `
        <div style="width: 100%; height: 100%; background: #0a0a0a; color: #00ff00; font-family: monospace; padding: 20px; overflow: auto;">
            <h2 style="color: #ff0000; text-align: center; margin-bottom: 20px;">📡 API RESPONSE DEBUG</h2>
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; border-left: 4px solid #ff0000;">
                <h3 style="color: #ff0000; margin-bottom: 10px;">Raw API Data:</h3>
                <pre style="white-space: pre-wrap; font-size: 12px; line-height: 1.4; max-height: 400px; overflow: auto;">${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.parent.openPumpfunPage()" style="background: #ff0000; color: white; border: none; padding: 15px 30px; border-radius: 25px; margin: 10px;">
                    Open Full Site
                </button>
                <button onclick="window.parent.loadLivestream()" style="background: transparent; color: #ff0000; border: 2px solid #ff0000; padding: 15px 30px; border-radius: 25px; margin: 10px;">
                    Try Again
                </button>
            </div>
        </div>
    `;
    
    displayCustomContent(debugHtml);
    showNotification('Showing raw API response for debugging');
}

function createMockLivestream() {
    const mockHtml = `
        <div style="width: 100%; height: 100%; background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Inter', sans-serif;">
            <div style="text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 20px; animation: pulse 2s infinite;">📡</div>
                <h2 style="color: #ff0000; margin-bottom: 15px;">LIVESTREAM UNAVAILABLE</h2>
                <p style="color: #888; margin-bottom: 30px; max-width: 400px; line-height: 1.6;">
                    The livestream API is currently not accessible. This could be due to CORS restrictions or temporary server issues.
                </p>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
                    <button onclick="window.parent.openPumpfunPage()" style="background: #ff0000; color: white; border: none; padding: 15px 30px; border-radius: 25px; font-weight: 600; cursor: pointer;">
                        Open Live Site
                    </button>
                    <button onclick="window.parent.loadLivestream()" style="background: transparent; color: #ff0000; border: 2px solid #ff0000; padding: 15px 30px; border-radius: 25px; font-weight: 600; cursor: pointer;">
                        Retry Connection
                    </button>
                </div>
            </div>
        </div>
        <style>
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
        </style>
    `;
    
    displayCustomContent(mockHtml);
    showNotification('Livestream unavailable - API blocked');
}

function displayCustomContent(html) {
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    elements.livestreamFrame.src = blobUrl;
    elements.streamPreview.classList.add('hidden');
    
    // Update stream status to show live
    const statusElement = document.querySelector('.stream-status span:last-child');
    if (statusElement) {
        statusElement.textContent = 'LIVE';
    }
}

function handleStreamLoadError() {
    elements.livestreamFrame.src = 'about:blank';
    elements.streamPreview.classList.remove('hidden');
    
    // Update stream status to show error
    const statusElement = document.querySelector('.stream-status span:last-child');
    if (statusElement) {
        statusElement.textContent = 'OFFLINE';
    }
    
    showNotification('Livestream API unavailable. Click to open full site.');
}

function openPumpfunPage() {
    const pumpfunUrl = 'https://pump.fun/coin/V5cCiSixPLAiEDX2zZquT5VuLm4prr5t35PWmjNpump';
    const livestreamUrl = 'https://livestream-api.pump.fun/livestream?mintId=V5cCiSixPLAiEDX2zZquT5VuLm4prr5t35PWmjNpump';
    
    // Open both the main coin page and livestream API in separate tabs
    window.open(pumpfunUrl, '_blank');
    setTimeout(() => {
        window.open(livestreamUrl, '_blank');
    }, 500);
    
    showNotification('Opening Pump.fun and livestream API in new tabs...');
}

// Firebase Storage Functions
async function saveToFirestore() {
    try {
        // Save all dares to a single document
        await db.collection('appData').doc('dares').set({
            suggestedDares: appState.suggestedDares,
            activeDares: appState.activeDares,
            completedDares: appState.completedDares,
            nextDareId: appState.nextDareId,
            userVotes: appState.userVotes,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Data saved to Firebase successfully');
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        // Fallback to localStorage if Firebase fails
        localStorage.setItem('doOrDareApp', JSON.stringify({
            suggestedDares: appState.suggestedDares,
            activeDares: appState.activeDares,
            completedDares: appState.completedDares,
            nextDareId: appState.nextDareId,
            userVotes: appState.userVotes
        }));
    }
}

async function loadFromFirestore() {
    try {
        const doc = await db.collection('appData').doc('dares').get();
        if (doc.exists) {
            const data = doc.data();
            appState.suggestedDares = data.suggestedDares || [];
            appState.activeDares = data.activeDares || [];
            appState.completedDares = data.completedDares || [];
            appState.nextDareId = data.nextDareId || 1;
            appState.userVotes = data.userVotes || {};
            console.log('Data loaded from Firebase successfully');
        } else {
            console.log('No data found in Firebase, starting fresh');
        }
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        // Fallback to localStorage if Firebase fails
        const stored = localStorage.getItem('doOrDareApp');
        if (stored) {
            const data = JSON.parse(stored);
            appState.suggestedDares = data.suggestedDares || [];
            appState.activeDares = data.activeDares || [];
            appState.completedDares = data.completedDares || [];
            appState.nextDareId = data.nextDareId || 1;
            appState.userVotes = data.userVotes || {};
        }
    }
}

// Set up real-time listener for live updates
function setupRealtimeListener() {
    db.collection('appData').doc('dares').onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            appState.suggestedDares = data.suggestedDares || [];
            appState.activeDares = data.activeDares || [];
            appState.completedDares = data.completedDares || [];
            appState.nextDareId = data.nextDareId || 1;
            appState.userVotes = data.userVotes || {};
            renderAllDares();
            console.log('Real-time update received from Firebase');
        }
    }, (error) => {
        console.error('Error in real-time listener:', error);
    });
}

// Legacy localStorage functions (keeping as fallback)
function saveToStorage() {
    localStorage.setItem('doOrDareApp', JSON.stringify({
        suggestedDares: appState.suggestedDares,
        activeDares: appState.activeDares,
        completedDares: appState.completedDares,
        nextDareId: appState.nextDareId,
        userVotes: appState.userVotes
    }));
}

function loadFromStorage() {
    const stored = localStorage.getItem('doOrDareApp');
    if (stored) {
        const data = JSON.parse(stored);
        appState.suggestedDares = data.suggestedDares || [];
        appState.activeDares = data.activeDares || [];
        appState.completedDares = data.completedDares || [];
        appState.nextDareId = data.nextDareId || 1;
        appState.userVotes = data.userVotes || {};
    }
}

// Sample Data
function addSampleData() {
    const sampleDares = [
        {
            id: appState.nextDareId++,
            title: "Stream for 24 hours straight",
            description: "Complete a full 24-hour gaming stream without breaks longer than 15 minutes.",
            reward: 500,
            votes: 15,
            rewardVotes: 8,
            status: 'suggested',
            createdAt: new Date().toISOString(),
            completedBy: null
        },
        {
            id: appState.nextDareId++,
            title: "Eat only pizza for a week",
            description: "Survive an entire week eating nothing but pizza. Document your journey!",
            reward: 250,
            votes: 12,
            rewardVotes: 3,
            status: 'suggested',
            createdAt: new Date().toISOString(),
            completedBy: null
        },
        {
            id: appState.nextDareId++,
            title: "Learn a new language in 30 days",
            description: "Become conversational in a new language within 30 days. Prove it with a 10-minute conversation video.",
            reward: 750,
            votes: 22,
            rewardVotes: 12,
            status: 'suggested',
            createdAt: new Date().toISOString(),
            completedBy: null
        },
        {
            id: appState.nextDareId++,
            title: "Do 1000 push-ups in one day",
            description: "Complete 1000 push-ups within a 24-hour period. Can be broken into sets throughout the day.",
            reward: 300,
            votes: 8,
            rewardVotes: -2,
            status: 'active',
            createdAt: new Date().toISOString(),
            completedBy: null
        }
    ];
    
    sampleDares.forEach(dare => {
        if (dare.status === 'suggested') {
            appState.suggestedDares.push(dare);
        } else if (dare.status === 'active') {
            appState.activeDares.push(dare);
        }
    });
    
    saveToFirestore();
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);