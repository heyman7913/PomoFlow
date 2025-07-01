// blocked.js - JavaScript for the blocked page
// This file is separate to comply with Content Security Policy

function closeCurrentTab() {
    // First try to navigate back or close
    try {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // Try to close the window/tab
            window.close();
        }
    } catch (e) {
        console.log('Cannot close tab programmatically');
        // If we can't close, show a message to the user
        const closeBtn = document.getElementById('closeTabBtn');
        if (closeBtn) {
            closeBtn.textContent = 'Press Ctrl+W to close';
            closeBtn.disabled = true;
        }
    }
}

// Set up event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add click event listener to close button
    const closeBtn = document.getElementById('closeTabBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCurrentTab);
    }

    // Add Ctrl+W hint
    const container = document.querySelector('.container');
    if (container) {
        const hint = document.createElement('p');
        hint.textContent = 'Press Escape or Ctrl+W to close this tab';
        hint.style.cssText = 'font-size: 12px; color: rgba(227, 252, 239, 0.5); margin-top: 16px;';
        container.appendChild(hint);
    }
});

// Allow closing with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeCurrentTab();
    }
});
