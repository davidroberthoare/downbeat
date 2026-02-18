# downbeat
A simple metronome for band leaders

## Overview
Downbeat is a mobile-first Progressive Web App designed for conductors in an orchestra pit. It provides a simple, intuitive interface for managing and playing back songs with precise tempo control.

## Features

### Edit Mode
- **Song Management**: Add, edit, and delete songs with ease
- **Configurable Settings**: Set song name, BPM (20-300), and time signature
- **Quick Playback**: Play individual songs directly from the list
- **Organized List**: View all songs with their tempo and time signature

### Playback Mode
- **Visual Metronome**: Large beat indicator that flashes:
  - Green for the first beat of each bar
  - White for subsequent beats
- **BPM Display**: Large, easy-to-read tempo display
- **Tempo Controls**: Adjust BPM on-the-fly with +/- buttons (increments of 1)
- **Track Navigation**: Move between songs with previous/next buttons
- **Play/Pause**: Control playback without losing your place
- **Return to Edit**: Quick access back to song management

### Technical Features
- **Offline-First**: All data stored locally using browser localStorage
- **PWA Support**: Install as a standalone app on mobile devices
- **Mobile-Optimized**: Designed for touch interfaces and small screens

## Getting Started

### Running Locally
1. Clone this repository
2. Serve the files using any HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open http://localhost:8000 in your browser

### Installing as PWA
1. Open the app in a mobile browser (Chrome, Safari, etc.)
2. Look for the "Add to Home Screen" or "Install" option
3. The app will install and can be launched like a native app

## Usage

### Adding a Song
1. Tap the **+** button in the top-right corner
2. Enter the song name
3. Set the BPM (beats per minute)
4. Configure the time signature (top/bottom numbers)
5. Tap **Save**

### Editing a Song
1. Tap on a song in the list
2. Modify the details
3. Tap **Save** to update, or **Delete Song** to remove

### Starting Playback
1. Tap the **Start Playback** button
2. The metronome will begin immediately
3. Watch the beat indicator flash in time with the music

### During Playback
- **Adjust Tempo**: Use the **+** and **-** buttons
- **Change Songs**: Use the **⏮** and **⏭** buttons
- **Pause/Resume**: Tap the center button
- **Return to Edit**: Tap the **←** button in the top-left

## Development

### Structure
- `index.html` - Main HTML structure
- `app.js` - Application logic
- `styles.css` - Styling and layout
- `manifest.json` - PWA configuration
- `service-worker.js` - Service worker (caching disabled for development)
- `icon-192.svg`, `icon-512.svg` - App icons

### Data Storage
Songs are stored in localStorage under the key `downbeat_songs` as a JSON array.

## Browser Support
- Modern browsers with localStorage support
- Service Worker support for PWA features
- Optimized for mobile Safari and Chrome

## License
See LICENSE file for details.


## Credits

### Libraries
- [Framework7](https://framework7.io/) - Mobile-first UI framework (v8)
- [Framework7 Icons](https://framework7.io/icons/) - Icon font for Framework7 (v5)
- [QRCode.js](https://github.com/davidshimjs/qrcodejs) - QR code generation library (v1.0.0)
- [MessagePack](https://github.com/kawanet/msgpack-lite) - Compact binary encoding library (v0.1.26)

### Icons
- Baton icon by Luis Prado from <a href="https://thenounproject.com/browse/icons/term/baton/" target="_blank" title="Baton Icons">Noun Project</a> (CC BY 3.0)
