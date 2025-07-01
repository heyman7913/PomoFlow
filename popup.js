// Enhanced Pomodoro Timer JavaScript with background persistence

let timer;
let isRunning = false;
let isPaused = false;
let timeLeft = 25 * 60;
let isBreakTime = false;
let currentMode = 'study';

// Custom time settings
let customStudyTime = 25;
let customShortBreakTime = 5;
let customLongBreakTime = 15;

// Website management variables
let blockedSites = [];
let allowedSites = [];
let currentTabUrl = '';
let blockingMode = 'blocklist'; // 'blocklist' or 'allowlist'

// Navigation variables
let currentPage = 0;
let currentListType = 'block';

// Load everything when popup opens
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing popup...');
    initPopup();
    getCurrentTabUrl();
    loadWebsiteLists();
    loadCustomTimes();
    setupWebsiteAccessHandlers();
    setupNavigation();
    setupListSelector();
    setupBlockingModeToggle();
    setupTimeSettings();
    restoreTimerStateFromBackground();

    // Test navigation after everything is loaded
    setTimeout(() => {
        console.log('Testing navigation setup...');
        const rightArrow = document.getElementById('rightArrow');
        if (rightArrow) {
            console.log('Right arrow found, simulating click...');
            // Test click programmatically
            rightArrow.click();
        }
    }, 2000);
});

// Get timer state from background script
function restoreTimerStateFromBackground() {
    console.log('Getting timer state from background...');

    chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
        if (response && response.success) {
            const state = response.timerState;
            console.log('Received timer state from background:', state);

            // Update local variables
            isRunning = state.isRunning;
            isPaused = state.isPaused;
            timeLeft = state.timeLeft;
            isBreakTime = state.isBreakTime;
            currentMode = state.currentMode;

            // Update display
            updateDisplay();
            updateModeButtons();
            updateStatus();
            updateTimerCircleStatus();

            // Start UI timer if background timer is running
            if (isRunning && !isPaused) {
                startUITimer();
            }
        } else {
            console.log('No timer state from background, using defaults');
            // Load from storage as fallback
            loadTimerStateFromStorage();
        }
    });
}

// Fallback: load from storage if background doesn't respond
function loadTimerStateFromStorage() {
    chrome.storage.local.get([
        'isRunning', 'isPaused', 'timeLeft', 'isBreakTime', 'currentMode'
    ], function(result) {
        isRunning = result.isRunning || false;
        isPaused = result.isPaused || false;
        timeLeft = result.timeLeft || getDefaultTimeForMode(result.currentMode || 'study');
        isBreakTime = result.isBreakTime || false;
        currentMode = result.currentMode || 'study';

        updateDisplay();
        updateModeButtons();
        updateStatus();
        updateTimerCircleStatus();
    });
}

// Start UI timer (just for display updates)
function startUITimer() {
    if (timer) clearInterval(timer);

    timer = setInterval(() => {
        // Get fresh state from background
        chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
            if (response && response.success) {
                const state = response.timerState;

                // Update local state
                isRunning = state.isRunning;
                isPaused = state.isPaused;
                timeLeft = state.timeLeft;
                isBreakTime = state.isBreakTime;
                currentMode = state.currentMode;

                // Update display
                updateDisplay();
                updateStatus();
                updateTimerCircleStatus();

                // Stop UI timer if background timer stopped
                if (!isRunning || isPaused) {
                    clearInterval(timer);
                }
            }
        });
    }, 1000);
}

