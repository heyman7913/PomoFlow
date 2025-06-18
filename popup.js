// Enhanced Pomodoro Timer JavaScript

let timer;
let isRunning = false;
let isPaused = false;
let timeLeft = 25 * 60; // Default 25 minutes in seconds
let isBreakTime = false;
let currentMode = 'study';
let mediaStream = null; // Store the screen sharing stream

// Website management variables
let blockedSites = [];
let allowedSites = [];
let currentTabUrl = '';

// Load website lists when popup opens
document.addEventListener('DOMContentLoaded', function() {
    initPopup();
    getCurrentTabUrl();
    loadWebsiteLists();
    setupWebsiteAccessHandlers();
});

function initPopup() {
    const studyTab = document.getElementById('tab-study');
    if (studyTab) {
        studyTab.classList.add('active');
    }
    getCurrentStudyTime(function(studyTime) {
        document.getElementById('study-time').textContent = studyTime;
        updateDisplay();
    });
}

// Navigation Logic for Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', handleTabClick);
});

function handleTabClick(event) {
    const currentTab = document.querySelector('.tab-btn.active');
    const targetTab = event.currentTarget;
    if (currentTab === targetTab) return;

    if (currentTab) {
        currentTab.classList.remove('active');
        const currentTabId = 'tab-' + currentTab.dataset.tab;
        document.getElementById(currentTabId).style.display = 'none';
    }

    targetTab.classList.add('active');
    const targetTabId = 'tab-' + targetTab.dataset.tab;
    document.getElementById(targetTabId).style.display = 'block';
}

// Function for getting the current study time from local storage (with callback)
function getCurrentStudyTime(callback) {
    chrome.storage.local.get(['studyTime'], function(result) {
        let studyTime = 25; // Default value
        if (result.studyTime !== undefined) {
            studyTime = result.studyTime;
        }
        console.log('Current study time:', studyTime);
        callback(studyTime);
    });
}

// Function for setting the current study time to local storage
function setCurrentStudyTime(studyTime) {
    chrome.storage.local.set({studyTime: studyTime }, function() {
        console.log('Study time set to:', studyTime);
    });
}

// Study and break time adjustment functions
const studyTimeIncrement = document.getElementById('incrementStudyTime');
studyTimeIncrement.addEventListener('click', incrementStudyTime);

function incrementStudyTime() {
    if (!isRunning) {
        getCurrentStudyTime(function(studyTime) {
            if (studyTime < 60) {
                const newStudyTime = studyTime + 5;
                setCurrentStudyTime(newStudyTime);
                document.getElementById('study-time').textContent = newStudyTime;
                console.log('Study time incremented to:', newStudyTime);

                // Update current timer if in study mode
                if (!isBreakTime) {
                    timeLeft = newStudyTime * 60;
                    updateDisplay();
                }
            }
        });
    }
}

const studyTimeDecrement = document.getElementById('decrementStudyTime');
studyTimeDecrement.addEventListener('click', decrementStudyTime);

function decrementStudyTime() {
    if (!isRunning) {
        getCurrentStudyTime(function(studyTime) {
            if (studyTime > 25) {
                const newStudyTime = studyTime - 5;
                setCurrentStudyTime(newStudyTime);
                document.getElementById('study-time').textContent = newStudyTime;

                // Update current timer if in study mode
                if (!isBreakTime) {
                    timeLeft = newStudyTime * 60;
                    updateDisplay();
                }
            }
        });
    }
}

// Function for getting the current break time from local storage (with callback)
function getCurrentBreakTime(callback) {
    chrome.storage.local.get(['breakTime'], function(result) {
        let breakTime = 5; // Default value
        if (result.breakTime !== undefined) {
            breakTime = result.breakTime;
        }
        console.log('Current break time:', breakTime);
        callback(breakTime);
    });
}

// Function for setting the current study time to local storage
function setCurrentBreakTime(breakTime) {
    chrome.storage.local.set({breakTime: breakTime }, function() {
        console.log('Break time set to:', breakTime);
    });
}

const breakTimeIncrement = document.getElementById('incrementBreakTime');
breakTimeIncrement.addEventListener('click', incrementBreakTime);

function incrementBreakTime() {
    if (!isRunning) {
        getCurrentBreakTime(function(breakTime) {
            if (breakTime < 15) {
                const newBreakTime = breakTime + 1;
                setCurrentBreakTime(newBreakTime);
                    if (isBreakTime) {
                        timeLeft = newBreakTime * 60;
                    }
                updateDisplay();
            }
        })
    };
}


const breakTimeDecrement = document.getElementById('decrementBreakTime');
breakTimeDecrement.addEventListener('click', decrementBreakTime);

function decrementBreakTime() {
    if (!isRunning) {
        getCurrentBreakTime(function(breakTime) {
            if (breakTime > 1) {
                const newBreakTime = breakTime - 1;
                setCurrentBreakTime(newBreakTime)
                    if (isBreakTime) {
                        timeLeft = newBreakTime * 60;
                    }
                updateDisplay();
                };
            })
        }
}



