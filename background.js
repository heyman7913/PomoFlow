let isStudySessionActive = false;
let blockedSites = [];
let allowedSites = [];

// Timer state variables
let timerState = {
    isRunning: false,
    isPaused: false,
    timeLeft: 25 * 60,
    isBreakTime: false,
    currentMode: 'study',
    startTime: null,
    originalDuration: 25 * 60
};

let persistentTimer = null;

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Background script starting up...');
    loadSettings();
    startPersistentTimer();
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated...');
    loadSettings();
    startPersistentTimer();
});

// Load settings and timer state from storage
function loadSettings() {
    chrome.storage.local.get([
        'blockedSites', 'allowedSites', 'isRunning', 'isPaused', 'timeLeft',
        'isBreakTime', 'currentMode', 'timerStartTime', 'originalDuration',
        'customStudyTime', 'customShortBreakTime', 'customLongBreakTime'
    ], (result) => {
        console.log('Loading settings from storage:', result);

        blockedSites = result.blockedSites || [];
        allowedSites = result.allowedSites || [];

        // Restore timer state
        timerState = {
            isRunning: result.isRunning || false,
            isPaused: result.isPaused || false,
            timeLeft: result.timeLeft || getDefaultTimeForMode(result.currentMode || 'study'),
            isBreakTime: result.isBreakTime || false,
            currentMode: result.currentMode || 'study',
            startTime: result.timerStartTime || null,
            originalDuration: result.originalDuration || getDefaultTimeForMode(result.currentMode || 'study')
        };

        // If timer was running, calculate actual time left
        if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
            const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
            timerState.timeLeft = Math.max(0, timerState.originalDuration - elapsed);

            console.log('Timer was running, calculated time left:', timerState.timeLeft);

            // If time expired while extension was closed
            if (timerState.timeLeft <= 0) {
                handleTimerComplete();
                return;
            }
        }

        isStudySessionActive = timerState.isRunning && !timerState.isBreakTime;

        console.log('Restored timer state:', timerState);

        // Save the corrected state
        saveTimerState();
        updateBlockingRules();
    });

    function getDefaultTimeForMode(mode) {
        // Get custom times or use defaults
        chrome.storage.local.get(['customStudyTime', 'customShortBreakTime', 'customLongBreakTime'], (customTimes) => {
            switch(mode) {
                case 'study': return (customTimes.customStudyTime || 25) * 60;
                case 'shortBreak': return (customTimes.customShortBreakTime || 5) * 60;
                case 'longBreak': return (customTimes.customLongBreakTime || 15) * 60;
                default: return 25 * 60;
            }
        });

        // Fallback for synchronous calls
        switch(mode) {
            case 'study': return 25 * 60;
            case 'shortBreak': return 5 * 60;
            case 'longBreak': return 15 * 60;
            default: return 25 * 60;
        }
    }
}

// Start persistent timer that runs in background
function startPersistentTimer() {
    if (persistentTimer) clearInterval(persistentTimer);

    persistentTimer = setInterval(() => {
        if (timerState.isRunning && !timerState.isPaused) {
            // Calculate actual time left based on start time
            if (timerState.startTime) {
                const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
                timerState.timeLeft = Math.max(0, timerState.originalDuration - elapsed);

                // Check if timer completed
                if (timerState.timeLeft <= 0) {
                    handleTimerComplete();
                    return;
                }

                // Save state every 10 seconds
                if (elapsed % 10 === 0) {
                    saveTimerState();
                }
            }
        }
    }, 1000);

    console.log('Started persistent timer');
}

// Handle timer completion in background
function handleTimerComplete() {
    console.log('Timer completed in background');

    // Show notification
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Pomodoro Timer',
        message: timerState.isBreakTime ? 'Break time is over!' : 'Study session complete!'
    });

    // Auto-switch modes
    const newMode = timerState.isBreakTime ? 'study' : 'shortBreak';
    const newIsBreakTime = newMode !== 'study';

    // Reset timer state
    timerState = {
        isRunning: false,
        isPaused: false,
        timeLeft: getDefaultTimeForMode(newMode),
        isBreakTime: newIsBreakTime,
        currentMode: newMode,
        startTime: null,
        originalDuration: getDefaultTimeForMode(newMode)
    };

    isStudySessionActive = false;

    // Save new state
    saveTimerState();
    updateBlockingRules();

    // Notify popup if it's open
    notifyPopup('timerComplete');
}

// Save timer state to storage
function saveTimerState() {
    const stateToSave = {
        isRunning: timerState.isRunning,
        isPaused: timerState.isPaused,
        timeLeft: timerState.timeLeft,
        isBreakTime: timerState.isBreakTime,
        currentMode: timerState.currentMode,
        timerStartTime: timerState.startTime,
        originalDuration: timerState.originalDuration,
        lastSaveTime: Date.now()
    };

    chrome.storage.local.set(stateToSave);
    console.log('Saved timer state:', stateToSave);
}

// Get default time for mode (synchronous version)
function getDefaultTimeForMode(mode) {
    switch(mode) {
        case 'study': return 25 * 60;
        case 'shortBreak': return 5 * 60;
        case 'longBreak': return 15 * 60;
        default: return 25 * 60;
    }
}

