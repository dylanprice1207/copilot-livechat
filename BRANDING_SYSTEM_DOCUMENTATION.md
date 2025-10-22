# ConvoAI Custom Branding System Documentation

## Overview

The ConvoAI Custom Branding System provides comprehensive white-labeling capabilities for organizations with **Professional plans or higher**, allowing them to customize the appearance and behavior of all portals, chat widgets, and customer-facing interfaces.

## 🔒 Subscription Requirements

**IMPORTANT:** Branding features are restricted to Professional plans and higher.

- ✅ **Professional, Enterprise, Premium plans**: Full branding access
- ❌ **Free, Basic plans**: Branding features blocked
- ❌ **Inactive subscriptions**: All branding features disabled

### Access Control
- API endpoints return `403 Forbidden` for non-professional plans
- Brand manager UI shows upgrade prompt for restricted plans
- Widget configuration remains accessible (read-only) for all plans
- Portal themes return default configuration for restricted plans

## Architecture

### Core Components

1. **OrganizationBranding Model** (`src/server/models/OrganizationBranding.js`)
   - MongoDB schema for storing branding configurations
   - Includes colors, typography, logos, chat widget settings, portal themes
   - Built-in methods for generating CSS variables and configurations

2. **Branding API Routes** (`src/server/routes/branding.js`)
   - RESTful API for managing branding configurations
   - File upload support for logos and assets
   - Export/import functionality for branding configurations

3. **Brand Manager UI** (`public/brand-manager.html`)
   - Complete administrative interface for customizing branding
   - Real-time preview capabilities
   - Color picker integration with Pickr.js

4. **Widget Preview System** (`public/widget-preview.html`)
   - Live preview of chat widget with customization options
   - Loads branding from API for accurate testing

## Features

### 1. Color Customization
- Primary, secondary, and accent colors
- Status colors (success, warning, error)
- Background and surface colors
- Text colors (primary and secondary)
- Automatic CSS variable generation

### 2. Typography Control
- Primary and heading font families
- Base font size and line height settings
- Google Fonts integration support
- Real-time font preview

### 3. Logo & Asset Management
- Logo upload with automatic resizing
- Favicon support
- File upload with validation
- Secure asset storage

### 4. Chat Widget Customization
- Position settings (4 corners)
- Size options (small, medium, large)
- Custom bubble text and styling
- Welcome message customization
- Placeholder text configuration
- Show/hide bubble toggle

### 5. Portal Theme Management
- **Admin Portal**: Dark sidebar, navbar options, border radius, shadows
- **Agent Portal**: Compact chat, dark theme, sound settings, auto-status
- **Customer Portal**: Layout styles, rounded corners, typing indicators, read receipts

### 6. Advanced Features
- Custom CSS injection
- CSS variable system for consistent theming
- Export/import branding configurations
- Preview system with live updates
- Reset to defaults functionality

## API Endpoints

### Branding Management
- `GET /api/branding/:orgSlug/branding` - Get organization branding
- `PUT /api/branding/:orgSlug/branding` - Update branding settings
- `POST /api/branding/:orgSlug/branding/reset` - Reset to defaults

### Asset Upload
- `POST /api/branding/:orgSlug/branding/logo` - Upload logo
- `POST /api/branding/:orgSlug/branding/favicon` - Upload favicon

### Configuration & Preview
- `GET /api/branding/:orgSlug/widget-config` - Get widget configuration
- `GET /api/branding/:orgSlug/theme/:portalType` - Get portal theme
- `POST /api/branding/:orgSlug/branding/preview` - Preview changes

### Import/Export
- `GET /api/branding/:orgSlug/branding/export` - Export branding configuration
- `POST /api/branding/:orgSlug/branding/import` - Import branding configuration

## URL Structure

Organizations can access branding features through their dedicated URLs:

- `/{orgSlug}/admin` - Organization admin portal (with Brand Management link)
- `/{orgSlug}/brand-manager` - Full brand management interface
- `/{orgSlug}/widget-preview` - Live widget preview and testing

## Technical Implementation

### Database Schema
```javascript
OrganizationBranding {
  organizationId: ObjectId,
  colors: {
    primary, secondary, accent, success, warning, error,
    background, surface, textPrimary, textSecondary
  },
  typography: {
    primaryFont, headingFont, baseFontSize, lineHeight
  },
  logo: { url, alt },
  favicon: { url },
  chatWidget: {
    position, size, title, welcomeMessage, placeholderText,
    bubbleText, bubbleEnabled
  },
  portalThemes: {
    admin: { darkSidebar, darkNavbar, borderRadius, enableShadows },
    agent: { compactChat, darkSidebar, soundEnabled, autoStatus },
    customer: { layoutStyle, roundedCorners, typingIndicator, readReceipts }
  },
  customCSS: String
}
```

### CSS Variable Generation
The system automatically generates CSS variables that can be used throughout the application:
- `--primary-color`, `--secondary-color`, etc.
- `--font-family`, `--heading-font-family`
- `--border-radius`, `--base-font-size`

### Widget Configuration
Chat widgets receive configuration objects that include:
- Position and size settings
- Color scheme
- Text content and messaging
- Animation preferences
- Custom styling

## Usage Examples

### Basic Branding Setup
1. Access `/{orgSlug}/brand-manager`
2. Configure colors using the color picker
3. Upload logo and favicon
4. Customize chat widget settings
5. Save changes and preview

### API Integration
```javascript
// Get widget configuration
const response = await fetch('/api/branding/my-org/widget-config');
const { config, cssVariables } = await response.json();

// Apply branding to widget
Object.keys(cssVariables).forEach(key => {
  document.documentElement.style.setProperty(key, cssVariables[key]);
});
```

### Custom CSS Integration
```css
/* Use branding variables in custom CSS */
.my-button {
  background-color: var(--primary-color);
  border-radius: var(--border-radius);
  font-family: var(--font-family);
}
```

## Security Considerations

- File upload validation for images only
- Maximum file size limits (5MB)
- Organization-scoped access control
- Secure asset storage in `/uploads/branding/`
- Input sanitization for custom CSS

## Future Enhancements

- [ ] Advanced theme templates
- [ ] Brand asset library
- [ ] Multi-language branding support
- [ ] Advanced animation controls
- [ ] Brand guideline compliance checking
- [ ] Bulk branding operations
- [ ] Integration with external asset management

## Testing

Use the test script to verify branding functionality:
```bash
node test-branding-system.js
```

This creates a test organization and validates all branding features.

## Support

For issues or questions regarding the branding system:
1. Check the browser console for error messages
2. Verify organization permissions
3. Ensure assets meet size and format requirements
4. Test with the widget preview system
5. Use export/import for configuration backup/restore

The branding system is designed to provide complete white-labeling capabilities while maintaining ease of use and comprehensive customization options.