const startTimer = document.getElementById("toggleStart");
startTimer.addEventListener('click', (e) => {
    if (!isRunning) {
        isRunning = true;
        timer = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
                updateStatus();
            } else {
                // Timer finished
                clearInterval(timer);
                isRunning = false;
                isPaused = false;

                // Switch modes and show notification
                if (isBreakTime) {
                    showNotification('Break time is over!', 'Time to get back to work! 💪');
                    switchToStudyMode();
                } else {
                    showNotification('Study session complete!', 'Time for a well-deserved break! 🎉');
                    switchToBreakMode();
                }

                updateDisplay();
                updateStatus();

                // Reset button text
                const pauseButton = document.querySelector('.control-buttons button:first-child');
                pauseButton.textContent = 'Start';
            }
        }, 1000);
    }
});



// Initialize the timer display
function updateDisplay() {
    // Get the current study and break times from storage and update the timer display
    getCurrentStudyTime(function(studyTime) {
        getCurrentBreakTime(function(breakTime) {
            let minutes, seconds;
            if (!isBreakTime) {
                // Use studyTime from storage for study mode
                minutes = Math.floor(timeLeft / 60);
                seconds = timeLeft % 60;
                // If timer is reset or not running, show the stored study time
                if (!isRunning && !isPaused) {
                    minutes = studyTime;
                    seconds = 0;
                }
            } else {
                // Use breakTime from storage for break mode
                minutes = Math.floor(timeLeft / 60);
                seconds = timeLeft % 60;
                // If timer is reset or not running, show the stored break time
                if (!isRunning && !isPaused) {
                    minutes = breakTime;
                    seconds = 0;
                }
            }
            // Update the timer display element
            const timerDisplay = document.getElementById('timer');
            if (timerDisplay) {
                timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
            // Update the study and break time display elements
            const studyTimeDisplay = document.getElementById('study-time');
            if (studyTimeDisplay) {
                studyTimeDisplay.textContent = studyTime;
            }
            const breakTimeDisplay = document.getElementById('break-time');
            if (breakTimeDisplay) {
                breakTimeDisplay.textContent = breakTime;
            }
        });
    });
}

// Update status indicators
function updateStatus() {
    const statusIndicator = document.querySelector('.status-indicator');
    const modeIndicator = document.querySelector('.mode-indicator');

    if (statusIndicator) {
        statusIndicator.className = 'status-indicator';
        if (isRunning) {
            statusIndicator.classList.add('running');
        } else if (isPaused) {
            statusIndicator.classList.add('paused');
        }
    }

    if (modeIndicator) {
        modeIndicator.textContent = isBreakTime ? 'Break Time' : 'Study Time';
    }
}


// Switch to break mode
function switchToBreakMode() {
    isBreakTime = true;
    currentMode = 'break';
    const breakMinutes = parseInt(document.getElementById('break-time').textContent);
    timeLeft = breakMinutes * 60;
}

// Switch to study mode
function switchToStudyMode() {
    isBreakTime = false;
    currentMode = 'study';
    const studyMinutes = parseInt(document.getElementById('study-time').textContent);
    timeLeft = studyMinutes * 60;
}

// Show notification
function showNotification(title, message) {
    // Try to show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff6b6b"><circle cx="12" cy="12" r="10"/></svg>'
        });
    }
    // Fallback to alert
    alert(title + '\n' + message);
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Pause/Resume toggle with screen sharing
async function togglePauseResume() {
    const button = event.target;

    if (!isRunning && !isPaused) {
        // Show screen sharing popup and start timer
        button.textContent = 'Requesting...';
        button.disabled = true;

        const screenShareSuccess = await requestScreenShare();

        if (screenShareSuccess) {
            // Start timer only if screen sharing was successful
            startTimer();
            button.textContent = 'Pause';
        } else {
            button.textContent = 'Start';
        }

        button.disabled = false;
    } else if (isRunning && !isPaused) {
        // Pause timer
        pauseTimer();
        button.textContent = 'Resume';
    } else if (isPaused) {
        // Resume timer
        startTimer();
        isPaused = false;
        button.textContent = 'Pause';
    }
}

// Helper function to pause timer
function pauseTimer() {
    clearInterval(timer);
    isRunning = false;
    isPaused = true;
}

// Restart the timer
function restartTimer() {
    clearInterval(timer);
    isRunning = false;
    isPaused = false;

    // Stop screen sharing if active
    stopScreenShare();

    // Reset to current study/break time setting
    if (isBreakTime) {
        const breakMinutes = parseInt(document.getElementById('break-time').textContent);
        timeLeft = breakMinutes * 60;
    } else {
        const studyMinutes = parseInt(document.getElementById('study-time').textContent);
        timeLeft = studyMinutes * 60;
    }

    updateDisplay();
    updateStatus();

    // Reset button text
    const pauseButton = document.querySelector('.control-buttons button:first-child');
    pauseButton.textContent = 'Start';
}

