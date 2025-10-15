/**
 * Lightwave ChatKit Widget with Flow Integration
 * Version: 3.0.0
 * 
 * Features:
 * - Integration with ChatFlow service
 * - Quick action buttons from flows
 * - Smart routing based on flow rules
 * - Enhanced message formatting
 * - Multiple themes support
 */

(function(window, document) {
    'use strict';

    // Widget configuration
    let config = {
        apiUrl: '/api/chatkit',
        organizationId: 'lightwave',
        position: 'bottom-right',
        theme: 'lightwave',
        autoOpen: false,
        showNotification: true,
        enableFlows: true,
        enableQuickActions: true,
        zIndex: 999999
    };

    // Widget state
    let state = {
        isInitialized: false,
        isOpen: false,
        currentSessionId: null,
        isOnline: false,
        widgetContainer: null,
        currentFlowState: null,
        quickActions: []
    };

    /**
     * Initialize the ChatKit Widget
     */
    function init(customConfig = {}) {
        if (state.isInitialized) {
            console.warn('Lightwave ChatKit Widget is already initialized');
            return;
        }

        // Merge configuration
        config = { ...config, ...customConfig };

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createWidget);
        } else {
            createWidget();
        }

        state.isInitialized = true;
    }

    /**
     * Create and inject the widget into the page
     */
    function createWidget() {
        // Create widget container
        state.widgetContainer = document.createElement('div');
        state.widgetContainer.id = 'lightwave-chat-widget';
        
        // Add CSS styles
        injectStyles();
        
        // Add HTML structure
        state.widgetContainer.innerHTML = getWidgetHTML();
        
        // Position the widget
        setWidgetPosition();
        
        // Attach event listeners
        attachEventListeners();
        
        // Append to body
        document.body.appendChild(state.widgetContainer);
        
        // Initialize connection
        checkServiceStatus();
    }

    /**
     * Inject CSS styles for the widget
     */
    function injectStyles() {
        if (document.getElementById('lightwave-widget-styles')) {
            return; // Styles already injected
        }

        const style = document.createElement('style');
        style.id = 'lightwave-widget-styles';
        style.textContent = `
            #lightwave-chat-widget {
                position: fixed;
                z-index: ${config.zIndex};
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                
                /* CSS Variables for ConvoAI theming */
                --lwcw-primary: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
                --lwcw-primary-hover: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
                --lwcw-background: #ffffff;
                --lwcw-text: #333333;
                --lwcw-border: #e3f2fd;
                --lwcw-shadow: 0 20px 60px rgba(30, 136, 229, 0.15);
                --lwcw-accent: #2196f3;
            }

            .lwcw-toggle-button {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: var(--lwcw-primary, linear-gradient(135deg, #1e88e5 0%, #1565c0 100%));
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: var(--lwcw-shadow, 0 6px 25px rgba(102, 126, 234, 0.3));
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: visible;
            }

            .lwcw-toggle-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                transform: scale(0);
                transition: transform 0.3s ease;
            }

            .lwcw-toggle-button:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 35px rgba(102, 126, 234, 0.4);
            }

            .lwcw-toggle-button:hover::before {
                transform: scale(1);
            }

            .lwcw-icon {
                font-size: 28px;
                color: white;
                transition: all 0.3s ease;
                z-index: 1;
            }

            .lwcw-toggle-button.close .lwcw-icon {
                transform: rotate(45deg);
            }

            .lwcw-notification-badge {
                position: absolute;
                top: -10px;
                right: -10px;
                background: #ff4757 !important;
                color: white !important;
                border-radius: 50%;
                min-width: 26px;
                height: 26px;
                font-size: 13px;
                font-weight: 700;
                display: flex !important;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transform: scale(0);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: 3px solid white;
                z-index: 1000002 !important;
                box-shadow: 0 4px 12px rgba(255, 71, 87, 0.4) !important;
                pointer-events: none;
            }

            .lwcw-notification-badge.active {
                opacity: 1 !important;
                transform: scale(1) !important;
                animation: lwcw-pulse 2s infinite;
                visibility: visible !important;
            }

            @keyframes lwcw-pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
            }

            .lwcw-chat-window {
                position: absolute;
                width: 400px;
                height: 600px;
                background: var(--lwcw-background, white);
                color: var(--lwcw-text, #333);
                border-radius: 20px;
                box-shadow: var(--lwcw-shadow, 0 20px 60px rgba(0, 0, 0, 0.15));
                overflow: hidden;
                transform: translateY(20px) scale(0.9);
                opacity: 0;
                visibility: hidden;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
            }

            .lwcw-chat-window.open {
                transform: translateY(0) scale(1);
                opacity: 1;
                visibility: visible;
            }

            .lwcw-header {
                background: var(--lwcw-primary, linear-gradient(135deg, #1e88e5 0%, #1565c0 100%));
                color: white;
                padding: 1.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-shrink: 0;
                position: relative;
            }

            .lwcw-header::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
            }

            .lwcw-header-info {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .lwcw-avatar {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                border: 2px solid rgba(255, 255, 255, 0.2);
            }

            .lwcw-header-text h3 {
                margin: 0;
                font-size: 1.1rem;
                font-weight: 600;
                line-height: 1.2;
            }

            .lwcw-header-text p {
                margin: 0;
                font-size: 0.85rem;
                opacity: 0.85;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .lwcw-status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #51cf66;
                animation: lwcw-pulse-dot 2s infinite;
            }

            @keyframes lwcw-pulse-dot {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }

            .lwcw-close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                font-size: 16px;
            }

            .lwcw-close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .lwcw-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .lwcw-welcome {
                padding: 2rem;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
                flex: 1;
                background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            }

            .lwcw-welcome-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem auto;
                font-size: 32px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }

            .lwcw-welcome h2 {
                color: #333;
                font-size: 1.4rem;
                margin: 0 0 0.5rem 0;
                font-weight: 600;
            }

            .lwcw-welcome p {
                color: #666;
                font-size: 0.95rem;
                margin: 0 0 2rem 0;
                line-height: 1.5;
            }

            .lwcw-department-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .lwcw-dept-btn {
                padding: 1rem;
                border: 2px solid #e9ecef;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
                font-size: 0.85rem;
                color: #333;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
            }

            .lwcw-dept-btn:hover {
                border-color: #1e88e5;
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
            }

            .lwcw-dept-icon {
                font-size: 1.4rem;
                margin-bottom: 0.25rem;
            }

            .lwcw-general-btn {
                grid-column: 1 / -1;
                background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
                color: white;
                border: none;
                font-weight: 600;
            }

            .lwcw-general-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
            }

            .lwcw-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: none;
                scroll-behavior: smooth;
            }

            .lwcw-messages.active {
                display: flex;
                flex-direction: column;
            }

            .lwcw-messages::-webkit-scrollbar {
                width: 6px;
            }

            .lwcw-messages::-webkit-scrollbar-track {
                background: #f1f3f4;
                border-radius: 3px;
            }

            .lwcw-messages::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 3px;
            }

            .lwcw-message {
                margin-bottom: 1rem;
                max-width: 85%;
                animation: lwcw-slideIn 0.3s ease;
            }

            @keyframes lwcw-slideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .lwcw-message.bot {
                align-self: flex-start;
            }

            .lwcw-message.user {
                align-self: flex-end;
                margin-left: auto;
            }

            .lwcw-message-bubble {
                padding: 0.875rem 1.125rem;
                border-radius: 20px;
                font-size: 0.9rem;
                line-height: 1.5;
                position: relative;
                word-wrap: break-word;
            }

            .lwcw-message.bot .lwcw-message-bubble {
                background: #f1f3f4;
                color: #333;
                border-bottom-left-radius: 6px;
            }

            .lwcw-message.user .lwcw-message-bubble {
                background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
                color: white;
                border-bottom-right-radius: 6px;
            }

            .lwcw-message.bot .lwcw-message-bubble strong {
                color: #1e88e5;
                font-weight: 600;
            }

            .lwcw-message.bot .lwcw-message-bubble ol,
            .lwcw-message.bot .lwcw-message-bubble ul {
                margin: 0.5rem 0;
                padding-left: 1rem;
            }

            .lwcw-message.bot .lwcw-message-bubble li {
                margin-bottom: 0.25rem;
            }

            .lwcw-flow-badge {
                background: #1e88e5;
                color: white;
                font-size: 0.7rem;
                padding: 0.2rem 0.5rem;
                border-radius: 10px;
                margin-bottom: 0.5rem;
                display: inline-block;
            }

            .lwcw-quick-actions {
                display: flex;
                gap: 0.5rem;
                margin: 0.75rem 0;
                flex-wrap: wrap;
            }

            .lwcw-quick-action {
                background: white;
                border: 1px solid #1e88e5;
                color: #1e88e5;
                border-radius: 16px;
                padding: 0.5rem 0.75rem;
                font-size: 0.8rem;
                cursor: pointer;
                transition: all 0.2s;
            }

            .lwcw-quick-action:hover {
                background: #1e88e5;
                color: white;
                transform: translateY(-1px);
            }

            .lwcw-typing {
                display: none;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem;
                color: #666;
                font-style: italic;
                font-size: 0.85rem;
            }

            .lwcw-typing.active {
                display: flex;
                animation: lwcw-fadeIn 0.3s ease;
            }

            @keyframes lwcw-fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .lwcw-typing-avatar {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: #f1f3f4;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
            }

            .lwcw-typing-dots {
                display: flex;
                gap: 3px;
            }

            .lwcw-typing-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #1e88e5;
                animation: lwcw-typing-bounce 1.4s ease-in-out infinite both;
            }

            .lwcw-typing-dot:nth-child(1) { animation-delay: -0.32s; }
            .lwcw-typing-dot:nth-child(2) { animation-delay: -0.16s; }
            .lwcw-typing-dot:nth-child(3) { animation-delay: 0s; }

            @keyframes lwcw-typing-bounce {
                0%, 80%, 100% {
                    transform: scale(0.8);
                    opacity: 0.5;
                }
                40% {
                    transform: scale(1.2);
                    opacity: 1;
                }
            }

            .lwcw-input-area {
                padding: 1rem;
                border-top: 1px solid rgba(0, 0, 0, 0.05);
                background: white;
                display: none;
                flex-shrink: 0;
            }

            .lwcw-input-area.active {
                display: block;
            }

            .lwcw-input-container {
                display: flex;
                gap: 0.75rem;
                align-items: flex-end;
                background: #f8f9fa;
                border-radius: 24px;
                padding: 0.5rem;
                border: 2px solid transparent;
                transition: border-color 0.2s;
            }

            .lwcw-input-container.focused {
                border-color: #1e88e5;
            }

            .lwcw-message-input {
                flex: 1;
                border: none;
                background: none;
                padding: 0.75rem;
                font-size: 0.9rem;
                outline: none;
                resize: none;
                font-family: inherit;
                color: #333;
                max-height: 120px;
                min-height: 20px;
            }

            .lwcw-message-input::placeholder {
                color: #999;
            }

            .lwcw-send-btn {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #1e88e5;
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                font-size: 16px;
            }

            .lwcw-send-btn:hover {
                background: #1976d2;
                transform: scale(1.05);
            }

            .lwcw-send-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
            }

            .lwcw-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                color: #666;
            }

            .lwcw-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #1e88e5;
                border-radius: 50%;
                animation: lwcw-spin 1s linear infinite;
                margin-bottom: 1rem;
            }

            @keyframes lwcw-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .lwcw-error {
                padding: 2rem;
                text-align: center;
                color: #e53e3e;
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .lwcw-error-icon {
                font-size: 2rem;
                margin-bottom: 1rem;
            }

            .lwcw-retry-btn {
                margin-top: 1rem;
                padding: 0.5rem 1rem;
                background: #1e88e5;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }

            /* Position classes */
            .lwcw-position-bottom-right {
                bottom: 24px;
                right: 24px;
            }
            
            .lwcw-position-bottom-right .lwcw-chat-window {
                bottom: 88px;
                right: 0;
            }

            .lwcw-position-bottom-left {
                bottom: 24px;
                left: 24px;
            }
            
            .lwcw-position-bottom-left .lwcw-chat-window {
                bottom: 88px;
                left: 0;
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                #lightwave-chat-widget {
                    bottom: 16px !important;
                    left: 16px !important;
                    right: 16px !important;
                }
                
                .lwcw-chat-window {
                    width: calc(100vw - 32px) !important;
                    height: calc(100vh - 120px) !important;
                    bottom: 88px !important;
                    left: 0 !important;
                    right: 0 !important;
                    border-radius: 16px !important;
                }

                .lwcw-department-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Get the HTML structure for the widget
     */
    function getWidgetHTML() {
        return `
            <button class="lwcw-toggle-button" onclick="LightwaveChat.toggle()">
                <span class="lwcw-icon">💬</span>
                <div class="lwcw-notification-badge" id="lwcw-notification">1</div>
            </button>

            <div class="lwcw-chat-window" id="lwcw-window">
                <div class="lwcw-header">
                    <div class="lwcw-header-info">
                        <div class="lwcw-avatar">😊</div>
                        <div class="lwcw-header-text">
                            <h3 id="lwcw-title">ConvoAI Support</h3>
                            <p id="lwcw-status">
                                <span class="lwcw-status-dot"></span>
                                <span>Connecting...</span>
                            </p>
                        </div>
                    </div>
                    <button class="lwcw-close-btn" onclick="LightwaveChat.close()">✕</button>
                </div>

                <div class="lwcw-content">
                    <div class="lwcw-loading" id="lwcw-loading">
                        <div class="lwcw-spinner"></div>
                        <p>Connecting to support...</p>
                    </div>

                    <div class="lwcw-welcome" id="lwcw-welcome" style="display: none;">
                        <div class="lwcw-welcome-avatar">👋</div>
                        <h2>Hi there!</h2>
                        <p>How can we help you today?</p>
                        
                        <div class="lwcw-department-grid">
                            <button class="lwcw-dept-btn" onclick="LightwaveChat.startChat('sales')">
                                <span class="lwcw-dept-icon">💰</span>
                                <span>Sales</span>
                            </button>
                            <button class="lwcw-dept-btn" onclick="LightwaveChat.startChat('technical')">
                                <span class="lwcw-dept-icon">🔧</span>
                                <span>Technical</span>
                            </button>
                            <button class="lwcw-dept-btn" onclick="LightwaveChat.startChat('support')">
                                <span class="lwcw-dept-icon">🎧</span>
                                <span>Support</span>
                            </button>
                            <button class="lwcw-dept-btn" onclick="LightwaveChat.startChat('billing')">
                                <span class="lwcw-dept-icon">💳</span>
                                <span>Billing</span>
                            </button>
                            <button class="lwcw-dept-btn lwcw-general-btn" onclick="LightwaveChat.startChat('general')">
                                💬 Start General Chat
                            </button>
                        </div>
                    </div>

                    <div class="lwcw-messages" id="lwcw-messages">
                        <!-- Messages will be added here -->
                    </div>

                    <div class="lwcw-typing" id="lwcw-typing">
                        <div class="lwcw-typing-avatar">🤖</div>
                        <span>AI Assistant is typing</span>
                        <div class="lwcw-typing-dots">
                            <div class="lwcw-typing-dot"></div>
                            <div class="lwcw-typing-dot"></div>
                            <div class="lwcw-typing-dot"></div>
                        </div>
                    </div>

                    <div class="lwcw-error" id="lwcw-error" style="display: none;">
                        <div class="lwcw-error-icon">⚠️</div>
                        <h3>Unable to connect</h3>
                        <p>Please check your connection and try again.</p>
                        <button class="lwcw-retry-btn" onclick="LightwaveChat.retry()">Retry</button>
                    </div>
                </div>

                <div class="lwcw-input-area" id="lwcw-input">
                    <div class="lwcw-input-container">
                        <textarea 
                            class="lwcw-message-input" 
                            id="lwcw-message-input" 
                            placeholder="Type your message..."
                            rows="1"
                        ></textarea>
                        <button class="lwcw-send-btn" onclick="LightwaveChat.sendMessage()">➤</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Set widget position
     */
    function setWidgetPosition() {
        state.widgetContainer.className = `lwcw-position-${config.position}`;
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        const messageInput = document.getElementById('lwcw-message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', function(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                }
            });

            messageInput.addEventListener('focus', function() {
                document.querySelector('.lwcw-input-container').classList.add('focused');
            });

            messageInput.addEventListener('blur', function() {
                document.querySelector('.lwcw-input-container').classList.remove('focused');
            });
        }
    }

    /**
     * Check service status
     */
    async function checkServiceStatus() {
        try {
            const response = await fetch(`${config.apiUrl}/health`);
            const status = await response.json();
            
            state.isOnline = status.success && status.status === 'ready';
            updateConnectionStatus();
            
            if (state.isOnline) {
                showWelcomeScreen();
            } else {
                showError('Service temporarily unavailable');
            }
            
        } catch (error) {
            console.warn('ChatKit Widget: Failed to connect to service');
            state.isOnline = false;
            updateConnectionStatus();
            showError('Unable to connect to chat service');
        }
    }

    /**
     * Update connection status
     */
    function updateConnectionStatus() {
        const statusEl = document.querySelector('#lwcw-status span:last-child');
        if (statusEl) {
            if (state.isOnline) {
                statusEl.textContent = 'Online • Typically replies instantly';
            } else {
                statusEl.textContent = 'Connecting...';
            }
        }
    }

    /**
     * Show welcome screen
     */
    function showWelcomeScreen() {
        document.getElementById('lwcw-loading').style.display = 'none';
        document.getElementById('lwcw-error').style.display = 'none';
        document.getElementById('lwcw-messages').classList.remove('active');
        document.getElementById('lwcw-input').classList.remove('active');
        document.getElementById('lwcw-welcome').style.display = 'flex';
    }

    /**
     * Show chat interface
     */
    function showChatInterface() {
        document.getElementById('lwcw-loading').style.display = 'none';
        document.getElementById('lwcw-error').style.display = 'none';
        document.getElementById('lwcw-welcome').style.display = 'none';
        document.getElementById('lwcw-messages').classList.add('active');
        document.getElementById('lwcw-input').classList.add('active');
    }

    /**
     * Show error state
     */
    function showError(message) {
        document.getElementById('lwcw-loading').style.display = 'none';
        document.getElementById('lwcw-welcome').style.display = 'none';
        document.getElementById('lwcw-messages').classList.remove('active');
        document.getElementById('lwcw-input').classList.remove('active');
        
        const errorDiv = document.getElementById('lwcw-error');
        errorDiv.querySelector('p').textContent = message;
        errorDiv.style.display = 'flex';
    }

    /**
     * Toggle widget open/close
     */
    function toggle() {
        if (state.isOpen) {
            close();
        } else {
            open();
        }
    }

    /**
     * Open widget
     */
    function open() {
        if (state.isOpen) return;

        const window = document.getElementById('lwcw-window');
        const button = state.widgetContainer.querySelector('.lwcw-toggle-button');
        const icon = button.querySelector('.lwcw-icon');
        
        window.classList.add('open');
        button.classList.add('close');
        icon.textContent = '✕';
        
        hideNotification();
        state.isOpen = true;

        if (!state.isOnline) {
            checkServiceStatus();
        }
    }

    /**
     * Close widget
     */
    function close() {
        if (!state.isOpen) return;

        const window = document.getElementById('lwcw-window');
        const button = state.widgetContainer.querySelector('.lwcw-toggle-button');
        const icon = button.querySelector('.lwcw-icon');
        
        window.classList.remove('open');
        button.classList.remove('close');
        icon.textContent = '💬';
        
        state.isOpen = false;
    }

    /**
     * Show notification badge
     */
    function showNotification() {
        const badge = document.getElementById('lwcw-notification');
        if (badge) {
            badge.classList.add('active');
        }
    }

    /**
     * Hide notification badge
     */
    function hideNotification() {
        const badge = document.getElementById('lwcw-notification');
        if (badge) {
            badge.classList.remove('active');
        }
    }

    /**
     * Start chat with department
     */
    async function startChat(department = 'general') {
        if (!state.isOnline) {
            showError('Chat service is not available. Please try again later.');
            return;
        }

        // Show loading
        document.getElementById('lwcw-welcome').style.display = 'none';
        document.getElementById('lwcw-loading').style.display = 'flex';

        try {
            // Create session with flow integration
            const response = await fetch(`${config.apiUrl}/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: generateCustomerId(),
                    customerName: 'Website Visitor',
                    department: department,
                    organizationId: config.organizationId
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to create session: ${response.statusText}`);
            }

            const sessionData = await response.json();
            state.currentSessionId = sessionData.sessionId;
            state.currentFlowState = sessionData.flowState;

            // Update UI
            showChatInterface();
            
            // Update chat title if bot info is available
            if (sessionData.botInfo) {
                document.getElementById('lwcw-title').textContent = 
                    `${sessionData.botInfo.botName} - ${sessionData.botInfo.botRole}`;
            }
            
            // Display welcome message (could be from flow or bot)
            if (sessionData.botInfo?.greeting) {
                setTimeout(() => {
                    addBotMessage(sessionData.botInfo.greeting, {
                        isFlowMessage: !!sessionData.flowState
                    });
                }, 500);
            }

            // Show quick actions if available from flow
            if (state.currentFlowState?.quickActions) {
                state.quickActions = state.currentFlowState.quickActions;
                showQuickActions();
            }

        } catch (error) {
            console.error('Failed to start chat:', error);
            showError('Failed to start chat session. Please try again.');
        }
    }

    /**
     * Send message
     */
    async function sendMessage() {
        const messageInput = document.getElementById('lwcw-message-input');
        const message = messageInput.value.trim();
        
        if (!message || !state.currentSessionId) {
            return;
        }

        // Add user message to UI
        addUserMessage(message);
        messageInput.value = '';
        showTyping();

        // Hide quick actions after user sends a message
        hideQuickActions();

        try {
            const response = await fetch(`${config.apiUrl}/sessions/${state.currentSessionId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    type: 'user'
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.statusText}`);
            }

            const result = await response.json();
            hideTyping();

            // Update flow state if changed
            if (result.flowHandled && result.response?.newState) {
                state.currentFlowState = result.response.newState;
            }

            // Add bot response - check both 'type' and 'role' fields
            const botMessage = result.messages?.find(msg => msg.type === 'assistant' || msg.role === 'assistant');
            if (botMessage) {
                setTimeout(() => {
                    addBotMessage(botMessage.content, {
                        isFlowMessage: botMessage.isFlowMessage || result.flowHandled,
                        metadata: botMessage.metadata
                    });
                }, 800);
            } else if (result.messages && result.messages.length > 0) {
                // Debug: log what we actually got
                console.log('No assistant message found. Messages:', result.messages);
            }

        } catch (error) {
            console.error('Failed to send message:', error);
            hideTyping();
            addBotMessage('Sorry, I encountered an error. Please try again or contact support.');
        }
    }

    /**
     * Send quick action response
     */
    function sendQuickAction(actionText) {
        const messageInput = document.getElementById('lwcw-message-input');
        messageInput.value = actionText;
        sendMessage();
    }

    /**
     * Show quick actions
     */
    function showQuickActions() {
        if (!state.quickActions || state.quickActions.length === 0) return;

        // Remove existing quick actions
        const existingActions = document.querySelector('.lwcw-quick-actions');
        if (existingActions) {
            existingActions.remove();
        }

        // Create quick actions container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'lwcw-quick-actions';
        
        state.quickActions.forEach(action => {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'lwcw-quick-action';
            actionBtn.textContent = action.text;
            actionBtn.onclick = () => sendQuickAction(action.response || action.text);
            actionsContainer.appendChild(actionBtn);
        });

        // Insert after messages container
        const inputArea = document.getElementById('lwcw-input');
        inputArea.parentNode.insertBefore(actionsContainer, inputArea);
    }

    /**
     * Hide quick actions
     */
    function hideQuickActions() {
        const existingActions = document.querySelector('.lwcw-quick-actions');
        if (existingActions) {
            existingActions.style.display = 'none';
        }
    }

    /**
     * Add user message to chat
     */
    function addUserMessage(message) {
        const messagesContainer = document.getElementById('lwcw-messages');
        const messageEl = document.createElement('div');
        messageEl.className = 'lwcw-message user';
        messageEl.innerHTML = `
            <div class="lwcw-message-bubble">${escapeHtml(message)}</div>
        `;
        messagesContainer.appendChild(messageEl);
        scrollToBottom();
    }

    /**
     * Add bot message to chat
     */
    function addBotMessage(message, options = {}) {
        const messagesContainer = document.getElementById('lwcw-messages');
        const messageEl = document.createElement('div');
        messageEl.className = 'lwcw-message bot';
        
        let messageContent = '';
        
        // Add flow badge if this is a flow message
        if (options.isFlowMessage) {
            messageContent += '<div class="lwcw-flow-badge">Flow Response</div>';
        }
        
        const bubble = document.createElement('div');
        bubble.className = 'lwcw-message-bubble';
        
        // Check if message contains HTML formatting
        if (message.includes('<') && message.includes('>')) {
            bubble.innerHTML = messageContent + message;
        } else {
            bubble.innerHTML = messageContent;
            bubble.appendChild(document.createTextNode(message));
        }
        
        messageEl.appendChild(bubble);
        messagesContainer.appendChild(messageEl);
        scrollToBottom();

        // Show notification if widget is closed and notifications are enabled
        if (!state.isOpen && config.showNotification) {
            showNotification();
        }

        // Show quick actions if available in metadata
        if (options.metadata?.quickActions) {
            state.quickActions = options.metadata.quickActions;
            setTimeout(showQuickActions, 1000);
        }
    }

    /**
     * Show typing indicator
     */
    function showTyping() {
        document.getElementById('lwcw-typing').classList.add('active');
        scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    function hideTyping() {
        document.getElementById('lwcw-typing').classList.remove('active');
    }

    /**
     * Scroll chat to bottom
     */
    function scrollToBottom() {
        const messagesContainer = document.getElementById('lwcw-messages');
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }

    /**
     * Retry connection
     */
    async function retry() {
        await checkServiceStatus();
    }

    /**
     * Generate unique customer ID
     */
    function generateCustomerId() {
        return `chatkit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Public API
    const LightwaveChat = {
        init: init,
        open: open,
        close: close,
        toggle: toggle,
        startChat: startChat,
        sendMessage: sendMessage,
        sendQuickAction: sendQuickAction,
        showNotification: showNotification,
        hideNotification: hideNotification,
        retry: retry,
        isOpen: () => state.isOpen,
        isOnline: () => state.isOnline,
        getCurrentSession: () => state.currentSessionId,
        getFlowState: () => state.currentFlowState
    };

    // Export to global scope
    window.LightwaveChat = LightwaveChat;

})(window, document);


