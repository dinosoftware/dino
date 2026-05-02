# Changelog

All notable changes to Dino Music App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-05-01

### Added
- **Download Artist Discography**: New option in artist menu to download all albums by an artist
- **Download Queue with Concurrency Control**: Manual queue system that properly respects the max concurrent downloads setting
  - Tracks are queued and started one at a time, only up to the configured limit
  - Storage limit is checked before each track starts, not just at the beginning
- **Persistent Download Groups**: Album and playlist groupings now survive app restarts via metadata file
- **Active Downloads View**: Downloads screen shows downloading groups, active tracks, and queued tracks in one unified section
- **Cancel All**: Properly cancels everything — active nitro downloads, JS queue, and pending groups

### Changed
- **Player Engine**: Replaced `react-native-track-player` with `react-native-nitro-player` for all audio playback
  - Gapless playback with precache system (resolves next track URLs at 50% progress)
  - Surgical queue sync — only updates changed tracks instead of full rebuild
  - Track IDs encode queue index for reliable position tracking
- **Download System Overhaul**: Replaced expo-file-system downloads with native nitro DownloadManager
  - Background downloads via WorkManager (continues when app is minimized)
  - Full track metadata (including cover art) stored in download payload for offline hydration
  - Lazy URL resolution — streaming URLs only fetched when a download slot opens (reduces API spam)
  - Lyrics still downloaded via expo-file-system alongside audio files
- **Download Deletion**: Deleting an album/playlist now properly removes the actual audio files
  - Shared tracks between multiple albums/playlists are detected and preserved
- **Downloads Screen Performance**: Polling optimized to prevent lag with many downloads
  - 2-second poll interval with reference equality checks to skip unnecessary re-renders
  - Groups and queued tracks only update when data actually changes
- **Progress Updates**: Throttled to 250ms intervals to reduce JS bridge overhead