// Notify popup of events
function notifyPopup(action, data = {}) {
    chrome.runtime.sendMessage({
        action: action,
        ...data
    }).catch(() => {
        // Popup not open, ignore error
        console.log('Popup not open, cannot send message:', action);
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    switch (request.action) {
        case 'getTimerState':
            // Send current timer state to popup
            sendResponse({
                success: true,
                timerState: timerState
            });
            break;

        case 'startTimer':
            console.log('Starting timer from popup');
            timerState.isRunning = true;
            timerState.isPaused = false;
            timerState.startTime = Date.now();
            timerState.originalDuration = timerState.timeLeft;

            isStudySessionActive = !timerState.isBreakTime;

            saveTimerState();
            updateBlockingRules();

            sendResponse({ success: true });
            break;

        case 'pauseTimer':
            console.log('Pausing timer from popup');
            timerState.isPaused = true;
            // Don't change startTime - we'll calculate elapsed time differently

            saveTimerState();

            sendResponse({ success: true });
            break;

        case 'resumeTimer':
            console.log('Resuming timer from popup');
            timerState.isPaused = false;
            // Recalculate start time based on remaining time
            timerState.startTime = Date.now() - (timerState.originalDuration - timerState.timeLeft) * 1000;

            saveTimerState();

            sendResponse({ success: true });
            break;

        case 'resetTimer':
            console.log('Resetting timer from popup');
            timerState.isRunning = false;
            timerState.isPaused = false;
            timerState.timeLeft = request.newTimeLeft || getDefaultTimeForMode(timerState.currentMode);
            timerState.startTime = null;
            timerState.originalDuration = timerState.timeLeft;

            isStudySessionActive = false;

            saveTimerState();
            updateBlockingRules();

            sendResponse({ success: true });
            break;

        case 'setMode':
            console.log('Setting mode from popup:', request.mode);
            timerState.currentMode = request.mode;
            timerState.isBreakTime = request.mode !== 'study';
            timerState.timeLeft = request.timeLeft || getDefaultTimeForMode(request.mode);
            timerState.originalDuration = timerState.timeLeft;
            timerState.isRunning = false;
            timerState.isPaused = false;
            timerState.startTime = null;

            isStudySessionActive = false;

            saveTimerState();
            updateBlockingRules();

            sendResponse({ success: true });
            break;

        case 'updateWebsiteRules':
            blockedSites = request.blockedSites || [];
            allowedSites = request.allowedSites || [];
            isStudySessionActive = request.isStudyActive;
            updateBlockingRules();

            sendResponse({ success: true });
            break;

        case 'startStudySession':
            isStudySessionActive = true;
            blockedSites = request.blockedSites || [];
            allowedSites = request.allowedSites || [];
            updateBlockingRules();

            sendResponse({ success: true });
            break;

        case 'stopStudySession':
            isStudySessionActive = false;
            updateBlockingRules();

            sendResponse({ success: true });
            break;
    }
});

// Update declarativeNetRequest rules
async function updateBlockingRules() {
    try {
        console.log('Updating blocking rules...', {
            isStudySessionActive,
            blockedSites: blockedSites.length,
            allowedSites: allowedSites.length
        });

        // Clear existing rules first
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const ruleIdsToRemove = existingRules.map(rule => rule.id);

        if (ruleIdsToRemove.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIdsToRemove
            });
            console.log('Removed existing rules:', ruleIdsToRemove);
        }

        // Only block sites during active study sessions
        if (!isStudySessionActive) {
            console.log('Study session not active, no blocking rules added');
            return;
        }

        if (blockedSites.length === 0) {
            console.log('No sites to block');
            return;
        }

        // Create blocking rules - filter out allowed sites
        const sitesToBlock = blockedSites.filter(site => !allowedSites.includes(site));

        if (sitesToBlock.length === 0) {
            console.log('All blocked sites are in allow list');
            return;
        }

        const rules = [];

        sitesToBlock.forEach((site, index) => {
            // Rule for main domain
            rules.push({
                id: (index * 2) + 1,
                priority: 1,
                action: {
                    type: 'redirect',
                    redirect: {
                        url: chrome.runtime.getURL('blocked.html')
                    }
                },
                condition: {
                    urlFilter: `*://${site}/*`,
                    resourceTypes: ['main_frame']
                }
            });

            // Rule for subdomains
            rules.push({
                id: (index * 2) + 2,
                priority: 1,
                action: {
                    type: 'redirect',
                    redirect: {
                        url: chrome.runtime.getURL('blocked.html')
                    }
                },
                condition: {
                    urlFilter: `*://*.${site}/*`,
                    resourceTypes: ['main_frame']
                }
            });
        });

        // Add the rules
        if (rules.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: rules
            });
            console.log(`Added ${rules.length} blocking rules for sites:`, sitesToBlock);
        }

    } catch (error) {
        console.error('Error updating blocking rules:', error);
    }
}

// Alternative blocking method using tabs API
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && isStudySessionActive) {
        const hostname = cleanWebsiteURL(tab.url);

        console.log('Tab updated:', hostname, 'Study active:', isStudySessionActive);

        // Check if site should be blocked
        if (blockedSites.includes(hostname) && !allowedSites.includes(hostname)) {
            console.log('Blocking site:', hostname);
            chrome.tabs.update(tabId, {
                url: chrome.runtime.getURL('blocked.html')
            });
        }
    }
});

function cleanWebsiteURL(url) {
    try {
        const urlObj = new URL(url);
        let hostname = urlObj.hostname;
        hostname = hostname.replace(/^www\./, '');
        return hostname.toLowerCase();
    } catch (e) {
        // Fallback for invalid URLs
        let cleanUrl = url.replace(/^https?:\/\//, '');
        cleanUrl = cleanUrl.replace(/^www\./, '');
        cleanUrl = cleanUrl.split('/')[0];
        return cleanUrl.toLowerCase();
    }
}

// Start everything
console.log('Background script loaded');
startPersistentTimer();