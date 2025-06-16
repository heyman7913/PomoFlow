// Enhanced Pomodoro Timer JavaScript

let timer;
let isRunning = false;
let isPaused = false;
let timeLeft = 25 * 60; // Default 25 minutes in seconds
let isBreakTime = false;
let currentMode = 'study';
let mediaStream = null; // Store the screen sharing stream

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
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timer').textContent = display;

    // Update timer circle classes based on state
    const timerCircle = document.getElementById('timer');
    timerCircle.className = 'timer-circle';
    if (isRunning) {
        timerCircle.classList.add('running');
    } else if (isPaused) {
        timerCircle.classList.add('paused');
    }
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

// Study and break time adjustment functions
function incrementStudyTime() {
    if (!isRunning) {
        const studyTimeElement = document.getElementById('study-time');
        let currentTime = parseInt(studyTimeElement.textContent);
        if (currentTime < 60) {
            studyTimeElement.textContent = currentTime + 5;

            // Update current timer if in study mode
            if (!isBreakTime) {
                timeLeft = (currentTime + 5) * 60;
                updateDisplay();
            }
        }
    }
}

function decrementStudyTime() {
    if (!isRunning) {
        const studyTimeElement = document.getElementById('study-time');
        let currentTime = parseInt(studyTimeElement.textContent);
        if (currentTime > 5) {
            studyTimeElement.textContent = currentTime - 5;

            // Update current timer if in study mode
            if (!isBreakTime) {
                timeLeft = (currentTime - 5) * 60;
                updateDisplay();
            }
        }
    }
}

function incrementBreakTime() {
    if (!isRunning) {
        const breakTimeElement = document.getElementById('break-time');
        let currentTime = parseInt(breakTimeElement.textContent);
        if (currentTime < 30) {
            breakTimeElement.textContent = currentTime + 1;

            // Update current timer if in break mode
            if (isBreakTime) {
                timeLeft = (currentTime + 1) * 60;
                updateDisplay();
            }
        }
    }
}

function decrementBreakTime() {
    if (!isRunning) {
        const breakTimeElement = document.getElementById('break-time');
        let currentTime = parseInt(breakTimeElement.textContent);
        if (currentTime > 1) {
            breakTimeElement.textContent = currentTime - 1;

            // Update current timer if in break mode
            if (isBreakTime) {
                timeLeft = (currentTime - 1) * 60;
                updateDisplay();
            }
        }
    }
}

// Initialize display when popup loads
// document.addEventListener('DOMContentLoaded', function) {
//     // Initialize timer based on current study time
//     const studyMinutes = parseInt(document.getElementById('study-time').textContent);
//     timeLeft = studyMinutes * 60;

//     updateDisplay();
//     updateStatus();

//     // Request notification permission
//     requestNotificationPermission();

//     // Set initial button text
//     const pauseButton = document.querySelector('.control-buttons button:first-child');
//     pauseButton.textContent = 'Start';
// };