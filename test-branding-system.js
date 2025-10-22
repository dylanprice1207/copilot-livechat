require('dotenv').config();
const mongoose = require('mongoose');
const database = require('./src/config/database');

// Import models
const Organization = require('./src/server/models/Organization');
const OrganizationBranding = require('./src/server/models/OrganizationBranding');

async function testBrandingSystem() {
    try {
        console.log('🎨 Testing ConvoAI Branding System...');
        
        // Connect to database
        await database.connect();
        console.log('✅ Database connected');
        
        // Find or create a test organization
        let testOrg = await Organization.findOne({ slug: 'test-branding' });
        
        if (!testOrg) {
            testOrg = new Organization({
                name: 'Test Branding Company',
                slug: 'test-branding',
                domain: 'test-branding.local',
                isActive: true,
                subscription: {
                    plan: 'professional', // Change this to 'free' to test restrictions
                    status: 'active'
                }
            });
            await testOrg.save();
            console.log('✅ Test organization created:', testOrg.slug);
        } else {
            console.log('✅ Test organization found:', testOrg.slug);
        }
        
        // Create default branding
        let branding = await OrganizationBranding.findOne({ organizationId: testOrg._id });
        
        if (!branding) {
            branding = new OrganizationBranding({
                organizationId: testOrg._id,
                colors: {
                    primary: '#4299e1',
                    secondary: '#6c757d',
                    accent: '#17a2b8',
                    success: '#28a745',
                    warning: '#ffc107',
                    error: '#dc3545',
                    background: '#ffffff',
                    surface: '#f8f9fa',
                    textPrimary: '#212529',
                    textSecondary: '#6c757d'
                },
                typography: {
                    primaryFont: 'system-ui, -apple-system, sans-serif',
                    headingFont: '',
                    baseFontSize: 16,
                    lineHeight: 1.5
                },
                chatWidget: {
                    position: 'bottom-right',
                    size: 'medium',
                    title: 'Chat with Test Company',
                    welcomeMessage: 'Hi! Welcome to Test Branding Company. How can we help you today?',
                    placeholderText: 'Type your message...',
                    bubbleText: 'Need help? Chat with us!',
                    bubbleEnabled: true
                },
                portalThemes: {
                    admin: {
                        darkSidebar: true,
                        darkNavbar: false,
                        borderRadius: 8,
                        enableShadows: true
                    },
                    agent: {
                        compactChat: false,
                        darkSidebar: false,
                        soundEnabled: true,
                        autoStatus: true
                    },
                    customer: {
                        layoutStyle: 'modern',
                        roundedCorners: true,
                        typingIndicator: true,
                        readReceipts: true
                    }
                }
            });
            await branding.save();
            console.log('✅ Default branding created');
        } else {
            console.log('✅ Branding configuration found');
        }
        
        // Test branding methods
        console.log('\n🎨 Testing branding methods...');
        
        const cssVariables = branding.generateCSSVariables();
        console.log('CSS Variables:', Object.keys(cssVariables).length, 'variables generated');
        
        const widgetConfig = branding.generateWidgetConfig();
        console.log('Widget Config:', JSON.stringify(widgetConfig, null, 2));
        
        const adminTheme = branding.generatePortalTheme('admin');
        console.log('Admin Theme:', Object.keys(adminTheme).length, 'properties');
        
        console.log('\n✅ Branding system test completed successfully!');
        
        console.log('\n🔗 Test URLs:');
        console.log(`   Organization Admin: http://localhost:3000/test-branding/admin`);
        console.log(`   Brand Manager: http://localhost:3000/test-branding/brand-manager`);
        console.log(`   Widget Preview: http://localhost:3000/test-branding/widget-preview`);
        console.log(`   Widget Config API: http://localhost:3000/api/branding/test-branding/widget-config`);
        
    } catch (error) {
        console.error('❌ Error testing branding system:', error);
    } finally {
        process.exit(0);
    }
}

testBrandingSystem();