# ChatKit Widget Integration Guide

The Lightwave ChatKit Widget is a lightweight, embeddable chat widget that can be easily added to any website to provide AI-powered customer support.

## Quick Start

### 1. Include the Widget Script

Add the widget script to your HTML page before the closing `</body>` tag:

```html
<script src="https://yoursite.com/js/chatkit-widget.js"></script>
```

### 2. Initialize the Widget

Initialize the widget with your configuration:

```html
<script>
  LightwaveChat.init({
    apiUrl: 'https://yoursite.com/api/chatkit',
    organizationId: 'your-organization-id',
    position: 'bottom-right'
  });
</script>
```

That's it! The widget will appear as a floating chat button on your page.

## Configuration Options

The `init()` method accepts a configuration object with these options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | string | `/api/chatkit` | ChatKit API endpoint URL |
| `organizationId` | string | `lightwave` | Your organization identifier |
| `position` | string | `bottom-right` | Widget position: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `theme` | string | `lightwave` | Widget theme/styling |
| `autoOpen` | boolean | `false` | Automatically open widget after page load |
| `showNotification` | boolean | `true` | Show notification badge on new messages |
| `zIndex` | number | `999999` | CSS z-index for widget positioning |

### Example with All Options

```javascript
LightwaveChat.init({
  apiUrl: 'https://api.yourcompany.com/chatkit',
  organizationId: 'acme-corp',
  position: 'bottom-left',
  theme: 'custom',
  autoOpen: false,
  showNotification: true,
  zIndex: 1000000
});
```

## Widget API

Once initialized, you can programmatically control the widget:

### Methods

```javascript
// Open the chat widget
LightwaveChat.open();

// Close the chat widget
LightwaveChat.close();

// Toggle widget open/close
LightwaveChat.toggle();

// Start chat with specific department
LightwaveChat.startChat('technical'); // 'sales', 'support', 'billing', 'general'

// Send a message (requires active session)
LightwaveChat.sendMessage('Hello, I need help');

// Show notification badge
LightwaveChat.showNotification();

// Hide notification badge
LightwaveChat.hideNotification();

// Retry connection if failed
LightwaveChat.retry();
```

### Status Methods

```javascript
// Check if widget is open
console.log(LightwaveChat.isOpen()); // true/false

// Check if service is online
console.log(LightwaveChat.isOnline()); // true/false

// Get current configuration
console.log(LightwaveChat.config()); // Returns config object
```

## Department Configuration

The widget supports routing to different departments:

- **sales** - Product information, pricing, demos
- **technical** - Installation, troubleshooting, configuration
- **support** - General customer service and account help
- **billing** - Payment questions and account management
- **general** - Default department for general inquiries

## Styling and Customization

### Custom Positioning

Use CSS to override widget positioning:

```css
#lightwave-chat-widget {
  bottom: 100px !important; /* Move higher from bottom */
  right: 50px !important;   /* Move further from right edge */
}
```

### Custom Colors

Override the default color scheme:

```css
.lwcw-toggle-button {
  background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%) !important;
}

.lwcw-header {
  background: linear-gradient(135deg, #your-color1 0%, #your-color2 100%) !important;
}
```

### Hide Widget on Specific Pages

```javascript
// Conditionally initialize based on page
if (window.location.pathname !== '/checkout') {
  LightwaveChat.init({
    // your config
  });
}
```

## Mobile Responsive

The widget automatically adapts to mobile devices:
- On screens < 480px wide, the chat window expands to nearly full screen
- Touch-friendly button sizing and interactions
- Optimized typography and spacing

## Integration Examples

### WordPress

```php
// Add to functions.php
function add_chatkit_widget() {
    ?>
    <script src="<?php echo get_template_directory_uri(); ?>/js/chatkit-widget.js"></script>
    <script>
      LightwaveChat.init({
        apiUrl: '<?php echo home_url('/api/chatkit'); ?>',
        organizationId: 'my-wp-site'
      });
    </script>
    <?php
}
add_action('wp_footer', 'add_chatkit_widget');
```

### React

```jsx
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Load widget script
    const script = document.createElement('script');
    script.src = '/js/chatkit-widget.js';
    script.onload = () => {
      window.LightwaveChat.init({
        apiUrl: '/api/chatkit',
        organizationId: 'my-react-app'
      });
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
      document.body.removeChild(script);
    };
  }, []);

  return <div className="App">{/* Your app content */}</div>;
}
```

### Shopify

```html
<!-- Add to theme.liquid before </body> -->
<script src="{{ 'chatkit-widget.js' | asset_url }}"></script>
<script>
  LightwaveChat.init({
    apiUrl: 'https://your-backend.herokuapp.com/api/chatkit',
    organizationId: '{{ shop.permanent_domain }}'
  });
</script>
```

## Events and Callbacks

Track widget usage with custom events:

```javascript
// Override methods to add tracking
const originalOpen = LightwaveChat.open;
LightwaveChat.open = function() {
  // Track widget open
  gtag('event', 'chat_widget_opened');
  return originalOpen.apply(this, arguments);
};
```

## Troubleshooting

### Widget Not Appearing

1. Check browser console for JavaScript errors
2. Verify the widget script is loading correctly
3. Ensure `LightwaveChat` is defined in global scope
4. Check if CSS z-index conflicts with your site

### Connection Issues

1. Verify `apiUrl` points to correct ChatKit endpoint
2. Check CORS configuration on your server
3. Ensure ChatKit API is running and accessible
4. Check browser network tab for failed requests

### Mobile Issues

1. Ensure viewport meta tag is present: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
2. Check for conflicting CSS that might hide the widget on mobile
3. Verify touch events aren't being prevented by other scripts

## Performance Considerations

- The widget script is ~15KB minified
- Loads asynchronously without blocking page render
- Establishes connection only when first opened
- Minimal DOM manipulation and event listeners

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security

- All communications use HTTPS
- User messages are processed server-side
- No persistent local storage of sensitive data
- XSS protection through HTML escaping

## Need Help?

For integration support or customization requests:
- Check the demo page at `/widget-demo.html`
- Review the full widget source at `/js/chatkit-widget.js`
- Test functionality at `/chatkit-widget.html`

## License

This widget is part of the Lightwave ChatKit system. See main project license for terms.