// Website management functions
function getCurrentTabUrl() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            currentTabUrl = cleanWebsiteURL(tabs[0].url);
        }
    });
}

function loadWebsiteLists() {
    chrome.storage.local.get(['blockedSites', 'allowedSites'], (result) => {
        blockedSites = result.blockedSites || [];
        allowedSites = result.allowedSites || [];
        renderWebsiteLists();
    });
}

function setupWebsiteAccessHandlers() {
    // Add to allow list button
    document.getElementById('add-to-allow-btn').addEventListener('click', () => {
        addCurrentSiteToList('allow');
    });

    // Add to block list button
    document.getElementById('add-to-block-btn').addEventListener('click', () => {
        addCurrentSiteToList('block');
    });

    // Event delegation for dynamic buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-website')) {
            removeWebsite(e.target);
        }
    });
}

function addCurrentSiteToList(listType) {
    if (!currentTabUrl) {
        showNotification('Unable to get current website URL', 'error');
        return;
    }

    // Check if it's a valid website (not chrome:// or extension pages)
    if (currentTabUrl.startsWith('chrome://') || currentTabUrl.startsWith('chrome-extension://')) {
        showNotification('Cannot add browser pages to lists', 'error');
        return;
    }

    if (listType === 'allow') {
        // Remove from block list if exists
        blockedSites = blockedSites.filter(site => site !== currentTabUrl);

        // Add to allow list if not already there
        if (!allowedSites.includes(currentTabUrl)) {
            allowedSites.push(currentTabUrl);
            showNotification(`Added ${currentTabUrl} to allow list`, 'success');
        } else {
            showNotification('Website already in allow list', 'error');
            return;
        }
    } else {
        // Remove from allow list if exists
        allowedSites = allowedSites.filter(site => site !== currentTabUrl);

        // Add to block list if not already there
        if (!blockedSites.includes(currentTabUrl)) {
            blockedSites.push(currentTabUrl);
            showNotification(`Added ${currentTabUrl} to block list`, 'success');
        } else {
            showNotification('Website already in block list', 'error');
            return;
        }
    }

    saveWebsiteLists();
    renderWebsiteLists();
}

function renderWebsiteLists() {
    renderList('allow-list', 'allow-empty-state', allowedSites);
    renderList('block-list', 'block-empty-state', blockedSites);
}

function renderList(listId, emptyStateId, websites) {
    const listElement = document.getElementById(listId);
    const emptyState = document.getElementById(emptyStateId);

    if (websites.length === 0) {
        listElement.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    listElement.innerHTML = websites.map(website => `
        <div class="website-item">
            <span class="website-name">${website}</span>
            <button class="remove-website" data-website="${website}" data-list="${listId}">
                <span class="minus-icon">−</span>
            </button>
        </div>
    `).join('');
}

function removeWebsite(button) {
    const website = button.dataset.website;
    const listType = button.dataset.list;

    if (listType === 'allow-list') {
        allowedSites = allowedSites.filter(site => site !== website);
        showNotification(`Removed ${website} from allow list`, 'success');
    } else {
        blockedSites = blockedSites.filter(site => site !== website);
        showNotification(`Removed ${website} from block list`, 'success');
    }

    saveWebsiteLists();
    renderWebsiteLists();
}

function cleanWebsiteURL(url) {
    try {
        const urlObj = new URL(url);
        let hostname = urlObj.hostname;

        // Remove www if present
        hostname = hostname.replace(/^www\./, '');

        return hostname.toLowerCase();
    } catch (e) {
        // If URL parsing fails, try to clean it manually
        url = url.replace(/^https?:\/\//, '');
        url = url.replace(/^www\./, '');
        url = url.split('/')[0];
        return url.toLowerCase();
    }
}

function saveWebsiteLists() {
    chrome.storage.local.set({blockedSites, allowedSites});

    // Update background script
    chrome.runtime.sendMessage({
        action: 'updateBlockedSites',
        blockedSites,
        allowedSites
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update the timer start function to include study session status
function updateTimerStart() {
    const originalStartTimer = document.getElementById('startTimer');
    if (originalStartTimer) {
        originalStartTimer.addEventListener('click', () => {
            chrome.runtime.sendMessage({action: 'startStudySession'});
        });
    }
}

// Update restart function
function updateRestartFunction() {
    const originalRestart = document.getElementById('restartTimer');
    if (originalRestart) {
        originalRestart.addEventListener('click', () => {
            chrome.runtime.sendMessage({action: 'stopStudySession'});
        });
    }
}

// Call these functions after DOM is loaded
setTimeout(() => {
    updateTimerStart();
    updateRestartFunction();
}, 100);
