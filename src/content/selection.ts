/**
 * MicroLabs - Content Script for Real-time Selection Tracking
 */

document.addEventListener('mouseup', () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
        chrome.runtime.sendMessage({
            type: 'SELECTION_CHANGED',
            selection: selection
        });
    }
});

// Optionally, listen for page updates or other events
console.log('MicroLabs Content Script Loaded');