// Setup navigation functionality
function setupNavigation() {
    console.log('Setting up navigation...');

    // Wait a bit to ensure DOM is fully ready
    setTimeout(() => {
        const leftArrow = document.getElementById('leftArrow');
        const rightArrow = document.getElementById('rightArrow');
        const pages = document.querySelectorAll('.page');
        const dots = document.querySelectorAll('.dot');

        console.log('Navigation setup - Found elements:', {
            leftArrow: !!leftArrow,
            rightArrow: !!rightArrow,
            pages: pages.length,
            dots: dots.length,
            currentPage: currentPage
        });

        if (leftArrow) {
            leftArrow.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Left arrow clicked, currentPage:', currentPage);
                if (currentPage > 0) {
                    navigateToPage(currentPage - 1);
                }
            });
        }

        if (rightArrow) {
            rightArrow.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Right arrow clicked, currentPage:', currentPage);
                if (currentPage < pages.length - 1) {
                    navigateToPage(currentPage + 1);
                }
            });
        }

        // Setup page indicator dots
        dots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Dot clicked:', index);
                navigateToPage(index);
            });
        });

        // Initial navigation state
        updateNavigationState();
    }, 100);
}

function navigateToPage(pageIndex) {
    console.log('Navigating to page:', pageIndex);
    const pages = document.querySelectorAll('.page');
    const dots = document.querySelectorAll('.dot');

    console.log('Navigation - Current state:', {
        requestedPage: pageIndex,
        currentPage: currentPage,
        totalPages: pages.length,
        totalDots: dots.length
    });

    if (pageIndex < 0 || pageIndex >= pages.length) {
        console.log('Invalid page index:', pageIndex, 'Valid range: 0 to', pages.length - 1);
        return;
    }

    // Update current page
    currentPage = pageIndex;
    console.log('Updated currentPage to:', currentPage);

    // Update page visibility
    pages.forEach((page, index) => {
        if (index === currentPage) {
            page.style.display = 'block';
            page.classList.add('active');
            console.log('Activated page:', index, page.id);
        } else {
            page.style.display = 'none';
            page.classList.remove('active');
            console.log('Deactivated page:', index, page.id);
        }
    });

    // Update dot indicators
    dots.forEach((dot, index) => {
        if (index === currentPage) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // Update navigation button states
    updateNavigationState();

    console.log('Navigation complete - Current page is now:', currentPage);
}

function updateNavigationState() {
    const pages = document.querySelectorAll('.page');
    const leftArrow = document.getElementById('leftArrow');
    const rightArrow = document.getElementById('rightArrow');

    console.log('Updating navigation state - currentPage:', currentPage, 'totalPages:', pages.length);

    if (leftArrow) {
        leftArrow.disabled = currentPage === 0;
        console.log('Left arrow disabled:', leftArrow.disabled);
    }

    if (rightArrow) {
        rightArrow.disabled = currentPage === pages.length - 1;
        console.log('Right arrow disabled:', rightArrow.disabled);
    }

    console.log('Navigation state updated:', {
        currentPage,
        totalPages: pages.length,
        leftDisabled: currentPage === 0,
        rightDisabled: currentPage === pages.length - 1
    });
}

// Test navigation function for debugging
function testNavigation() {
    console.log('Testing navigation manually...');
    console.log('Current page before:', currentPage);
    navigateToPage(1);
    setTimeout(() => {
        console.log('Current page after:', currentPage);
        navigateToPage(0);
    }, 1000);
}

// Setup blocking mode toggle
function setupBlockingModeToggle() {
    const blocklistModeBtn = document.getElementById('blocklistModeBtn');
    const allowlistModeBtn = document.getElementById('allowlistModeBtn');

    if (blocklistModeBtn) {
        blocklistModeBtn.addEventListener('click', () => setBlockingMode('blocklist'));
    }

    if (allowlistModeBtn) {
        allowlistModeBtn.addEventListener('click', () => setBlockingMode('allowlist'));
    }
}

function setBlockingMode(mode) {
    blockingMode = mode;

    const blocklistModeBtn = document.getElementById('blocklistModeBtn');
    const allowlistModeBtn = document.getElementById('allowlistModeBtn');
    const modeDescription = document.getElementById('modeDescription');

    if (blocklistModeBtn && allowlistModeBtn) {
        if (mode === 'blocklist') {
            blocklistModeBtn.classList.add('active');
            allowlistModeBtn.classList.remove('active');
            if (modeDescription) {
                modeDescription.textContent = 'Block only the websites in your block list';
            }
        } else {
            allowlistModeBtn.classList.add('active');
            blocklistModeBtn.classList.remove('active');
            if (modeDescription) {
                modeDescription.textContent = 'Allow only the websites in your allow list (block everything else)';
            }
        }
    }

    // Update current site status to reflect the new mode
    updateCurrentSiteStatus();

    // Save the blocking mode and update rules
    saveWebsiteLists();
}

// Setup list selector
function setupListSelector() {
    const blockListBtn = document.getElementById('blockListBtn');
    const allowListBtn = document.getElementById('allowListBtn');

    if (blockListBtn) {
        blockListBtn.addEventListener('click', () => switchListType('block'));
    }

    if (allowListBtn) {
        allowListBtn.addEventListener('click', () => switchListType('allow'));
    }
}

function switchListType(listType) {
    currentListType = listType;

    const blockListBtn = document.getElementById('blockListBtn');
    const allowListBtn = document.getElementById('allowListBtn');
    const blockListSection = document.getElementById('blockListSection');
    const allowListSection = document.getElementById('allowListSection');

    if (blockListBtn && allowListBtn) {
        if (listType === 'block') {
            blockListBtn.classList.add('active');
            allowListBtn.classList.remove('active');
        } else {
            allowListBtn.classList.add('active');
            blockListBtn.classList.remove('active');
        }
    }

    if (blockListSection && allowListSection) {
        if (listType === 'block') {
            blockListSection.classList.add('active');
            allowListSection.classList.remove('active');
        } else {
            allowListSection.classList.add('active');
            blockListSection.classList.remove('active');
        }
    }
}

function initPopup() {
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const studyModeBtn = document.getElementById('studyModeBtn');
    const shortBreakBtn = document.getElementById('shortBreakBtn');
    const longBreakBtn = document.getElementById('longBreakBtn');

    if (startPauseBtn) startPauseBtn.addEventListener('click', toggleTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);
    if (studyModeBtn) studyModeBtn.addEventListener('click', () => setMode('study'));
    if (shortBreakBtn) shortBreakBtn.addEventListener('click', () => setMode('shortBreak'));
    if (longBreakBtn) longBreakBtn.addEventListener('click', () => setMode('longBreak'));

    const addToBlockedBtn = document.getElementById('addToBlockedBtn');
    const addToAllowedBtn = document.getElementById('addToAllowedBtn');

    if (addToBlockedBtn) addToBlockedBtn.addEventListener('click', addCurrentSiteToBlocked);
    if (addToAllowedBtn) addToAllowedBtn.addEventListener('click', addCurrentSiteToAllowed);
}

// Timer functions that communicate with background
function toggleTimer() {
    if (isRunning && !isPaused) {
        pauseTimer();
    } else if (isPaused) {
        resumeTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    console.log('Starting timer...');

    chrome.runtime.sendMessage({ action: 'startTimer' }, (response) => {
        if (response && response.success) {
            isRunning = true;
            isPaused = false;
            updateStatus();
            updateTimerCircleStatus();
            startUITimer();

            // Start blocking
            chrome.runtime.sendMessage({
                action: 'startStudySession',
                blockedSites,
                allowedSites,
                isStudyActive: !isBreakTime
            });
        }
    });
}

function pauseTimer() {
    console.log('Pausing timer...');

    chrome.runtime.sendMessage({ action: 'pauseTimer' }, (response) => {
        if (response && response.success) {
            isPaused = true;
            updateStatus();
            updateTimerCircleStatus();
            clearInterval(timer);
        }
    });
}

function resumeTimer() {
    console.log('Resuming timer...');

    chrome.runtime.sendMessage({ action: 'resumeTimer' }, (response) => {
        if (response && response.success) {
            isPaused = false;
            updateStatus();
            updateTimerCircleStatus();
            startUITimer();
        }
    });
}

function resetTimer() {
    console.log('Resetting timer...');

    const newTimeLeft = getDefaultTimeForMode(currentMode);

    chrome.runtime.sendMessage({
        action: 'resetTimer',
        newTimeLeft: newTimeLeft
    }, (response) => {
        if (response && response.success) {
            isRunning = false;
            isPaused = false;
            timeLeft = newTimeLeft;
            updateDisplay();
            updateStatus();
            updateTimerCircleStatus();
            clearInterval(timer);

            // Stop blocking
            chrome.runtime.sendMessage({ action: 'stopStudySession' });
        }
    });
}

function setMode(mode) {
    console.log('Setting mode to:', mode);

    const newTimeLeft = getDefaultTimeForMode(mode);
    const newIsBreakTime = (mode === 'shortBreak' || mode === 'longBreak');

    chrome.runtime.sendMessage({
        action: 'setMode',
        mode: mode,
        timeLeft: newTimeLeft
    }, (response) => {
        if (response && response.success) {
            currentMode = mode;
            isBreakTime = newIsBreakTime;
            timeLeft = newTimeLeft;
            isRunning = false;
            isPaused = false;

            updateDisplay();
            updateModeButtons();
            updateStatus();
            updateTimerCircleStatus();
            clearInterval(timer);

            // Update blocking
            chrome.runtime.sendMessage({
                action: isBreakTime ? 'stopStudySession' : 'updateWebsiteRules',
                blockedSites,
                allowedSites,
                isStudyActive: !isBreakTime
            });
        }
    });
}

// Time settings functions
function setupTimeSettings() {
    const studyTimeInput = document.getElementById('studyTimeInput');
    const shortBreakTimeInput = document.getElementById('shortBreakTimeInput');
    const longBreakTimeInput = document.getElementById('longBreakTimeInput');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    if (studyTimeInput) {
        studyTimeInput.addEventListener('input', () => {
            customStudyTime = parseInt(studyTimeInput.value) || 25;
            saveCustomTimes();
            updateModeButtons();
            if (!isRunning && currentMode === 'study') {
                timeLeft = customStudyTime * 60;
                updateDisplay();
            }
        });
    }

    if (shortBreakTimeInput) {
        shortBreakTimeInput.addEventListener('input', () => {
            customShortBreakTime = parseInt(shortBreakTimeInput.value) || 5;
            saveCustomTimes();
            updateModeButtons();
            if (!isRunning && currentMode === 'shortBreak') {
                timeLeft = customShortBreakTime * 60;
                updateDisplay();
            }
        });
    }

    if (longBreakTimeInput) {
        longBreakTimeInput.addEventListener('input', () => {
            customLongBreakTime = parseInt(longBreakTimeInput.value) || 15;
            saveCustomTimes();
            updateModeButtons();
            if (!isRunning && currentMode === 'longBreak') {
                timeLeft = customLongBreakTime * 60;
                updateDisplay();
            }
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            saveCustomTimes();

            // Visual feedback
            const originalText = saveSettingsBtn.textContent;
            saveSettingsBtn.textContent = 'Saved!';
            saveSettingsBtn.style.background = '#4caf50';

            setTimeout(() => {
                saveSettingsBtn.textContent = originalText;
                saveSettingsBtn.style.background = '';
            }, 1500);
        });
    }
}

function loadCustomTimes() {
    chrome.storage.local.get(['customStudyTime', 'customShortBreakTime', 'customLongBreakTime'], (result) => {
        customStudyTime = result.customStudyTime || 25;
        customShortBreakTime = result.customShortBreakTime || 5;
        customLongBreakTime = result.customLongBreakTime || 15;

        // Update input fields
        const studyTimeInput = document.getElementById('studyTimeInput');
        const shortBreakTimeInput = document.getElementById('shortBreakTimeInput');
        const longBreakTimeInput = document.getElementById('longBreakTimeInput');

        if (studyTimeInput) studyTimeInput.value = customStudyTime;
        if (shortBreakTimeInput) shortBreakTimeInput.value = customShortBreakTime;
        if (longBreakTimeInput) longBreakTimeInput.value = customLongBreakTime;

        updateModeButtons();
        console.log('Loaded custom times:', { customStudyTime, customShortBreakTime, customLongBreakTime });
    });
}

function saveCustomTimes() {
    chrome.storage.local.set({
        customStudyTime: customStudyTime,
        customShortBreakTime: customShortBreakTime,
        customLongBreakTime: customLongBreakTime
    });
    console.log('Saved custom times:', { customStudyTime, customShortBreakTime, customLongBreakTime });
}

function getDefaultTimeForMode(mode) {
    switch(mode) {
        case 'study': return customStudyTime * 60;
        case 'shortBreak': return customShortBreakTime * 60;
        case 'longBreak': return customLongBreakTime * 60;
        default: return 25 * 60;
    }
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function updateStatus() {
    const startPauseBtn = document.getElementById('startPauseBtn');
    const statusText = document.getElementById('statusText');
    const modeIndicator = document.getElementById('modeIndicator');

    if (startPauseBtn) {
        if (isRunning && !isPaused) {
            startPauseBtn.textContent = 'Pause';
        } else if (isPaused) {
            startPauseBtn.textContent = 'Resume';
        } else {
            startPauseBtn.textContent = 'Start';
        }
    }

    if (statusText) {
        let status = '';
        if (isRunning && !isPaused) {
            status = isBreakTime ? 'Break Time' : 'Focus Time';
        } else if (isPaused) {
            status = 'Paused';
        } else {
            status = 'Ready to start';
        }
        statusText.textContent = status;
    }

    if (modeIndicator) {
        let modeText = '';
        switch(currentMode) {
            case 'study': modeText = 'Study Time'; break;
            case 'shortBreak': modeText = 'Short Break'; break;
            case 'longBreak': modeText = 'Long Break'; break;
        }
        modeIndicator.textContent = modeText;
    }
}

function updateTimerCircleStatus() {
    const timerCircle = document.getElementById('timerCircle');
    const statusIndicator = document.getElementById('statusIndicator');

    if (timerCircle) {
        timerCircle.className = 'timer-circle';
        if (isRunning && !isPaused) {
            timerCircle.classList.add('running');
        } else if (isPaused) {
            timerCircle.classList.add('paused');
        }
    }

    if (statusIndicator) {
        statusIndicator.className = 'status-indicator';
        if (isRunning && !isPaused) {
            statusIndicator.classList.add('running');
        } else if (isPaused) {
            statusIndicator.classList.add('paused');
        }
    }
}

function updateModeButtons() {
    const buttons = [
        { id: 'studyModeBtn', mode: 'study', time: customStudyTime },
        { id: 'shortBreakBtn', mode: 'shortBreak', time: customShortBreakTime },
        { id: 'longBreakBtn', mode: 'longBreak', time: customLongBreakTime }
    ];

    buttons.forEach(({ id, mode, time }) => {
        const btn = document.getElementById(id);
        if (btn) {
            const label = mode === 'study' ? 'Study' :
                         mode === 'shortBreak' ? 'Short Break' : 'Long Break';
            btn.textContent = `${label} (${time}min)`;

            if (mode === currentMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
}

// Website management functions (keeping existing code)
function getCurrentTabUrl() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            currentTabUrl = cleanWebsiteURL(tabs[0].url);
            updateCurrentSiteDisplay();
        }
    });
}

function loadWebsiteLists() {
    chrome.storage.local.get(['blockedSites', 'allowedSites', 'blockingMode'], (result) => {
        blockedSites = result.blockedSites || [];
        allowedSites = result.allowedSites || [];
        blockingMode = result.blockingMode || 'blocklist';

        // Update the blocking mode toggle without saving
        updateBlockingModeUI(blockingMode);

        renderWebsiteLists();
    });
}

function updateBlockingModeUI(mode) {
    const blocklistModeBtn = document.getElementById('blocklistModeBtn');
    const allowlistModeBtn = document.getElementById('allowlistModeBtn');
    const modeDescription = document.getElementById('modeDescription');

    if (blocklistModeBtn && allowlistModeBtn) {
        if (mode === 'blocklist') {
            blocklistModeBtn.classList.add('active');
            allowlistModeBtn.classList.remove('active');
            if (modeDescription) {
                modeDescription.textContent = 'Block only the websites in your block list';
            }
        } else {
            allowlistModeBtn.classList.add('active');
            blocklistModeBtn.classList.remove('active');
            if (modeDescription) {
                modeDescription.textContent = 'Allow only the websites in your allow list (block everything else)';
            }
        }
    }

    // Update current site status to reflect the mode
    updateCurrentSiteStatus();
}

function saveWebsiteLists() {
    chrome.storage.local.set({blockedSites, allowedSites, blockingMode}, () => {
        chrome.runtime.sendMessage({
            action: 'updateWebsiteRules',
            blockedSites,
            allowedSites,
            blockingMode,
            isStudyActive: isRunning && !isBreakTime
        });
    });
}

function setupWebsiteAccessHandlers() {
    const blockSiteBtn = document.getElementById('blockSiteBtn');
    const allowSiteBtn = document.getElementById('allowSiteBtn');

    if (blockSiteBtn) {
        blockSiteBtn.addEventListener('click', () => {
            const urlInput = document.getElementById('websiteUrlInput');
            if (urlInput && urlInput.value.trim()) {
                const cleanUrl = cleanWebsiteURL(urlInput.value.trim());
                addToBlockedSites(cleanUrl);
                urlInput.value = '';
            }
        });
    }

    if (allowSiteBtn) {
        allowSiteBtn.addEventListener('click', () => {
            const urlInput = document.getElementById('websiteUrlInput');
            if (urlInput && urlInput.value.trim()) {
                const cleanUrl = cleanWebsiteURL(urlInput.value.trim());
                addToAllowedSites(cleanUrl);
                urlInput.value = '';
            }
        });
    }
}

function addCurrentSiteToBlocked() {
    if (currentTabUrl && !blockedSites.includes(currentTabUrl)) {
        addToBlockedSites(currentTabUrl);
    }
}

function addCurrentSiteToAllowed() {
    if (currentTabUrl && !allowedSites.includes(currentTabUrl)) {
        addToAllowedSites(currentTabUrl);
    }
}

function addToBlockedSites(url) {
    if (url && !blockedSites.includes(url)) {
        blockedSites.push(url);
        const allowedIndex = allowedSites.indexOf(url);
        if (allowedIndex > -1) {
            allowedSites.splice(allowedIndex, 1);
        }
        saveWebsiteLists();
        renderWebsiteLists();
    }
}

function addToAllowedSites(url) {
    if (url && !allowedSites.includes(url)) {
        allowedSites.push(url);
        const blockedIndex = blockedSites.indexOf(url);
        if (blockedIndex > -1) {
            blockedSites.splice(blockedIndex, 1);
        }
        saveWebsiteLists();
        renderWebsiteLists();
    }
}

function removeFromBlockedSites(url) {
    const index = blockedSites.indexOf(url);
    if (index > -1) {
        blockedSites.splice(index, 1);
        saveWebsiteLists();
        renderWebsiteLists();
    }
}

function removeFromAllowedSites(url) {
    const index = allowedSites.indexOf(url);
    if (index > -1) {
        allowedSites.splice(index, 1);
        saveWebsiteLists();
        renderWebsiteLists();
    }
}

function renderWebsiteLists() {
    renderBlockedSites();
    renderAllowedSites();
    updateCurrentSiteStatus();
    updateEmptyStates();
}

function renderBlockedSites() {
    const container = document.getElementById('blockedSitesList');
    if (!container) return;

    container.innerHTML = '';
    blockedSites.forEach(site => {
        const siteElement = createSiteListItem(site, 'blocked');
        container.appendChild(siteElement);
    });
}

function renderAllowedSites() {
    const container = document.getElementById('allowedSitesList');
    if (!container) return;

    container.innerHTML = '';
    allowedSites.forEach(site => {
        const siteElement = createSiteListItem(site, 'allowed');
        container.appendChild(siteElement);
    });
}

function updateEmptyStates() {
    const blockEmptyState = document.getElementById('block-empty-state');
    const allowEmptyState = document.getElementById('allow-empty-state');

    if (blockEmptyState) {
        blockEmptyState.style.display = blockedSites.length === 0 ? 'block' : 'none';
    }

    if (allowEmptyState) {
        allowEmptyState.style.display = allowedSites.length === 0 ? 'block' : 'none';
    }
}

function createSiteListItem(site, type) {
    const item = document.createElement('div');
    item.className = 'website-item';

    const siteText = document.createElement('span');
    siteText.textContent = site;
    siteText.className = 'website-name';

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '<span class="minus-icon">×</span>';
    removeBtn.className = 'remove-website';
    removeBtn.onclick = () => {
        if (type === 'blocked') {
            removeFromBlockedSites(site);
        } else {
            removeFromAllowedSites(site);
        }
    };

    item.appendChild(siteText);
    item.appendChild(removeBtn);
    return item;
}

function updateCurrentSiteDisplay() {
    const currentSiteElement = document.getElementById('currentSite');
    if (currentSiteElement) {
        currentSiteElement.textContent = currentTabUrl || 'No active tab';
    }
    updateCurrentSiteStatus();
}

function updateCurrentSiteStatus() {
    const statusElement = document.getElementById('currentSiteStatus');
    const addToBlockedBtn = document.getElementById('addToBlockedBtn');
    const addToAllowedBtn = document.getElementById('addToAllowedBtn');

    if (!statusElement || !currentTabUrl) return;

    let status = '';
    let actualStatus = ''; // What will actually happen during study session

    const isInBlockList = blockedSites.includes(currentTabUrl);
    const isInAllowList = allowedSites.includes(currentTabUrl);

    if (blockingMode === 'blocklist') {
        if (isInBlockList && !isInAllowList) {
            status = '🚫 Will be blocked';
            actualStatus = 'blocked';
        } else if (isInAllowList) {
            status = '✅ Allowed (exception)';
            actualStatus = 'allowed';
        } else {
            status = '⚪ Will be allowed';
            actualStatus = 'neutral';
        }
    } else { // allowlist mode
        if (isInAllowList) {
            status = '✅ Will be allowed';
            actualStatus = 'allowed';
        } else {
            status = '🚫 Will be blocked';
            actualStatus = 'blocked';
        }
    }

    statusElement.textContent = status;
    statusElement.className = `site-status ${actualStatus}`;

    const showAddButtons = !currentTabUrl.startsWith('chrome://') &&
                          !currentTabUrl.startsWith('chrome-extension://');

    if (addToBlockedBtn) addToBlockedBtn.style.display = showAddButtons ? 'block' : 'none';
    if (addToAllowedBtn) addToAllowedBtn.style.display = showAddButtons ? 'block' : 'none';
}

function cleanWebsiteURL(url) {
    try {
        const urlObj = new URL(url);
        let hostname = urlObj.hostname;
        hostname = hostname.replace(/^www\./, '');
        return hostname.toLowerCase();
    } catch (e) {
        url = url.replace(/^https?:\/\//, '');
        url = url.replace(/^www\./, '');
        url = url.split('/')[0];
        return url.toLowerCase();
    }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'timerComplete') {
        // Refresh state from background
        restoreTimerStateFromBackground();
    }
});

console.log('Popup script loaded');