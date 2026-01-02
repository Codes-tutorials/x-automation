/**
 * X Tweet Automation - Frontend App
 * Handles UI interactions, API calls, and state management
 */

// ============================================
// State
// ============================================

const state = {
    currentTweet: '',
    isGenerating: false,
    isPosting: false,
    availableProviders: [],
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    // Tabs
    navTabs: document.querySelectorAll('.nav-tab'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Generate Tab
    promptInput: document.getElementById('prompt'),
    providerSelect: document.getElementById('provider'),
    toneSelect: document.getElementById('tone'),
    generateBtn: document.getElementById('generate-btn'),

    // Preview
    previewCard: document.getElementById('preview-card'),
    tweetContent: document.getElementById('tweet-content'),
    charCount: document.getElementById('char-count'),
    regenerateBtn: document.getElementById('regenerate-btn'),
    postBtn: document.getElementById('post-btn'),

    // Success
    successCard: document.getElementById('success-card'),
    successMessage: document.getElementById('success-message'),
    tweetLink: document.getElementById('tweet-link'),
    newTweetBtn: document.getElementById('new-tweet-btn'),

    // Settings - X API
    xApiKey: document.getElementById('x-api-key'),
    xApiSecret: document.getElementById('x-api-secret'),
    xAccessToken: document.getElementById('x-access-token'),
    xAccessTokenSecret: document.getElementById('x-access-token-secret'),
    xStatus: document.getElementById('x-status'),

    // Settings - LLM Keys
    groqApiKey: document.getElementById('groq-api-key'),
    geminiApiKey: document.getElementById('gemini-api-key'),
    mistralApiKey: document.getElementById('mistral-api-key'),
    groqStatus: document.getElementById('groq-status'),
    geminiStatus: document.getElementById('gemini-status'),
    mistralStatus: document.getElementById('mistral-status'),

    saveCredentialsBtn: document.getElementById('save-credentials-btn'),

    // Toast
    toast: document.getElementById('toast'),
};

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// ============================================
// Tab Navigation
// ============================================

function switchTab(tabName) {
    // Update nav tabs
    elements.navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// ============================================
// Credentials Status
// ============================================

function updateStatusIndicator(statusElement, isConfigured, maskedValue) {
    const indicator = statusElement.querySelector('.status-indicator');
    const text = statusElement.querySelector('span:last-child');

    if (isConfigured) {
        indicator.classList.remove('not-configured');
        indicator.classList.add('configured');
        text.textContent = `Configured (${maskedValue})`;
    } else {
        indicator.classList.remove('configured');
        indicator.classList.add('not-configured');
        text.textContent = 'Not configured';
    }
}

async function checkCredentialsStatus() {
    try {
        const response = await fetch('/api/credentials/status');
        const data = await response.json();

        // Update X status
        updateStatusIndicator(elements.xStatus, data.xConfigured, data.xApiKey);

        // Update LLM provider statuses
        updateStatusIndicator(elements.groqStatus, data.groqConfigured, data.groqApiKey);
        updateStatusIndicator(elements.geminiStatus, data.geminiConfigured, data.geminiApiKey);
        updateStatusIndicator(elements.mistralStatus, data.mistralConfigured, data.mistralApiKey);

        // Update available providers in dropdown
        state.availableProviders = data.availableProviders || [];
        updateProviderDropdown();

        return data;
    } catch (error) {
        console.error('Failed to check credentials status:', error);
        return { xConfigured: false, groqConfigured: false, geminiConfigured: false, mistralConfigured: false };
    }
}

function updateProviderDropdown() {
    const options = elements.providerSelect.options;

    // Mark unavailable providers
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const isAvailable = state.availableProviders.some(p => p.id === option.value);

        if (!isAvailable) {
            option.textContent = option.textContent.replace(' (not configured)', '') + ' (not configured)';
            option.disabled = true;
        } else {
            option.textContent = option.textContent.replace(' (not configured)', '');
            option.disabled = false;
        }
    }

    // Select first available provider
    if (state.availableProviders.length > 0) {
        const currentValue = elements.providerSelect.value;
        const isCurrentAvailable = state.availableProviders.some(p => p.id === currentValue);

        if (!isCurrentAvailable) {
            elements.providerSelect.value = state.availableProviders[0].id;
        }
    }
}

// ============================================
// Save Credentials
// ============================================

async function saveCredentials() {
    const credentials = {
        xApiKey: elements.xApiKey.value.trim(),
        xApiSecret: elements.xApiSecret.value.trim(),
        xAccessToken: elements.xAccessToken.value.trim(),
        xAccessTokenSecret: elements.xAccessTokenSecret.value.trim(),
        groqApiKey: elements.groqApiKey.value.trim(),
        geminiApiKey: elements.geminiApiKey.value.trim(),
        mistralApiKey: elements.mistralApiKey.value.trim(),
    };

    // Check if at least one field has a value
    const hasValues = Object.values(credentials).some(v => v);
    if (!hasValues) {
        showToast('Please enter at least one credential', 'error');
        return;
    }

    elements.saveCredentialsBtn.classList.add('loading');
    elements.saveCredentialsBtn.disabled = true;

    try {
        const response = await fetch('/api/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Credentials saved successfully!', 'success');
            // Clear input fields
            elements.xApiKey.value = '';
            elements.xApiSecret.value = '';
            elements.xAccessToken.value = '';
            elements.xAccessTokenSecret.value = '';
            elements.groqApiKey.value = '';
            elements.geminiApiKey.value = '';
            elements.mistralApiKey.value = '';
            // Refresh status
            await checkCredentialsStatus();
        } else {
            showToast(data.error || 'Failed to save credentials', 'error');
        }
    } catch (error) {
        showToast('Failed to save credentials', 'error');
    } finally {
        elements.saveCredentialsBtn.classList.remove('loading');
        elements.saveCredentialsBtn.disabled = false;
    }
}

