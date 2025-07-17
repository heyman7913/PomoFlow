let isStudySessionActive = false;
let blockedSites = [];
let allowedSites = [];
let blockingMode = 'blocklist'; // 'blocklist' or 'allowlist'

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

async function ensureOffscreen() {
  const exists = await chrome.offscreen.hasDocument();
  console.log("[background] hasDocument:", exists);

  if (!exists) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Minimal JS load test'
    });
    console.log("[background] offscreen.html created");
  }
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated...');
    loadSettings();
    startPersistentTimer();
    console.log("[background] onInstalled triggered");
    ensureOffscreen();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Background script starting up...');
    loadSettings();
    startPersistentTimer();
    console.log("[background] onStartup triggered");
    ensureOffscreen();
});

// Load settings and timer state from storage
function loadSettings() {
    chrome.storage.local.get([
        'blockedSites', 'allowedSites', 'blockingMode', 'isRunning', 'isPaused', 'timeLeft',
        'isBreakTime', 'currentMode', 'timerStartTime', 'originalDuration',
        'customStudyTime', 'customShortBreakTime', 'customLongBreakTime'
    ], (result) => {
        console.log('Loading settings from storage:', result);

        blockedSites = result.blockedSites || [];
        allowedSites = result.allowedSites || [];
        blockingMode = result.blockingMode || 'blocklist';

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

    updateStudySessionStatus();

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

            updateStudySessionStatus();

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

            updateStudySessionStatus();

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

            updateStudySessionStatus();

            saveTimerState();
            updateBlockingRules();

            sendResponse({ success: true });
            break;

        case 'updateWebsiteRules':
            blockedSites = request.blockedSites || [];
            allowedSites = request.allowedSites || [];
            blockingMode = request.blockingMode || blockingMode;

            // Save website lists and blocking mode to storage
            chrome.storage.local.set({
                blockedSites: blockedSites,
                allowedSites: allowedSites,
                blockingMode: blockingMode
            });

            // Don't override isStudySessionActive - it should be based on timer state
            // isStudySessionActive is controlled by timer state: timerState.isRunning && !timerState.isBreakTime
            updateBlockingRules();

            sendResponse({ success: true });
            break;

        case 'startStudySession':
            // Update website rules but don't force isStudySessionActive
            // Let it be controlled by timer state
            blockedSites = request.blockedSites || [];
            allowedSites = request.allowedSites || [];
            blockingMode = request.blockingMode || blockingMode;
            updateBlockingRules();

            sendResponse({ success: true });
            break;

        case 'stopStudySession':
            // Update website rules but don't force isStudySessionActive
            // Let it be controlled by timer state
            updateBlockingRules();

            sendResponse({ success: true });
            break;
    }
});

// Helper function to calculate if study session is active
function updateStudySessionStatus() {
    const newStatus = timerState.isRunning && !timerState.isBreakTime;
    if (isStudySessionActive !== newStatus) {
        console.log('Study session status changed:', isStudySessionActive, '->', newStatus);
        isStudySessionActive = newStatus;
    }
}

// Update declarativeNetRequest rules
async function updateBlockingRules() {
    try {
        console.log('Updating blocking rules...', {
            isStudySessionActive,
            blockingMode,
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

        // Only block sites during active study sessions, not during break time
        if (!isStudySessionActive || timerState.isBreakTime) {
            console.log('Study session not active or in break time, no blocking rules added', {
                isStudySessionActive,
                isBreakTime: timerState.isBreakTime
            });
            return;
        }

        const rules = [];
        let sitesToProcess = [];

        if (blockingMode === 'blocklist') {
            // Blocklist mode: Block only sites in blockedSites that are not in allowedSites
            sitesToProcess = blockedSites.filter(site => !allowedSites.includes(site));

            if (sitesToProcess.length === 0) {
                console.log('No sites to block in blocklist mode');
                return;
            }

            console.log('Blocklist mode: blocking sites:', sitesToProcess);
        } else if (blockingMode === 'allowlist') {
            // Allowlist mode: Block everything except sites in allowedSites
            console.log('Allowlist mode: allowing only sites:', allowedSites);

            // For allowlist mode, we'll rely primarily on the tabs API
            // because declarativeNetRequest doesn't have a good way to exclude specific domains
            // from a wildcard pattern. We'll create a broad blocking rule but the tabs API
            // will handle the fine-grained logic.

            if (allowedSites.length === 0) {
                // Block everything if no sites are allowed
                rules.push({
                    id: 1,
                    priority: 1,
                    action: {
                        type: 'redirect',
                        redirect: {
                            url: chrome.runtime.getURL('blocked.html')
                        }
                    },
                    condition: {
                        urlFilter: '*://*/*',
                        resourceTypes: ['main_frame']
                    }
                });
            }
            // Note: For allowlist with specific allowed sites, we rely on the tabs API
            // because declarativeNetRequest's excludedRequestDomains doesn't work as expected
        }

        // For blocklist mode, create individual blocking rules
        if (blockingMode === 'blocklist' && sitesToProcess.length > 0) {
            sitesToProcess.forEach((site, index) => {
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
        }

        // Add the rules
        if (rules.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: rules
            });
            console.log(`Added ${rules.length} blocking rules in ${blockingMode} mode`);
        }

    } catch (error) {
        console.error('Error updating blocking rules:', error);
    }
}

// Alternative blocking method using tabs API
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Skip chrome:// and extension URLs
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            return;
        }

        // Don't block anything during break time, regardless of study session status
        if (timerState.isBreakTime) {
            console.log('Break time active, allowing all sites');
            return;
        }

        // Only block during active study sessions
        if (!isStudySessionActive) {
            return;
        }

        const hostname = cleanWebsiteURL(tab.url);
        console.log('Tab updated:', hostname, 'Study active:', isStudySessionActive, 'Break time:', timerState.isBreakTime, 'Mode:', blockingMode);

        let shouldBlock = false;

        if (blockingMode === 'blocklist') {
            // Block if site is in blockedSites and not in allowedSites
            shouldBlock = blockedSites.includes(hostname) && !allowedSites.includes(hostname);
        } else if (blockingMode === 'allowlist') {
            // Block if site is NOT in allowedSites
            shouldBlock = !allowedSites.includes(hostname);
        }

        if (shouldBlock) {
            console.log('Blocking site:', hostname, 'in', blockingMode, 'mode');
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