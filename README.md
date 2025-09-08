# Lightspeed eCom Custom App - Wholesale & Category Banner

This custom app provides two main functionalities:
1. **Wholesale Price Control**: Shows/hides prices based on customer login status
2. **Category Banner with Text Overlay**: Transforms category pages into full-width banners with overlaid description text

## Files Overview

- `app.js` - Main JavaScript file (hosted at: https://keryxsolutions.github.io/lightspeed-wholesale/app.js)
- `app.css` - CSS styles file (request Lightspeed to add: https://keryxsolutions.github.io/lightspeed-wholesale/app.css)
- `index.html` - Test interface for API functions

## Category Banner Setup

### Prerequisites
1. **Lightspeed eCom store design settings:**
   - Navigate to: `Design > Category name position`
   - Select: **"Hide category names"** (essential for banner effect)

2. **Category requirements:**
   - Category must have both an **image** and **description** set
   - Image should be high-resolution (recommended: 1920x400px or larger)
   - Description supports HTML formatting (bold, italic, etc.)

### Current Status
- ✅ JavaScript functionality: Complete and integrated into app.js
- ⏳ CSS file: Created but needs to be linked by Lightspeed support
- 🔄 Fallback: CSS is dynamically loaded via JavaScript until external CSS is linked

### Request for Lightspeed Support
Contact Lightspeed API Support to add CSS URL to your custom app:
- **App ID**: [Your App ID]
- **Store ID**: [Your Store ID] 
- **Request**: Add `customCssUrl`: `https://keryxsolutions.github.io/lightspeed-wholesale/app.css`

### Expected Results
After setup, category pages will display:
- Full-width banner image (400px height, responsive)
- Centered text overlay with semi-transparent background
- Custom font: "Cormorant Garamond" at 32px
- Preserved HTML formatting (bold, italic)
- Hidden default category titles
- Mobile responsive design

### Font Specification
```css
font-family: "Cormorant Garamond", system-ui, "Segoe UI", Roboto, Arial, sans-serif;
font-size: 32px;
```

### CSS Features
- Full viewport width banner effect
- Responsive breakpoints: 1024px, 768px, 480px
- Text overlay with backdrop blur effect
- Automatic Google Fonts loading
- Cross-theme compatibility
- Fallback inline styles if external CSS fails

### Troubleshooting

**Banner not appearing:**
1. Check browser console for errors
2. Verify category has both image and description
3. Ensure "Hide category names" is selected in design settings
4. Check if category description contains actual text content

**Text formatting issues:**
1. Use HTML in category description: `<strong>Bold</strong>` `<em>Italic</em>`
2. Font will fallback to system fonts if Google Fonts fail to load
3. Text color is fixed to white with text-shadow for visibility

**Mobile display issues:**
1. Banner automatically adjusts height on mobile devices
2. Text size scales down responsively
3. Overlay padding adjusts for smaller screens

### Deployment Checklist
- [ ] Upload updated app.js to GitHub Pages
- [ ] Upload app.css to GitHub Pages  
- [ ] Request CSS URL addition from Lightspeed support
- [ ] Set category name position to "Hide category names"
- [ ] Test with categories that have both image and description
- [ ] Verify mobile responsiveness
- [ ] Check cross-browser compatibility

### Development Notes
- Script uses MutationObserver for dynamic content detection
- Multiple selector fallbacks for theme compatibility
- Error handling and logging for debugging
- Graceful fallbacks if external resources fail to load
- Preserves existing wholesale functionality

## Wholesale Functionality
The app continues to provide wholesale price control:
- Logged-in users: Prices and buy buttons visible
- Guest users: Prices and buy buttons hidden
- CSS safety net prevents dynamic price display

## Testing
Use the included `index.html` for API testing and order creation functionality.