// ============================================
// Generate Tweet
// ============================================

async function generateTweet() {
    const prompt = elements.promptInput.value.trim();
    const tone = elements.toneSelect.value;
    const provider = elements.providerSelect.value;

    if (!prompt) {
        showToast('Please enter what you want to tweet about', 'error');
        elements.promptInput.focus();
        return;
    }

    // Check if selected provider is available
    const isProviderAvailable = state.availableProviders.some(p => p.id === provider);
    if (!isProviderAvailable) {
        showToast(`${provider} is not configured. Please add your API key in Settings.`, 'error');
        return;
    }

    state.isGenerating = true;
    elements.generateBtn.classList.add('loading');
    elements.generateBtn.disabled = true;
    elements.regenerateBtn.disabled = true;

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, tone, provider }),
        });

        const data = await response.json();

        if (response.ok) {
            state.currentTweet = data.tweet;
            displayTweetPreview(data.tweet);
            showToast('Tweet generated!', 'success');
        } else {
            showToast(data.error || 'Failed to generate tweet', 'error');

            // If it's a credentials error, prompt to go to settings
            if (data.error && data.error.includes('API key')) {
                setTimeout(() => switchTab('settings'), 1500);
            }
        }
    } catch (error) {
        showToast('Failed to generate tweet. Check your connection.', 'error');
    } finally {
        state.isGenerating = false;
        elements.generateBtn.classList.remove('loading');
        elements.generateBtn.disabled = false;
        elements.regenerateBtn.disabled = false;
    }
}

// ============================================
// Display Tweet Preview
// ============================================

function displayTweetPreview(tweet) {
    elements.tweetContent.textContent = tweet;
    updateCharCount(tweet.length);

    // Show preview card, hide success card
    elements.previewCard.style.display = 'block';
    elements.successCard.style.display = 'none';

    // Animate card entrance
    elements.previewCard.style.animation = 'none';
    elements.previewCard.offsetHeight; // Trigger reflow
    elements.previewCard.style.animation = 'fadeIn 0.3s ease';
}

function updateCharCount(length) {
    elements.charCount.textContent = `${length}/280`;
    elements.charCount.classList.remove('warning', 'error');

    if (length > 280) {
        elements.charCount.classList.add('error');
    } else if (length > 250) {
        elements.charCount.classList.add('warning');
    }
}

// ============================================
// Post Tweet
// ============================================

async function postTweet() {
    if (!state.currentTweet) {
        showToast('No tweet to post', 'error');
        return;
    }

    if (state.currentTweet.length > 280) {
        showToast('Tweet is too long', 'error');
        return;
    }

    state.isPosting = true;
    elements.postBtn.classList.add('loading');
    elements.postBtn.disabled = true;
    elements.regenerateBtn.disabled = true;

    try {
        const response = await fetch('/api/tweet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: state.currentTweet }),
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess(data);
        } else {
            showToast(data.error || 'Failed to post tweet', 'error');

            // If it's a credentials error, prompt to go to settings
            if (data.error && (data.error.includes('credentials') || data.error.includes('Unauthorized') || data.error.includes('permissions'))) {
                setTimeout(() => switchTab('settings'), 1500);
            }
        }
    } catch (error) {
        showToast('Failed to post tweet. Check your connection.', 'error');
    } finally {
        state.isPosting = false;
        elements.postBtn.classList.remove('loading');
        elements.postBtn.disabled = false;
        elements.regenerateBtn.disabled = false;
    }
}

// ============================================
// Show Success
// ============================================

function showSuccess(data) {
    elements.previewCard.style.display = 'none';
    elements.successCard.style.display = 'block';
    elements.successCard.style.animation = 'none';
    elements.successCard.offsetHeight; // Trigger reflow
    elements.successCard.style.animation = 'fadeIn 0.3s ease';

    elements.tweetLink.href = data.url;
    showToast('Tweet posted successfully! 🎉', 'success');
}

// ============================================
// Reset for New Tweet
// ============================================

function resetForNewTweet() {
    state.currentTweet = '';
    elements.promptInput.value = '';
    elements.tweetContent.textContent = '';
    elements.previewCard.style.display = 'none';
    elements.successCard.style.display = 'none';
    elements.promptInput.focus();
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
    // Tab navigation
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Generate tweet
    elements.generateBtn.addEventListener('click', generateTweet);

    // Regenerate tweet
    elements.regenerateBtn.addEventListener('click', generateTweet);

    // Post tweet
    elements.postBtn.addEventListener('click', postTweet);

    // New tweet
    elements.newTweetBtn.addEventListener('click', resetForNewTweet);

    // Save credentials
    elements.saveCredentialsBtn.addEventListener('click', saveCredentials);

    // Enter key in prompt textarea (Ctrl+Enter to generate)
    elements.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            generateTweet();
        }
    });
}

// ============================================
// Initialize App
// ============================================

async function init() {
    initEventListeners();
    await checkCredentialsStatus();

    // Focus on prompt input
    elements.promptInput.focus();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
