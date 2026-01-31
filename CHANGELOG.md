# Changelog

All notable changes to Dino Music App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-01-31 (Updated)

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
