/**
 * MicroLabs - Content Script for Real-time Selection Tracking & Workflow Recording
 */

// Selection tracking
document.addEventListener('mouseup', () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
        chrome.runtime.sendMessage({
            type: 'SELECTION_CHANGED',
            selection: selection
        });
    }
});

// === Workflow Recording ===
let isRecording = false;

function getElementSelector(element: Element): string {
    if (element.id) {
        return `#${element.id}`;
    }

    if (element.getAttribute('data-testid')) {
        return `[data-testid="${element.getAttribute('data-testid')}"]`;
    }

    if (element.getAttribute('name')) {
        return `[name="${element.getAttribute('name')}"]`;
    }

    // Build a selector path
    const tagName = element.tagName.toLowerCase();
    const classes = Array.from(element.classList).slice(0, 2).join('.');

    if (classes) {
        return `${tagName}.${classes}`;
    }

    // Try to get nth-child
    const parent = element.parentElement;
    if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName);
        if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
        }
    }

    return tagName;
}

function getElementInfo(element: Element) {
    return {
        tagName: element.tagName,
        id: element.id || undefined,
        className: element.className || undefined,
        text: element.textContent?.trim().substring(0, 50) || undefined,
        selector: getElementSelector(element),
        type: (element as HTMLInputElement).type || undefined,
        name: (element as HTMLInputElement).name || undefined,
        placeholder: (element as HTMLInputElement).placeholder || undefined,
    };
}

function recordAction(type: string, target: Element, extras: Record<string, any> = {}) {
    if (!isRecording) return;

    chrome.runtime.sendMessage({
        type: 'WORKFLOW_ACTION',
        action: {
            type,
            target: getElementInfo(target),
            ...extras
        }
    });
}

// Click handler
function handleClick(e: MouseEvent) {
    if (!isRecording) return;
    const target = e.target as Element;
    if (!target) return;

    recordAction('click', target, {
        position: { x: e.clientX, y: e.clientY }
    });
}

// Input handler
function handleInput(e: Event) {
    if (!isRecording) return;
    const target = e.target as HTMLInputElement;
    if (!target) return;

    // Debounce input events - only record after typing stops
    const inputId = target.id || target.name || 'input';
    clearTimeout((window as any)[`_inputDebounce_${inputId}`]);
    (window as any)[`_inputDebounce_${inputId}`] = setTimeout(() => {
        recordAction('input', target, {
            value: target.type === 'password' ? '***' : target.value
        });
    }, 500);
}

// Focus handler
function handleFocus(e: FocusEvent) {
    if (!isRecording) return;
    const target = e.target as Element;
    if (!target) return;

    recordAction('focus', target);
}

// Select change handler
function handleChange(e: Event) {
    if (!isRecording) return;
    const target = e.target as HTMLSelectElement;
    if (!target || target.tagName !== 'SELECT') return;

    recordAction('select', target, {
        value: target.value,
        text: target.options[target.selectedIndex]?.text
    });
}

// Scroll handler (debounced)
let scrollTimeout: any;
function handleScroll() {
    if (!isRecording) return;

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        recordAction('scroll', document.body, {
            position: { x: window.scrollX, y: window.scrollY }
        });
    }, 300);
}

function startRecording() {
    if (isRecording) return;
    isRecording = true;

    document.addEventListener('click', handleClick, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('change', handleChange, true);
    window.addEventListener('scroll', handleScroll, true);

    console.log('MicroLabs: Workflow recording started');
}

function stopRecording() {
    isRecording = false;

    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('input', handleInput, true);
    document.removeEventListener('focus', handleFocus, true);
    document.removeEventListener('change', handleChange, true);
    window.removeEventListener('scroll', handleScroll, true);

    console.log('MicroLabs: Workflow recording stopped');
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_WORKFLOW_RECORDING') {
        startRecording();
        sendResponse({ success: true });
    } else if (message.type === 'STOP_WORKFLOW_RECORDING') {
        stopRecording();
        sendResponse({ success: true });
    }
    return true;
});

console.log('MicroLabs Content Script Loaded');