### Fixed
- **Quality Indicator Missing on Fresh Open**: Streaming info now updates when restoring queue from server/local storage on app launch
- **Downloads Disappearing on Revisit**: All data types (groups, active tasks, queued tracks) now load on first poll instead of skipping
- **Album Covers Missing After Restart**: Hydration now resolves cover art URLs from track metadata and server
- **Concurrent Downloads Not Respected**: Native `downloadPlaylist()` API ignored the setting — switched to manual `downloadTrack()` calls with JS-side concurrency control
- **Cancel All Not Working**: Previous implementation only cancelled nitro-level tasks while JS queue kept starting new ones
- **Download Storage Spam**: Removed error throws on storage limit — downloads now silently stop when limit is hit
- **FullPlayer/MiniPlayer Freeze**: Zustand selector fixes across multiple components to prevent infinite re-renders
- **Downloaded Track Cover Art**: Always uses remote URLs for artwork (local file URIs don't work as artwork sources)

### Removed
- `react-native-track-player` and all related code
- Old download persistence via AsyncStorage (now uses nitro's native storage + JSON metadata file)

## [2.6.0] - 2026-04-26

### Added
- **Playlist Track Reorder**: Edit mode for playlists with drag-to-reorder
  - "Edit Playlist" option in playlist menu activates edit mode
  - Drag handles for reordering tracks, X buttons for removing tracks
  - Saves changes to server via `updatePlaylist` API
  - Cancel/Done buttons replace Play/Shuffle in edit mode
- **Dynamic Color Background Style**: New "Dynamic Color" option that shows a solid color extracted from cover art
  - "Dynamic Gradient" now renders an actual `LinearGradient` with album colors (was previously a flat color)
- **Playlist Track Artwork**: Tracks on playlist detail page now show album cover art for each song

### Changed
- **Detail Page Backgrounds**: Gradient/blur now only covers the header area (cover art + title)
  - Fades to transparent before the Play/Shuffle/Menu buttons
  - Buttons and track list sit on clean theme background
  - Reduces visual noise on album, artist, and playlist pages
- **Detail Page Spacing**: Reduced excessive padding between header content and Play/Shuffle/Menu buttons on album, artist, and playlist pages

### Fixed
- **Server Queue Position Persisting**: When queue is restored from server with a seek position, changing tracks or queue no longer preserves the old seek position on the new track
  - `skipToTrack()` now clears `restoredPosition` since any track change invalidates the server seek position
- **Playlist Edit Mode Background Cutoff**: Gradient background in edit mode no longer has visible left/right gaps — padding moved from list container to individual rows so header extends full width
- **Keyboard Avoiding on Android**: Text inputs in modals and auth screens now properly adjust when the keyboard opens
  - Added `adjustResize` to Android manifest via config plugin (native, no JS overhead)
  - Changed `KeyboardAvoidingView` behavior from `undefined` to `'height'` on Android — previous value was a no-op
  - Applied to: LoginScreen, ServerSetupScreen, CreatePlaylistModal, EditShareModal, Settings edit server modal

## [2.5.0] - 2026-04-26

### Added
- **Download Library**: New "Download Library" button in User Settings Menu
  - Fetches all albums from server, compares with downloaded ones
  - Queues missing albums for download, skips already-downloaded ones
  - Re-downloads albums when new songs have been added (detects `songCount` mismatch)
- **Cancel Download Button**: Active downloads in Downloads screen now show an X button to cancel
  - Cancels all child track downloads for album/playlist groups
  - Removes queued tracks and cleans up partial files
  - Properly cancels individual track downloads

### Changed
- **Download Concurrency Overhaul**: Complete rewrite of `DownloadService` for proper parallel downloading
  - Replaced item-level queue with flat track-level queue — tracks within albums now download in parallel (up to `maxConcurrentDownloads`)
  - Event-driven scheduling replaces polling loop — no more `setTimeout(1000)` checks
  - Album/playlist groups track completion and finalize when all tracks finish
  - Skips already-downloaded tracks instantly (counts toward group completion)
  - Progress throttle increased to 2000ms to reduce store update overhead
- **Download Persistence**: `saveToStorage` now debounced to 3 seconds
  - Previously serialized ALL downloads to AsyncStorage after every single track — 20× per album
  - Now batches all changes between track completions into a single write
- **Non-Blocking Download Menus**: Album/Playlist/Track menus close immediately when starting a download
  - Previously `await`ed the entire download setup before closing, freezing the menu
  - Now fires download in background and closes menu instantly
- **Version bumped to 2.5.0**

### Fixed
- **Download Cancel Not Working**: Cancelling an album download now actually stops all running track downloads
  - Added `cancelledGroups` set — tracks check cancellation at 4 points during download
  - Added `trackToGroup` map — cancel can find and kill all child resumables
  - Deletes partial files for cancelled tracks
- **App Lag During Downloads**: Fixed excessive re-renders caused by download progress updates
  - QueueScreen no longer subscribes to entire download store (uses selective selectors)
  - AlbumCard, TrackRow, and other components already used selective subscriptions
  - Debounced storage saves eliminate redundant AsyncStorage writes

## [2.0.2] - 2026-04-26

### Fixed
- **Queue Screen Lag with 30+ Songs**: Fixed severe lag making the queue unusable with large queues
  - Replaced blocking `buildCoverArtUrls` with per-item lazy cover art resolution
  - Extracted `QueueItem` as `React.memo` component — only changed items re-render
  - Download cover art lookup now uses a `Map` (O(1)) instead of linear scans (O(n\*m))
  - Module-level cache for server-resolved cover art URLs (instant on revisit)
  - Reduced `windowSize` from 31 to 10 (fewer off-screen items rendered)
- **Lyrics Scroll Position Inconsistency**: Active lyric line now consistently appears near the top with ~2-3 lines visible above it
  - Fixed scroll calculation missing `paddingTop: 80` from `lyricsContainer`
  - Fixed scroll calculation missing `marginBottom` per line (accumulated error with more lines)
  - Fixed inverted formula that pushed the active line off-screen instead of positioning it
- **Version Not Updating in Builds**: Changed `appVersionSource` from `"remote"` to `"local"` in `eas.json`
  - EAS was ignoring local version and using its remote stored value

## [2.0.1] - 2026-04-08

### Added
- **MarqueeText Component**: Scrolling text for long titles/artist names in MiniPlayer and FullPlayer
  - Uses `react-native-marquee` package
  - Wraps in `MarqueeText` component to avoid naming conflicts
- **Artist Selection Menu on FullPlayer**: Tapping artist name when multiple artists exist opens selection modal
  - Uses existing `ArtistSelectionModal` and `useTrackMenuState` hook
  - Single artist navigates directly, multiple artists show picker
- **Player Startup Wait Protection**: `waitForReady()` method with 5s timeout on all player controls
  - Prevents app freeze on fresh open (controls called before TrackPlayer initialized)
  - Applied to `pause()`, `togglePlayPause()`, `skipToNext()`, `skipToPrevious()`, `seekTo()`
- **Shuffle/Loop State Persistence**: Shuffle and loop settings now persist across app restarts
  - Added `loadFromStorage()` call in `TrackPlayerService.initialize()`

### Changed
- **MiniPlayer Artwork Sizing**: Smaller cover art for less intrusive mini player
  - Normal screens: 56px artwork, 72px container
  - Large screens (>800px height): 64px artwork, 80px container
- **FullPlayer Tablet Artwork**: Increased from 280px to 350px for better use of tablet screen space
- **Lyrics Scrolling**: Current lyric line now stays at consistent position below header
  - Uses measured line heights for accurate scroll positioning
  - Smooth animated transitions between lyric lines
  - 160px top offset to keep line visible below header
- **Queue Screen Theme**: Replaced all hardcoded colors with `theme.colors`
  - Now properly responds to light/dark/AMOLED theme changes
  - Backgrounds, borders, text colors all use theme system
  - Blur overlay respects dark/light mode

### Fixed
- **App Freeze on Fresh Open**: Player controls no longer called before TrackPlayer finishes initializing
  - Added `waitForReady()` guard to all control methods
  - Singleton init promise prevents duplicate initialization
- **Song Replay Bug**: Song no longer sometimes replays when finished with loop off
  - Added `isHandlingQueueEnded` race condition guard
  - Wrapped `PlaybackQueueEnded` handler in try/finally
- **Lyrics Duplicate Styles**: Removed duplicate `lineContainer` and `lyricLine` style definitions in LyricsScreen

### Removed
- **Settings Cache UI**: Removed Stream Cache Size, Cache Usage, and Clear Cache options from Settings
  - These were non-functional and misleading
  - Removed `cache-size` modal type and related state

## [2.0.0] - 2026-03-01

### Added
- **Chromecast Support**: Stream music to Google Cast devices (Chromecast, Android TV, Cast-enabled speakers)
  - Cast button in MiniPlayer and FullPlayer
  - Device discovery and connection via bottom sheet modal
  - Album art, track info, and progress bar on TV screen
  - Full playback control (play/pause, seek, skip, previous)
  - Auto-advances to next track when song ends
  - Supports repeat track and repeat queue modes
  - Seamless transfer of playback position when connecting/disconnecting
- **UPNP/DLNA Support**: Stream music to UPNP/DLNA compatible devices (speakers, TVs, receivers)
  - SSDP device discovery over local network
  - SOAP-based media control
  - Auto-advance on track end with wasPlaying state tracking
  - Same seamless playback transfer as Chromecast
- **Remote Devices Sheet**: Unified bottom sheet for all cast devices
  - Shows "This device" (local playback) at top
  - Separate sections for Chromecast and UPNP/DLNA devices
  - Refresh button to rescan for devices
  - Visual indicator for currently selected device
  - Connection status and error handling
- **Player Router Architecture**: New abstraction layer for multi-player support
  - Routes playback commands to active player (local, Chromecast, or UPNP)
  - PlayerService interface for consistent player API
  - Automatic state transfer between players
- **Cast Indicator**: Visual indicator on MiniPlayer and FullPlayer when casting
  - Uses album color for indicator
  - Shows which device is receiving audio

### Changed
- **Queue Screen Header**: Fixed close button not working due to z-index issue with absolute positioned title
  - Title now has `zIndex: -1`, buttons have `zIndex: 1`

### Technical
- Added `react-native-google-cast@4.9.1` for Chromecast support
- Added `react-native-udp@4.1.7` for UPNP discovery
- Added `fast-xml-parser@4.4.1` for UPNP SOAP parsing
- Created `CastPlayerService` implementing PlayerService interface
- Created `UpnpPlayerService` implementing PlayerService interface
- Created `UpnpController` for SOAP request handling
- Created `UpnpDiscovery` for SSDP device discovery
- Created `PlayerRouter` for player delegation
- Added `remotePlaybackStore` for device state management
- Added custom Gradle plugin (`googleCastFix.js`) to force compatible Play Services Cast version
- Added Android permissions: `ACCESS_WIFI_STATE`, `CHANGE_WIFI_MULTICAST_STATE`
- Added iOS `NSBonjourServices` and `NSLocalNetworkUsageDescription` for Cast discovery

## [1.3.1] - 2026-02-28

### Added
- **Artist Selection Modal**: When a track has multiple artists, "Go to Artist" now shows a selection modal
  - Works in TrackMenu (from FullPlayer, AlbumDetailScreen, PlaylistDetailScreen, etc.)
  - Works in AlbumMenu for albums with multiple artists
  - Shows artist avatar, name, and album count
  - Swipe down or tap outside to dismiss

### Changed
- **Queue Screen Header**: "Queue" title now centered on screen (not affected by buttons)
  - Uses absolute positioning for true center alignment

## [1.3.0] - 2026-02-27

### Added
- **Manual Queue Sync Buttons**: Save and load queue from server on demand
  - Upload (Save) and Download (Load) buttons in Queue screen header
  - "Get Server Queue" button in User Settings Menu
  - Works even when auto-sync is disabled
- **Responsive FullPlayer Layout**: Dynamic spacing for tall phone screens
  - Extra space distributed across 3 areas: top, after artwork, after song info
  - Slightly larger artwork on tall phones (400px vs 380px max)
  - Progressive scaling based on screen aspect ratio

### Fixed
- **Play Queue Sync** (CRITICAL): Fixed server queue not loading on app start
  - Removed immediate `syncToServer()` call that was overwriting server queue with stale local queue
  - Server queue now properly loads on fresh app start when it's newer than local
  - Fixed `savePlayQueue` sending numeric index instead of track ID in `current` parameter
  - Fixed `getPlayQueue` to find track index by matching ID (server returns track ID, not index)
  - Fixed `PlayQueue` type to use `string` for `current` field
- **Album/Playlist Long-Press Menu**: Now matches three-dot menu options
  - Added Play All, Shuffle, Play Next, and Add to Queue options
  - Consistent behavior between long-press and overflow menus

## [1.2.9] - 2026-02-26

### Fixed
- **Play Queue Sync**: Fixed savePlayQueue sending index instead of track ID
  - Server now receives correct track ID in `current` parameter
  - Fixed getPlayQueue to find track index by matching ID (server returns track ID, not numeric index)
  - Fixed PlayQueue type to use `string` for `current` field

### Known Issues
- **Mini Player on Server Queue Load**: Loading server queue does not auto-start playback
  - Queue is restored but user must press play to start
  - This is intentional to prevent unexpected playback

## [1.2.8] - 2026-02-25

### Added
- **Play Random Songs**: A play random songs button on the UserMenu to play a set of random songs depending on your instant mix size settings.
- **Auto-Extend Queue**: New setting to automatically extend queue with similar songs when near the end
  - Fetches similar songs using getSimilarSongs2 when 3 or fewer tracks remain
  - Filters out tracks already in queue to avoid duplicates
  - Respects repeat modes (doesn't extend when repeat queue/track is on)
  - Off by default, toggle in Settings → Playback section

### Changed
- **PreCache System**: Changed from track ID to queue index for duplicate track handling
  - Prevents confusion when duplicate tracks exist in queue
  - Gapless playback correctly identifies buffered track by position

### Fixed
- **Duplicate Track Queue Handling**: Fixed multiple issues when duplicate tracks exist in queue
  - Playing a duplicate track no longer jumps to wrong occurrence
  - Queue navigation correctly identifies which instance is playing
  - Queue screen keyExtractor uses `${id}-${index}` for unique React keys
  - Queue sync searches nearby positions first when finding current track
- **FullPlayer Loading Indicator**: Added buffering spinner to FullPlayer play button
  - Previously only showed in MiniPlayer
  - Now consistently shows loading state in both players

## [1.2.7] - 2026-02-22

### Added
- **Tablet/Folding Phone Support**: Proper layout handling for foldable devices
  - Side-by-side layout on tablet landscape (cover art left, controls right)
  - Phone layout on tablet portrait (vertical stack)
  - Responsive artwork sizing for different screen sizes
- **Cast Button Modal**: Shows "Coming Soon" message when tapping cast button
- **Config Plugin for Android**: Custom plugin to add `smallestScreenSize|density` to android:configChanges
  - Prevents activity recreation on foldable devices
  - Fixes "linking configured in multiple places" error

### Changed
- **FullPlayer Layout**: Complete redesign for better responsiveness
  - Controls now properly centered using `justifyContent: 'center'` with `gap`
  - Removed absolute positioning from bottom controls
  - Tablet layout only activates in landscape mode
- **Queue Screen**: Now uses `useWindowDimensions` for responsive sizing
- **Lyrics Screen**: Now uses `useWindowDimensions` for responsive sizing
- **Hero Banner**: Now uses `useWindowDimensions` for proper card sizing on fold/unfold
- **Deep Link Service**: Improved initialization to prevent multiple instances

### Fixed
- **Foldable Device Crash**: Fixed app crashing when folding/unfolding screen
  - Added `smallestScreenSize|density` to android:configChanges via config plugin
  - Components now properly handle dimension changes without crashing
- **Queue Drag and Drop**: Fixed inability to reorder songs in queue
  - Long press grip icon (≡) to drag and reorder tracks
  - Swipe down to close only works on header area, not the list
- **Search Page Skeleton Loading**: Fixed skeleton layout during loading
  - Shows proper sections for albums, artists, and tracks
  - Multiple skeleton items per section for realistic preview
- **FullPlayer Controls Position**: Fixed shuffle/repeat icons being cut off on tablet portrait
  - Controls now properly centered with appropriate spacing
  - Tablet layout only used in landscape orientation

## [1.2.6] - 2026-02-21

### Changed
- **Queue Screen Reorder System**: Replaced broken DraggableFlatList with button-based reordering
  - Long-press grip icon to enter reorder mode (shows up/down arrows)
  - Tap arrows to move song up or down in queue
  - Tap grip again to exit reorder mode
  - More reliable than gesture-based drag that was freezing the entire screen

### Fixed
- **Queue Screen Freezing**: Fixed complete freeze after attempting to drag songs
  - Removed DraggableFlatList which caused gesture conflicts
  - List now always scrolls smoothly
  - Swipe down to close always works
- **Queue Position Alignment**: Fixed queue header position to match FullPlayer/Lyrics screens
  - Consistent `paddingTop: theme.spacing.xxl` for swipe indicator
  - Proper spacing across all overlay screens

## [1.2.5] - 2026-02-20

### Added
- **Dynamic Theming System**: Three theme modes - Dark (Zinc-based), Light, and AMOLED (pure black)
  - AMOLED theme uses #000000 for true black on OLED screens
  - All 50+ components updated to use dynamic theming via `useTheme()` hook
- **Background Styles**: Three background style options for player screens
  - Solid: Pure theme background color
  - Blur: Blurred cover art with gradient overlay
  - Dynamic Color: Single solid color extracted from album art
  - Settings available in Settings → Appearance
- **Multiple Artists Display on Albums**: Album detail screen now shows all artists
  - Displays artists as "Artist1, Artist2 & Artist3" format
  - Each artist is clickable and navigates to their artist page
- **Play Next with Empty Queue**: "Play Next" now works when queue is empty
  - Creates new queue with the track and starts playing immediately
- **Clear Completed Downloads**: Button to clear completed/failed downloads from active list
  - Appears in Active Downloads section header when there are completed items
- **Album/Playlist Menu Enhancements**: Added "Play Next" and "Add to Queue" options
  - Available in album and playlist overflow menus
  - Quick access to queue management from detail screens

### Changed
- **Queue Screen Gestures**: Completely reworked gesture handling
  - Swipe down from header area to close (matches FullPlayer/Lyrics pattern)
  - Fixed gesture conflicts with DraggableFlatList
  - PanResponder only on header/swipe indicator, not entire screen
- **Download Store Architecture**: Changed from Map to Record for proper reactivity
  - Zustand now properly detects changes and triggers re-renders
  - Progress updates now work correctly
- **Download Metadata Updates**: Added `updateDownloadMeta` function
  - Cover art and title now appear immediately when download starts
  - Fixed first download item not showing cover art

### Fixed
- **Queue Screen Unresponsiveness**: Fixed severe lag with large queues
  - Removed gesture handlers from list area
  - Simplified QueueItemComponent handlers
  - List now scrolls smoothly and responds to taps
- **Queue Screen Swipe Down**: Fixed inability to close queue by swiping
  - Restructured component hierarchy to match FullPlayer/Lyrics
  - PanResponder now properly captures vertical swipes on header
- **Swipe Handle Position**: Aligned with FullPlayer and Lyrics screens
  - Consistent padding and styling across all overlay screens
- **Download Progress Stuck at 0%**: Server may not send Content-Length header
  - Progress now shows "Downloading..." when total size unknown
  - Still tracks bytes downloaded for logging purposes
- **Album Multiple Artists**: Added `artists` and `displayArtist` to Album interface
  - API response now properly typed for multiple artists
  - Album header displays all contributing artists

## [1.2.4] - 2026-02-19

### Added
- **Auto-Focus Search Toggle**: New setting to auto-focus search bar when entering search screen
  - Enabled by default for quick searching
  - Can be disabled in Settings → Interface section
- **Back Button on Login Screen**: Users can now go back to server selection from login screen
  - Shows back arrow when servers already exist
  - Allows canceling the login process

### Changed
- **Input Styling Improvements**: Redesigned all text inputs with shadcn/Tidal-inspired design
  - Search bar: Clean focus state with white border, proper icon spacing
  - Server setup inputs: Focus states with white border highlight
  - Login inputs: Consistent focus states across all fields
  - Updated placeholder text: "Search your library..." for cleaner look
  - Medium font weight, proper padding, larger border radius
- **Tab Styling**: Updated search filter tabs to outlined pill style
  - Active tab: white fill with inverse text
  - Inactive tab: outlined with border

### Fixed
- **Hardware Back on Queue/Lyrics**: Fixed back button closing both overlay AND full player
  - Back now only closes the queue/lyrics overlay, keeping full player open
  - Implemented callback system in navigationStore for overlay control
  - Modal's onRequestClose properly handles nested overlays
- **Search Bar Icon Spacing**: Fixed missing spacing between search icon and text input

## [1.2.3] - 2026-02-18

### Added
- **Scan Library Button**: Added "Scan Library" button to User Settings Menu
  - Starts a media library scan on the server
  - Shows toast notification when scan starts
  - Located in QAM between Settings and Shares

### Fixed
- **Home Screen Skeleton Loading**: Fixed inconsistent skeleton states
  - Recently Played and New Releases now show skeleton for title during loading
  - All sections now have consistent skeleton appearance
  - Fixed text appearing during loading state
- **Album Long-Press Menu**: Added long-press support to all home sections
  - Random Albums now supports long-press menu with haptics
  - Most Played now supports long-press menu with haptics
  - Recently Played now has haptic feedback on long-press
  - New Releases now has haptic feedback on long-press
  - Consistent behavior and feedback across all album displays
- **Shuffle and Repeat Functionality**: Fixed shuffle and repeat buttons not working
  - Shuffle: toggleShuffle() now calls shuffleQueue() when turning shuffle on
  - Shuffle: Calls unshuffleQueue() when turning shuffle off  
  - Shuffle: Queue now properly shuffles/unshuffles when button is pressed
  - Repeat Track: Fixed track not repeating when reaching the end
  - Repeat Track: Disables gapless preloading when repeat track is on
  - Repeat Track: Properly replays track via PlaybackQueueEnded event
  - Repeat Queue: Already working correctly
- **Queue Sync Playback Reset**: Fixed playback resetting when modifying queue
  - When queue is modified, now finds where current track actually is
  - Updates queue index to match instead of assuming mismatch = wrong track
  - Only restarts playback if current track was actually removed
  - Prevents false resets when coming back from another app
  - Fixes "jumps to random position" when adding/removing tracks
- **Download Progress for Albums/Playlists**: Fixed progress bar not updating
  - Progress now calculated based on completed tracks (e.g., 3/10 tracks)
  - Previously only used byte-based progress which stayed at 0%
  - Individual track downloads still use byte-based progress
- **POST Request Authentication**: Fixed authentication errors with POST requests
  - Request interceptor was adding auth params to both URL and body
  - Now only adds auth params to URL for GET requests
  - POST requests correctly use auth params in body only
  - Fixes "wrong api key" and "wrong username or password" errors on certain endpoints
- **Queue and Mini Player Display**: Fixed queue not showing up at all
  - Queue was loaded into store but currentTrack was never set
  - Mini player requires currentTrack to be set in playerStore to display
  - Now sets currentTrack for both server queue and local queue on startup
  - Mini player and queue now display correctly on app launch
  - Playback resumes at correct position when user presses play
- **Production Build Crash**: Fixed app crashes in production builds
  - Removed verbose console.log statements with complex object logging
  - These logs could cause crashes or undefined behavior in production
  - App now works correctly in both dev and production builds
- **Queue Modification Disrupting Playback**: Fixed playback restarting when modifying queue
  - Replaced `TrackPlayer.remove()` loop with `removeUpcomingTracks()` which safely removes only queued tracks
  - Gapless playback now preserved when adding/removing/reordering queue items
  - Current track continues uninterrupted during queue operations
- **App Lag and Infinite Loop**: Fixed severe lag especially around 50% playback mark
  - Removed 3 native bridge calls/sec from setInterval polling (`getPosition`, `getDuration`, `getBufferedPosition`)
  - Enabled `progressUpdateEventInterval: 1` in TrackPlayer options for native progress push
  - LyricsManager now reads from `playerStore.progress.position` instead of calling `TrackPlayer.getPosition()` every 100ms
  - Fixed infinite loop: `PlaybackTrackChanged` was firing when `TrackPlayer.add()` buffers next track (event.track === null), triggering repeated precache calls every second
- **Full Player Navigation UX**: Fixed multiple navigation/animation issues
  - Artist/album press now animates slide-down before navigating (no abrupt close)
  - If already on artist/album page, still closes full player with animation (skips navigation)
  - Removed useEffect that instantly closed full player on navigation change
  - Hardware back on Lyrics/Queue closes overlay instead of full player
  - Fixed PanResponder stale closure issue using ref for `isMenuOpen` state
- **SongInfoModal Animation**: Fixed abrupt appearance/disappearance
  - Custom animated sheet (`translateY`) + dim overlay (`opacity`) that animate together
  - PanResponder for swipe-to-dismiss
  - Pressable overlay tap to dismiss
  - Gestures no longer bleed through to underlying FullPlayer

## [1.2.2] - 2026-02-06

### Added
- **OpenSubsonic Extensions Detection**: Automatic server capability detection
  - Detects formPost, apiKeyAuthentication, and songLyrics extensions
  - Stored per-server with 24-hour cache
  - Auto-refreshes on app startup and login
- **API Key Authentication**: Full support for OpenSubsonic API key auth
  - Login with API key instead of username/password
  - Deep link support: `dino://add-server?url=...&apiKey=...`
  - Toggle between Password and API Key in login screen
  - Edit server modal supports switching auth types
  - Uses tokenInfo endpoint to fetch username for API key users
- **POST Request Support**: Automatic POST for API endpoints
  - Uses POST for all API calls (except media streaming)
  - Enabled when server supports formPost extension
  - Settings toggle to disable POST requests if needed
- **User Avatar System**: Server avatar with fallback to initials
  - Fetches user avatar via getAvatar endpoint
  - Falls back to white circle with dark initial if no avatar
  - Displayed in HomeScreen, LibraryScreen, UserSettingsMenu, and Settings
  - Auto-fetches username from tokenInfo for API key auth
- **Quality Badge Toggle**: Tap quality badge to switch between simple/detailed
  - Simple mode: "MAX", "HIGH", "MEDIUM", "LOW", "DOWNLOADED"
  - Detailed mode: "1411 kbps FLAC", "320 kbps MP3", etc.
  - Shows actual track bitrate/format when streaming at MAX quality
  - Setting persists across app restarts
- **Player Loading Indicator**: Shows spinner when track is buffering
  - Replaces play/pause icon with loading spinner
  - Visible in both MiniPlayer and FullPlayer
  - Clear feedback when track is loading
- **Network Settings Section**: New settings section for network options
  - Toggle to enable/disable POST requests
  - More network options can be added here in future

### Changed
- **Avatar Component**: Enhanced to support server avatar fetching
  - Auto-builds avatar URL from username
  - Shows single letter initial (matching UserAvatar style)
  - White circle with dark text for consistency
- **Edit Server Modal**: Complete redesign with auth type selection
  - Toggle between Password and API Key authentication
  - Auto-detects current auth type when opening
  - Separate fields for each auth mode
  - Clean, modern UI with proper spacing

### Fixed
- **Server Setup Race Condition**: Fixed "no server selected" error
  - Combined server addition and selection into atomic state update
  - Prevents race condition between addServer() and setCurrentServer()
  - LoginScreen now always has valid currentServerId
- **Deep Link API Key Parameter**: Fixed case sensitivity issue
  - Now accepts both `apiKey` (camelCase) and `apikey` (lowercase)
  - generateAddServerLink() uses camelCase for consistency
- **Avatar Text Visibility**: Fixed invisible text on avatar fallback
  - Changed from white-on-white to dark-on-white
  - Shows single initial instead of two letters
  - Matches UserAvatar component style
- **Username Display with API Key**: Fixed "User" showing everywhere
  - HomeScreen, LibraryScreen, UserSettingsMenu now check userStore first
  - Falls back to credentials username for password auth
  - Works correctly for both auth types
- **Progress Bar Color Update**: Fixed delayed color changes
  - Removed memo wrapper that prevented re-renders
  - Quality badge now updates immediately when tapping
  - Progress bar color changes instantly on track switch

### Technical
- Added `getOpenSubsonicExtensions` API endpoint (unauthenticated)
- Added `getCurrentUser` and `tokenInfo` API endpoints for user info
- Enhanced `apiClient.request()` to support formPost extension
- Updated all API endpoints to use POST when available
- Added `ServerCapabilities` interface with extension detection
- Added `qualityBadgeDetailed` and `usePostRequests` settings
- Created `Avatar` component with server avatar support
- Enhanced streaming info to include both simple and detailed text
- Updated `TrackPlayerService` to show actual track quality for MAX

## [1.2.1] - 2026-02-05

### Added
- **Skeleton Loading Screens**: Improved home screen loading experience
  - Created animated skeleton loader component
  - Added skeletons for Hero Banner, Random Albums, and Most Played sections
  - Smooth pulsing animation while content loads
  - Better visual feedback during initial load

### Fixed
- **Queue Playback Reset Bug** (CRITICAL): Fixed playback resetting to track start when removing/moving tracks
  - Added delay to queue sync operations to ensure state is fully updated
  - Skip sync when moving currently playing track (not needed)
  - Prevents playback from jumping to beginning of track during queue modifications
  - Fixed by improving sync timing in `removeFromQueue` and `reorderQueue`
- **Queue Scroll Reset Bug** (CRITICAL): Fixed scroll position resetting when selecting a track
  - Added `getItemLayout` with fixed item height (80px) for scroll calculation
  - Added `maintainVisibleContentPosition` to preserve scroll on updates
  - Disabled `removeClippedSubviews` to maintain scroll position
  - Increased render batch sizes for smoother scrolling
  - Removed `currentIndex` from renderItem dependencies to prevent full re-render
  - Scroll position now preserved when tapping tracks in queue
- **App Startup Hang**: Fixed app stuck on loading screen when server unreachable
  - Queue sync from server now loads in background (non-blocking)
  - Starred items now load in background after app shows
  - App starts immediately with local queue, then syncs from server
  - Loading screen only waits for local storage loads
  - No more waiting for network requests during startup
  - App starts in under 1 second even if server is down
- **Stream Switching on SIM Change**: Fixed stream URL changing when switching between SIM cards
  - Network monitoring now only triggers on WiFi ↔ Mobile switches
  - Ignores Mobile → Mobile changes (SIM switching)
  - Prevents unnecessary stream quality changes when staying on mobile data
- **GIF Background Rendering**: Improved GIF album cover blurring
  - React Native's `blurRadius` now properly blurs GIF first frame
  - Removed unnecessary GIF detection logic
  - Simplified component for better performance
- **useInsertionEffect Warning**: Fixed React warning in BlurredBackground component
  - Added `React.memo` to prevent unnecessary re-renders
  - Added proper display name for debugging
- **Full Player Swipe Gesture**: Fixed swipe down closing full player instead of menu first
  - Added dynamic check for open menus/modals using ref
  - Swipe down now closes TrackMenu/Lyrics/Queue first before closing player
  - Prevents accidental player dismissal when interacting with menus
- **Notification Click Handling**: Fixed notification clicks not opening full player
  - Deep link service now detects notification URLs and opens full player
  - Removed error toast when clicking playback notification
  - Tapping notification now correctly shows the now playing screen

### Known Issues
- **Background Playback on Android**: Playback may stop when app is minimized on some Android devices
  - This is due to aggressive battery optimization by Android OS
  - **Workaround**: Set battery optimization to "Unrestricted" for Dino in Android settings
  - Go to: Settings > Apps > Dino > Battery > Unrestricted
  - Some manufacturers (Samsung, Xiaomi, etc.) have additional battery settings that may need adjustment

## [1.2.0] - 2026-01-31

### Added
- **Server Queue Loading**: Queue now loads from new server when switching between servers
  - Automatically fetches saved queue from new server after switch
  - Restores playback position if available
  - Only clears local queue, preserves server queues
- **Server Setup Help Links**: Added clickable links to server documentation in setup screen
  - Links to Dinosonic (https://github.com/sonicdino/dinosonic)
  - Links to Navidrome (https://www.navidrome.org)
  - Links to OpenSubsonic (https://opensubsonic.netlify.app)
  - Helps users discover and set up compatible music servers
- **Queue Auto-Scroll**: Queue screen now automatically scrolls to currently playing track when opened
  - Current track positioned near top for better visibility
  - Smooth animated scroll on queue open
- **Edit Server Details**: Settings now allows editing server name, URL, and credentials
  - Edit button next to each server in Settings
  - Can update server name, URL, username, and password
  - Credentials are optional when updating server info

### Changed
- **Clear Queue Parameter**: `clearQueue()` now accepts optional parameter
  - `clearQueue(true)` - Clears both local and server queue (default, from Clear Queue button)
  - `clearQueue(false)` - Only clears local queue (used when switching servers)
- **Server Selection Screen Layout**: Completely redesigned for better space efficiency
  - Reduced padding and spacing throughout
  - Smaller icons and text for more compact layout
  - Can now see 6-8 servers at once instead of 2
  - Properly scrollable list for long server lists

### Fixed
- **Queue Not Clearing When Switching Servers** (CRITICAL): Fixed queue persisting across server switches
  - Queue now automatically clears when switching to a different server
  - Playback stops when switching servers to prevent confusion
  - Prevents old server's tracks from remaining in queue
  - Loads queue from new server after clearing
  - Implemented in `AppNavigator` with server change detection
- **Server Selection Screen Scrolling**: Fixed inability to scroll through server list
  - Completely redesigned layout with compact spacing
  - Can now view all servers when more than 2 are added
  - Proper scrolling behavior for long server lists
- **Debug Logging**: Removed excessive call stack logging from `setCurrentServer`

## [1.1.0] - 2026-01-31

### Added
- **Album Sorting**: New horizontal scrolling sort buttons above album grid
  - 6 sort options: Newest, A-Z, By Artist, Recent, Most Played, Random
  - Integrates with OpenSubsonic `getAlbumList2` API
  - Styled like search filter buttons with proper text contrast
- **Artist Biography Section**: Display artist biography with expandable text and Last.fm link
  - Shows "About" section on artist detail page
  - Biography text can be expanded/collapsed
  - "View on Last.fm" button for more information
  - HTML tags and entities properly cleaned from biography text
- **Artist Top Songs Modal**: "See All" button now properly displays full list of top songs
  - Fixed modal layout to show scrollable track list
  - Displays up to 50 top songs from Last.fm
- **Downloads System**: Complete offline playback support
  - Download individual tracks, albums, and playlists
  - Download indicators on all content (small icon badges)
  - Dedicated Downloads screen with organized views (Tracks, Albums, Playlists)
  - Offline banner using SafeAreaView when no network connection
  - Downloaded tracks show "Downloaded" badge
  - Offline metadata caching for playlists
  - Lyrics cached locally for offline tracks
- **Queue Management Improvements**:
  - "Clear Queue" button with confirmation modal
  - "Save Queue to Playlist" feature
  - Improved queue sync when removing/moving tracks
  - Better validation to prevent track skipping/repeating
- **Toast Notification System**: Global toast notifications throughout the app
  - Solid backgrounds (95% opacity) for better visibility
  - Removed BlurView dependency for reliability
  - White text on colored backgrounds for proper contrast
- **Multiple Artists Display**: Shows comma-separated artists in track rows and mini player
- **Static Blur Background**: Replaced dynamic BlurView with static Image blur
  - Better performance and reliability
  - Scrolling blurred backgrounds on detail screens
  - Smooth gradient from transparent to solid background color
- **Close Button Animations**: Added smooth slide-down animation to Lyrics and Queue screens
  - Animation matches swipe gesture (200ms timing)
  - Consistent polished behavior across all modals
- **Settings Enhancements**: Added configurable options for downloads, storage, and radio
  - Max Concurrent Downloads selector (1-5)
  - Download Storage Limit selector (1-50 GB)
  - Stream Cache Size selector (50 MB - 1 GB)
  - Radio Queue Size selector (10-50 tracks)
  - All settings now have proper modal pickers

### Changed
- **Hardware Back Button Behavior**: Now properly navigates through history instead of exiting app
  - Full player automatically closes when navigating to artist/album pages
  - Respects navigation stack properly
- **Clear Queue Behavior**: Now automatically closes full player when queue is cleared
  - Uses global `showFullPlayer` state in `navigationStore`
  - Prevents white background issue after clearing queue
- **UI/UX Improvements**:
  - Quality indicator repositioned between time labels (under progress bar)
  - Album/playlist detail page buttons now consistent size (48px height)
  - Modal button colors fixed for better contrast (white text on colored backgrounds)
  - Blurred backgrounds now scroll with content for more dynamic feel
  - Gradient overlays simplified (transparent to solid color)
  - Search filter buttons now use proper inverse text color for contrast
  - Album sorting buttons properly centered with no text cutoff
- **Button Styling Consistency**: All action buttons follow consistent design patterns
  - 48px height with proper border radius
  - Consistent padding and spacing
  - Proper color contrast for accessibility
  - Active tab text uses `theme.colors.text.inverse` for contrast
- **App Info Sheet**: Replaced placeholder emoji with actual app icon (icon-circle.png)
- **Shares Screen**: Renamed "My Shares" to "Shares"
- **Version Display**: Version now dynamically reads from app.config.js instead of hardcoded strings

### Fixed
- **Queue Removal Bugs** (CRITICAL): Fixed multiple issues with queue modification
  - Removed tracks were still playing when current track ended
  - TrackPlayer now properly removes preloaded tracks when queue is modified
  - Removing tracks no longer interrupts current playback
  - Fixed by clearing preloaded tracks (indices > 0) and rebuilding with correct tracks
- **Queue Reordering Reset Bug** (CRITICAL): Fixed track resetting when reordering queue
  - Reordering tracks no longer triggers TrackPlayer sync
  - Current track continues playing without interruption
  - New order is picked up naturally when next track plays
  - Only sync TrackPlayer when removing tracks, not when reordering
- **Toast Text Visibility**: Fixed invisible text and icons in toast notifications
  - Changed text color from `theme.colors.text.inverse` to white (`#FFFFFF`)
  - All icons now white for visibility
  - Darkened background colors for better contrast
  - Improved positioning and text rendering
- **Button Text Contrast**: Fixed text visibility on colored buttons
  - Share Edit modal: Button text uses `theme.colors.text.inverse`
  - Search filter buttons: Active tab text uses inverse color for readability
- **Album Sorting Button Text**: Fixed text cutoff and centering issues
  - Added proper height, justifyContent, alignItems
  - Added lineHeight for proper text rendering
  - Added textAlignVertical for Android
- **Gradient Scrolling**: Detail screens now have properly scrolling blurred backgrounds
  - Blurred background moved inside ScrollView
  - Background is `position: absolute` with `zIndex: -1`
  - Smooth fade from blurred image to solid background
- **Scrobble Submission**: Fixed Last.fm scrobbling functionality (from commit history)
- **Artist Songs Modal**: Fixed FlatList layout issue preventing track list from displaying
- **Artist Biography API**: Fixed response field name mismatch (`artistInfo2` vs `artistInfo`)
- **Queue Track Skipping**: Improved queue sync to prevent tracks from skipping during modifications
- **Modal Button Colors**: Proper contrast on accent and error colored buttons
- **Downloads Screen Button Visibility** (CRITICAL): Fixed invisible text on Play All and Shuffle buttons
  - Changed background from dark elevated to bright accent color
  - Changed text and icons from accent to inverse color (dark on light)
  - Buttons now have high contrast and are fully visible
- **Downloads Screen Button Functionality**: Fixed Play All and Shuffle buttons not working
  - Buttons now play ALL downloaded tracks (standalone + from albums + from playlists)
  - Previously only worked with standalone tracks
  - Updated disabled state to check total downloaded tracks
- **Version Number Display**: Fixed hardcoded version strings in App Info and Settings
  - Now dynamically reads from `Constants.expoConfig.version`
  - Automatically updates when version changes in app.config.js

### Technical
- Added `getAlbumList2` API endpoint with all sort type support
- Updated `useAlbums` hook to accept all OpenSubsonic sort types
- Added `showFullPlayer` state to `navigationStore` for global full player control
- **Modified `TrackPlayerService.syncQueueWithTrackPlayer()` to properly handle queue modifications**:
  - Uses `TrackPlayer.remove()` to clear preloaded tracks (indices > 0)
  - Only rebuilds queue if current track changed
  - Prevents playback interruption during queue modifications
- **Removed `syncQueue()` call from `reorderQueue()` in queueStore**:
  - Prevents unnecessary TrackPlayer resets when reordering
  - New order picked up naturally on next track change
- Added `getArtistInfo2` API endpoint support with graceful fallback
- Added `useArtistInfo` and `useTopSongs` React Query hooks
- Implemented `DownloadService` for managing offline content
- Added `OfflineBanner` component for network status indication
- Created `ToastContainer` and global toast state management
- Improved error handling in API client with better logging
- Enhanced TrackPlayerService with queue synchronization
- Added biography HTML sanitization utility function
- Removed GitHub Actions release automation (manual releases only)
- Removed release scripts directory

## [0.1.0] - Initial Release

### Added
- OpenSubsonic server integration
- Music browsing (artists, albums, playlists)
- Audio playback with TrackPlayer
- Queue management
- Lyrics display
- Search functionality
- User authentication
- Settings management
- Favorites support

---

## Release Process

To create a new release:

1. Update the version number in `package.json` and `app.config.js`
2. Move items from `[Unreleased]` to a new version section with date
3. Commit the changes: `git commit -am "Release vX.Y.Z"`
4. Create a git tag: `git tag vX.Y.Z`
5. Push changes and tags: `git push && git push --tags`

<!-- 
TODO: Automate changelog generation with GitHub Actions
Example workflow could:
- Parse git commits since last tag
- Extract conventional commit messages
- Update CHANGELOG.md automatically
- Create GitHub release with release notes
-->
