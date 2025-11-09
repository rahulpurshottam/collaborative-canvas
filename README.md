# Collaborative Canvas

A multi-user drawing application with real-time synchronization built using Vanilla JavaScript and WebSockets.

## Setup Instructions

```bash
npm install && npm start
```

The application will be available at `http://localhost:3000`

## How to Test with Multiple Users

### Option 1: Same Computer
1. Open `http://localhost:3000` in Chrome
2. Enter a username (e.g., "Alice") and room ID (e.g., "room1")
3. Click "Join Room"
4. Open `http://localhost:3000` in Firefox or Chrome Incognito
5. Enter a different username (e.g., "Bob") and the same room ID ("room1")
6. Click "Join Room"
7. Draw in one browser - it will appear in real-time in the other browser

### Option 2: Different Computers (Same Network)
1. Find your computer's IP address:
   ```bash
   hostname -I | awk '{print $1}'
   ```
2. On Computer 1: Open `http://localhost:3000`
3. On Computer 2: Open `http://YOUR_IP:3000`
4. Both join the same room ID
5. Draw simultaneously and test undo/redo functionality

### What to Test
- **Real-time Drawing**: Draw in one window, see it appear instantly in others
- **Cursor Tracking**: Move your mouse, see your cursor in other windows
- **Global Undo**: Click undo in any window, last operation disappears for everyone
- **Global Redo**: Click redo to restore the last undone operation for everyone
- **Clear Canvas**: Click clear in any window, canvas clears for everyone
- **User Management**: See online users list with assigned colors

## Known Limitations/Bugs

1. **No Persistence**: Canvas state is lost when all users disconnect from a room
2. **No Authentication**: Anyone can join any room with any username
3. **Memory Usage**: Long drawing sessions with many operations may consume significant memory
4. **Network Dependency**: Requires stable internet connection for smooth experience
5. **No Drawing History Export**: Cannot save or export the canvas as an image
6. **Room Cleanup**: Empty rooms are not automatically cleaned up (remains in memory until server restart)
7. **Browser Compatibility**: Some features may not work on browsers older than Chrome 90, Firefox 88, or Safari 14
8. **Concurrent Undo/Redo**: Rapid undo/redo clicks from multiple users simultaneously may cause brief visual inconsistencies (resolves after network sync)

## Time Spent on the Project

**Total Time**: Approximately 6-8 hours

**Breakdown**:
- Project Setup & Architecture Planning: 1 hour
- Backend Implementation (Server, Rooms, State Management): 2 hours
- Frontend Implementation (Canvas Engine, WebSocket Client, UI): 2.5 hours
- Undo/Redo System Implementation: 1.5 hours
- Testing & Bug Fixes: 1 hour
- Documentation: 1-2 hours
