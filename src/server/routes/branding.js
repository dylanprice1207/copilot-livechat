const express = require('express');
const router = express.Router();
const OrganizationBranding = require('../models/OrganizationBranding');
const Organization = require('../models/Organization');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Subscription validation middleware
const validateProfessionalAccess = async (req, res, next) => {
    try {
        const { orgSlug } = req.params;
        
        // Find organization
        const organization = await Organization.findOne({ slug: orgSlug, isActive: true });
        if (!organization) {
            return res.status(404).json({ 
                error: 'Organization not found',
                code: 'ORG_NOT_FOUND'
            });
        }
        
        // Check subscription plan
        const subscription = organization.subscription || {};
        const plan = subscription.plan || 'free';
        const status = subscription.status || 'inactive';
        
        // Define plans that have branding access
        const allowedPlans = ['professional', 'pro', 'enterprise', 'premium'];
        
        console.log(`🔒 Branding access check for ${orgSlug}: plan=${plan}, status=${status}`);
        
        // Check if plan allows branding features
        if (!allowedPlans.includes(plan.toLowerCase()) || status !== 'active') {
            console.log(`❌ Branding access denied for ${orgSlug}: plan=${plan}, status=${status}`);
            return res.status(403).json({
                error: 'Branding features require a Professional plan or higher',
                code: 'SUBSCRIPTION_REQUIRED',
                currentPlan: plan,
                subscriptionStatus: status,
                requiredPlans: allowedPlans,
                upgradeUrl: `/api/subscription/upgrade?org=${orgSlug}`
            });
        }
        
        console.log(`✅ Branding access granted for ${orgSlug}: plan=${plan}, status=${status}`);
        
        // Store organization in request for downstream use
        req.organization = organization;
        next();
        
    } catch (error) {
        console.error('Error validating subscription access:', error);
        res.status(500).json({ 
            error: 'Failed to validate subscription access',
            code: 'VALIDATION_ERROR'
        });
    }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../../uploads/branding');
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg|ico/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Get organization branding
router.get('/:orgSlug/branding', validateProfessionalAccess, async (req, res) => {
    try {
        const organization = req.organization; // Already validated by middleware
        
        // Get branding or create default
        let branding = await OrganizationBranding.findOne({ organizationId: organization._id });
        
        if (!branding) {
            branding = new OrganizationBranding({
                organizationId: organization._id
            });
            await branding.save();
        }
        
        res.json({
            success: true,
            branding,
            cssVariables: branding.generateCSSVariables(),
            widgetConfig: branding.generateWidgetConfig()
        });
        
    } catch (error) {
        console.error('Error fetching branding:', error);
        res.status(500).json({ error: 'Failed to fetch branding' });
    }
});

// Update organization branding
router.put('/:orgSlug/branding', validateProfessionalAccess, async (req, res) => {
    try {
        const organization = req.organization; // Already validated by middleware
        const updates = req.body;
        
        // Update or create branding
        let branding = await OrganizationBranding.findOneAndUpdate(
            { organizationId: organization._id },
            { $set: updates },
            { new: true, upsert: true }
        );
        
        res.json({
            success: true,
            message: 'Branding updated successfully',
            branding,
            cssVariables: branding.generateCSSVariables(),
            widgetConfig: branding.generateWidgetConfig()
        });
        
    } catch (error) {
        console.error('Error updating branding:', error);
        res.status(500).json({ error: 'Failed to update branding' });
    }
});

// Upload logo
router.post('/:orgSlug/branding/logo', validateProfessionalAccess, upload.single('logo'), async (req, res) => {
    try {
        const organization = req.organization; // Already validated by middleware
        
        if (!req.file) {
            return res.status(400).json({ error: 'No logo file provided' });
        }
        
        // Generate logo URL
        const logoUrl = `/uploads/branding/${req.file.filename}`;
        
        // Update branding
        let branding = await OrganizationBranding.findOneAndUpdate(
            { organizationId: organization._id },
            { 
                $set: { 
                    'logo.url': logoUrl,
                    'logo.alt': req.body.alt || organization.name + ' Logo'
                }
            },
            { new: true, upsert: true }
        );
        
        res.json({
            success: true,
            message: 'Logo uploaded successfully',
            logoUrl,
            branding
        });
        
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// Upload favicon
router.post('/:orgSlug/branding/favicon', validateProfessionalAccess, upload.single('favicon'), async (req, res) => {
    try {
        const organization = req.organization; // Already validated by middleware
        
        if (!req.file) {
            return res.status(400).json({ error: 'No favicon file provided' });
        }
        
        // Generate favicon URL
        const faviconUrl = `/uploads/branding/${req.file.filename}`;
        
        // Update branding
        let branding = await OrganizationBranding.findOneAndUpdate(
            { organizationId: organization._id },
            { $set: { 'favicon.url': faviconUrl } },
            { new: true, upsert: true }
        );
        
        res.json({
            success: true,
            message: 'Favicon uploaded successfully',
            faviconUrl,
            branding
        });
        
    } catch (error) {
        console.error('Error uploading favicon:', error);
        res.status(500).json({ error: 'Failed to upload favicon' });
    }
});

// Get widget configuration for embedding
router.get('/:orgSlug/widget-config', async (req, res) => {
    try {
        const { orgSlug } = req.params;
        
        // Find organization
        const organization = await Organization.findOne({ slug: orgSlug, isActive: true });
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        
        // Get branding
        let branding = await OrganizationBranding.findOne({ organizationId: organization._id });
        
        if (!branding) {
            branding = new OrganizationBranding({
                organizationId: organization._id
            });
        }
        
        const widgetConfig = branding.generateWidgetConfig();
        
        res.json({
            success: true,
            organizationName: organization.name,
            organizationSlug: orgSlug,
            config: widgetConfig,
            cssVariables: branding.generateCSSVariables()
        });
        
    } catch (error) {
        console.error('Error fetching widget config:', error);
        res.status(500).json({ error: 'Failed to fetch widget configuration' });
    }
});

// Get portal theme
router.get('/:orgSlug/theme/:portalType', async (req, res) => {
    try {
        const { orgSlug, portalType } = req.params;
        
        // Validate portal type
        const validPortals = ['admin', 'agent', 'customer'];
        if (!validPortals.includes(portalType)) {
            return res.status(400).json({ error: 'Invalid portal type' });
        }
        
        // Find organization
        const organization = await Organization.findOne({ slug: orgSlug, isActive: true });
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        
        // Get branding
        let branding = await OrganizationBranding.findOne({ organizationId: organization._id });
        
        if (!branding) {
            branding = new OrganizationBranding({
                organizationId: organization._id
            });
        }
        
        const theme = branding.generatePortalTheme(portalType);
        
        res.json({
            success: true,
            organizationName: organization.name,
            organizationSlug: orgSlug,
            portalType,
            theme,
            cssVariables: branding.generateCSSVariables()
        });
        
    } catch (error) {
        console.error('Error fetching portal theme:', error);
        res.status(500).json({ error: 'Failed to fetch portal theme' });
    }
});

// Preview branding changes
router.post('/:orgSlug/branding/preview', validateProfessionalAccess, async (req, res) => {
    try {
        const organization = req.organization; // Already validated by middleware
        const previewData = req.body;
        
        // Create temporary branding instance for preview
        const tempBranding = new OrganizationBranding({
            organizationId: organization._id,
            ...previewData
        });
        
        res.json({
            success: true,
            preview: {
                cssVariables: tempBranding.generateCSSVariables(),
                widgetConfig: tempBranding.generateWidgetConfig(),
                adminTheme: tempBranding.generatePortalTheme('admin'),
                agentTheme: tempBranding.generatePortalTheme('agent'),
                customerTheme: tempBranding.generatePortalTheme('customer')
            }
        });
        
    } catch (error) {
        console.error('Error generating preview:', error);
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});

// Reset branding to defaults
router.post('/:orgSlug/branding/reset', validateProfessionalAccess, async (req, res) => {
    try {
        const organization = req.organization; // Already validated by middleware
        
        // Delete existing branding and create new default
        await OrganizationBranding.findOneAndDelete({ organizationId: organization._id });
        
        const branding = new OrganizationBranding({
            organizationId: organization._id
        });
        await branding.save();
        
        res.json({
            success: true,
            message: 'Branding reset to defaults',
            branding,
            cssVariables: branding.generateCSSVariables(),
            widgetConfig: branding.generateWidgetConfig()
        });
        
    } catch (error) {
        console.error('Error resetting branding:', error);
        res.status(500).json({ error: 'Failed to reset branding' });
    }
});

// Export branding configuration
router.get('/:orgSlug/branding/export', validateProfessionalAccess, async (req, res) => {
    try {
        const organization = req.organization; // Already validated by middleware
        
        // Get branding
        const branding = await OrganizationBranding.findOne({ organizationId: organization._id });
        
        if (!branding) {
            return res.status(404).json({ error: 'No branding configuration found' });
        }
        
        // Export configuration
        const exportData = {
            organizationName: organization.name,
            organizationSlug: organization.slug,
            exportDate: new Date().toISOString(),
            branding: branding.toObject(),
            cssVariables: branding.generateCSSVariables(),
            widgetConfig: branding.generateWidgetConfig()
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${organization.slug}-branding-export.json"`);
        res.json(exportData);
        
    } catch (error) {
        console.error('Error exporting branding:', error);
        res.status(500).json({ error: 'Failed to export branding' });
    }
});

// Import branding configuration
router.post('/:orgSlug/branding/import', validateProfessionalAccess, upload.single('brandingFile'), async (req, res) => {
    try {
        const organization = req.organization; // Already validated by middleware
        
        if (!req.file) {
            return res.status(400).json({ error: 'No branding file provided' });
        }
        
        // Read and parse the imported file
        const fileContent = await fs.readFile(req.file.path, 'utf8');
        const importData = JSON.parse(fileContent);
        
        // Validate import data
        if (!importData.branding) {
            return res.status(400).json({ error: 'Invalid branding file format' });
        }
        
        // Update branding with imported data
        const branding = await OrganizationBranding.findOneAndUpdate(
            { organizationId: organization._id },
            { $set: importData.branding },
            { new: true, upsert: true }
        );
        
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        
        res.json({
            success: true,
            message: 'Branding imported successfully',
            branding,
            cssVariables: branding.generateCSSVariables(),
            widgetConfig: branding.generateWidgetConfig()
        });
        
    } catch (error) {
        console.error('Error importing branding:', error);
        res.status(500).json({ error: 'Failed to import branding' });
    }
});

module.exports = router;