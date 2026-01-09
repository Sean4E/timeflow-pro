# TimeFlow Pro

A modern, feature-rich time tracking Progressive Web App (PWA) for freelancers and professionals.

## Features

### Core Time Tracking
- **Clock In/Out** - One-tap time tracking with live duration display
- **Break System** - Pause and resume sessions without losing progress
- **Manual Entries** - Add time entries retroactively
- **Project Management** - Organize time by projects with color coding

### Smart Features
- **Global Rates** - Set a default hourly rate that auto-populates new projects
- **Theme Customization** - Choose any accent color to personalize the app
- **Calendar Views** - Month, week, and day views for easy navigation
- **Predictions** - See projected earnings based on current pace

### Reporting
- **Detailed Reports** - View hours by project, daily breakdowns, and earnings
- **Payment Blocks** - Track sent reports as payment periods
- **Multiple Recipients** - Send reports to clients/managers via email or SMS
- **Flexible Layers** - Control what information each recipient sees (hours only, with rates, detailed entries, etc.)

### Settings
- Multiple currency support (EUR, USD, GBP, etc.)
- Date format options (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- 12/24 hour time format
- Week start day preference
- Full data export/import (JSON)

## Installation

### As a PWA (Recommended)
1. Visit the app URL in a modern browser
2. Click "Install" or "Add to Home Screen"
3. The app will work offline and feel like a native app

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/timeflow-pro.git

# Navigate to the project
cd timeflow-pro

# Serve with any static file server
npx serve
# or
python -m http.server 8000
```

## Project Structure

```
timeflow-pro/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for offline support
├── css/
│   └── styles.css     # All styles with CSS variables
├── js/
│   └── app.js         # Application logic
├── icons/
│   ├── favicon.svg    # SVG favicon
│   ├── icon-192.svg   # PWA icon (192x192)
│   └── icon-512.svg   # PWA icon (512x512)
└── README.md
```

## Data Storage

All data is stored locally in the browser using `localStorage`. Data structure:

```javascript
{
  projects: [],      // Project definitions
  entries: [],       // Time entries
  recipients: [],    // Report recipients
  sentReports: [],   // History of sent reports
  settings: {
    currency: 'EUR',
    accentColor: '#6366f1',
    globalRate: 0,
    // ...
  }
}
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- Fonts: [DM Sans](https://fonts.google.com/specimen/DM+Sans) & [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- Design: Glassmorphism with dark theme
