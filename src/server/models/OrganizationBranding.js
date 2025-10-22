const mongoose = require('mongoose');

// Organization Branding Schema
const BrandingSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true
    },
    
    // Logo and Visual Assets
    logo: {
        url: String,
        alt: String,
        width: { type: Number, default: 200 },
        height: { type: Number, default: 60 }
    },
    
    favicon: {
        url: String
    },
    
    // Color Scheme
    colors: {
        primary: { type: String, default: '#4299e1' },
        secondary: { type: String, default: '#667eea' },
        accent: { type: String, default: '#764ba2' },
        success: { type: String, default: '#48bb78' },
        warning: { type: String, default: '#ed8936' },
        error: { type: String, default: '#f56565' },
        background: { type: String, default: '#ffffff' },
        surface: { type: String, default: '#f8f9fa' },
        text: { type: String, default: '#2d3748' },
        textSecondary: { type: String, default: '#718096' }
    },
    
    // Typography
    typography: {
        fontFamily: { type: String, default: 'Inter, system-ui, sans-serif' },
        fontSize: {
            small: { type: String, default: '0.875rem' },
            base: { type: String, default: '1rem' },
            large: { type: String, default: '1.125rem' },
            xl: { type: String, default: '1.25rem' },
            '2xl': { type: String, default: '1.5rem' }
        },
        fontWeight: {
            normal: { type: Number, default: 400 },
            medium: { type: Number, default: 500 },
            semibold: { type: Number, default: 600 },
            bold: { type: Number, default: 700 }
        }
    },
    
    // Chat Widget Customization
    chatWidget: {
        position: { type: String, enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'], default: 'bottom-right' },
        size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
        borderRadius: { type: String, default: '12px' },
        shadow: { type: String, default: '0 4px 16px rgba(0,0,0,0.1)' },
        animation: { type: String, enum: ['slide', 'fade', 'bounce', 'scale'], default: 'slide' },
        
        // Chat Bubble
        bubble: {
            backgroundColor: { type: String },
            textColor: { type: String },
            borderRadius: { type: String, default: '50px' },
            size: { type: Number, default: 60 },
            icon: String,
            text: { type: String, default: 'Chat with us' },
            pulseAnimation: { type: Boolean, default: true }
        },
        
        // Chat Window
        window: {
            width: { type: Number, default: 380 },
            height: { type: Number, default: 600 },
            headerBackground: String,
            headerText: String,
            welcomeMessage: { type: String, default: 'Hi! How can we help you today?' },
            placeholderText: { type: String, default: 'Type your message...' },
            sendButtonColor: String
        }
    },
    
    // Portal Customization
    portals: {
        // Admin Portal
        admin: {
            headerTitle: String,
            headerSubtitle: String,
            backgroundGradient: String,
            sidebarStyle: { type: String, enum: ['light', 'dark', 'colored'], default: 'light' },
            cardStyle: { type: String, enum: ['flat', 'elevated', 'outlined'], default: 'elevated' }
        },
        
        // Agent Portal
        agent: {
            headerTitle: String,
            headerSubtitle: String,
            backgroundGradient: String,
            statusColors: {
                online: { type: String, default: '#48bb78' },
                busy: { type: String, default: '#ed8936' },
                away: { type: String, default: '#a0aec0' },
                offline: { type: String, default: '#e53e3e' }
            }
        },
        
        // Customer Portal
        customer: {
            headerTitle: String,
            headerSubtitle: String,
            backgroundGradient: String,
            welcomeTitle: String,
            welcomeDescription: String
        }
    },
    
    // Email Templates
    emailBranding: {
        headerColor: String,
        footerColor: String,
        buttonColor: String,
        textColor: String,
        linkColor: String,
        companyAddress: String,
        unsubscribeText: String,
        socialLinks: [{
            platform: String,
            url: String,
            icon: String
        }]
    },
    
    // Custom CSS
    customCSS: {
        global: String,
        chatWidget: String,
        adminPortal: String,
        agentPortal: String,
        customerPortal: String
    },
    
    // Advanced Settings
    settings: {
        showPoweredBy: { type: Boolean, default: true },
        customFooterText: String,
        language: { type: String, default: 'en' },
        timezone: { type: String, default: 'UTC' },
        dateFormat: { type: String, default: 'MM/DD/YYYY' },
        timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' }
    }
}, {
    timestamps: true
});

// Create CSS variables from branding colors
BrandingSchema.methods.generateCSSVariables = function() {
    const colors = this.colors;
    const typography = this.typography;
    
    return `
        :root {
            /* Colors */
            --brand-primary: ${colors.primary};
            --brand-secondary: ${colors.secondary};
            --brand-accent: ${colors.accent};
            --brand-success: ${colors.success};
            --brand-warning: ${colors.warning};
            --brand-error: ${colors.error};
            --brand-background: ${colors.background};
            --brand-surface: ${colors.surface};
            --brand-text: ${colors.text};
            --brand-text-secondary: ${colors.textSecondary};
            
            /* Typography */
            --brand-font-family: ${typography.fontFamily};
            --brand-font-size-sm: ${typography.fontSize.small};
            --brand-font-size-base: ${typography.fontSize.base};
            --brand-font-size-lg: ${typography.fontSize.large};
            --brand-font-size-xl: ${typography.fontSize.xl};
            --brand-font-size-2xl: ${typography.fontSize['2xl']};
            --brand-font-weight-normal: ${typography.fontWeight.normal};
            --brand-font-weight-medium: ${typography.fontWeight.medium};
            --brand-font-weight-semibold: ${typography.fontWeight.semibold};
            --brand-font-weight-bold: ${typography.fontWeight.bold};
            
            /* Chat Widget */
            --chat-bubble-size: ${this.chatWidget.bubble.size}px;
            --chat-window-width: ${this.chatWidget.window.width}px;
            --chat-window-height: ${this.chatWidget.window.height}px;
            --chat-border-radius: ${this.chatWidget.borderRadius};
            --chat-shadow: ${this.chatWidget.shadow};
        }
    `;
};

// Generate widget configuration
BrandingSchema.methods.generateWidgetConfig = function() {
    return {
        position: this.chatWidget.position,
        size: this.chatWidget.size,
        colors: this.colors,
        bubble: this.chatWidget.bubble,
        window: this.chatWidget.window,
        animation: this.chatWidget.animation,
        customCSS: this.customCSS.chatWidget || ''
    };
};

// Generate portal theme
BrandingSchema.methods.generatePortalTheme = function(portalType) {
    const portal = this.portals[portalType] || {};
    
    return {
        colors: this.colors,
        typography: this.typography,
        logo: this.logo,
        ...portal,
        customCSS: this.customCSS[portalType + 'Portal'] || '',
        settings: this.settings
    };
};

const OrganizationBranding = mongoose.model('OrganizationBranding', BrandingSchema);

module.exports = OrganizationBranding;