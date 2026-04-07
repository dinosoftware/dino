# Dino Music App - Flutter Tech Specification

> **NOTE**: This app uses a **Tidal + shadcn/ui inspired design system**. It does NOT use Material Design. The Flutter remake must preserve this aesthetic with clean, minimal, modern UI.

## Table of Contents
1. [Design System](#design-system)
2. [App Architecture](#app-architecture)
3. [Screens & Navigation](#screens--navigation)
4. [Features](#features)
5. [Components](#components)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Services](#services)
9. [Configuration](#configuration)

---

## Design System

### Theme Modes
Three theme modes supported:
- **Dark** (default) - Zinc-based dark theme (`#09090B` primary background)
- **Light** - Clean light theme (`#FAFAFA` primary background)
- **AMOLED** - Pure black for OLED screens (`#000000` primary background)

### Color Palette (Dark Theme)
```yaml
background:
  primary: "#09090B"
  secondary: "#18181B"
  card: "#27272A"
  elevated: "#3F3F46"
  muted: "#52525B"

accent: "#FAFAFA"
accentForeground: "#09090B"

text:
  primary: "#FAFAFA"
  secondary: "#A1A1AA"
  tertiary: "#71717A"
  muted: "#52525B"
  disabled: "#3F3F46"
  inverse: "#09090B"

success: "#22C55E"
error: "#EF4444"
warning: "#F59E0B"
info: "#3B82F6"

border: "#27272A"
divider: "#27272A"
overlay: "rgba(9, 9, 11, 0.8)"
```

### Typography
```yaml
fontFamily:
  regular: "Inter_400Regular"
  medium: "Inter_500Medium"
  semibold: "Inter_600SemiBold"
  bold: "Inter_700Bold"
  black: "Inter_900Black"

fontSize:
  xs: 12
  sm: 14
  base: 16
  md: 16
  lg: 18
  xl: 20
  xxl: 24
  xxxl: 30
  huge: 36
  display: 48

fontWeight:
  regular: "400"
  medium: "500"
  semibold: "600"
  bold: "700"
  black: "900"

lineHeight:
  tight: 1.25
  normal: 1.5
  relaxed: 1.625

letterSpacing:
  tight: -0.025
  normal: 0
  wide: 0.025
```

### Spacing
```yaml
xs: 4
sm: 8
md: 16
lg: 24
xl: 32
xxl: 48
xxxl: 64
```

### Border Radius
```yaml
sm: 6
md: 8
lg: 12
xl: 16
xxl: 24
round: 9999
```

### Shadows
```yaml
sm:
  shadowOffset: { width: 0, height: 1 }
  shadowOpacity: 0.15
  shadowRadius: 2
  elevation: 1

md:
  shadowOffset: { width: 0, height: 2 }
  shadowOpacity: 0.3
  shadowRadius: 4
  elevation: 2

lg:
  shadowOffset: { width: 0, height: 4 }
  shadowOpacity: 0.3
  shadowRadius: 8
  elevation: 3
```

### Dimensions
```yaml
miniPlayer:
  height: 72
  thumbnailSize: 56

fullPlayer:
  artworkSize: 320

card:
  albumSize: 180
  artistSize: 160

thumbnail:
  small: 40
  medium: 56
  large: 80
```

### Animations
```yaml
duration:
  instant: 100ms
  fast: 200ms
  normal: 350ms
  slow: 500ms
  slower: 700ms

easing:
  easeIn: cubic-bezier(0.4, 0, 1, 1)
  easeOut: cubic-bezier(0, 0, 0.2, 1)
  easeInOut: cubic-bezier(0.4, 0, 0.2, 1)
  spring: elastic-out
```

### Background Styles
Three background modes for player/detail screens:
1. **Blur** - Blurred album art background (blur radius: 60-80)
2. **Gradient** - Dynamic gradient from extracted album colors
3. **Solid** - Theme-based solid color

---

## App Architecture

### Folder Structure
```
lib/
├── api/                    # API client and endpoints
│   ├── client.dart         # Centralized HTTP client
│   └── opensubsonic/       # OpenSubsonic API modules
├── components/             # Reusable UI components
│   ├── cards/              # AlbumCard, ArtistCard, TrackRow
│   ├── common/             # Button, Avatar, Toast, etc.
│   ├── menus/              # Context menus and action sheets
│   ├── modals/             # Modal dialogs
│   ├── player/             # Player UI components
│   └── skeletons/          # Loading skeleton components
├── config/                 # App configuration and constants
├── hooks/                  # Custom React-like hooks (or providers)
├── models/                 # Data models/entities
├── navigation/             # Navigation configuration
├── screens/                # Screen/page widgets
│   ├── auth/               # Login, server setup
│   ├── detail/             # Album, artist, playlist details
│   ├── downloads/          # Downloads management
│   ├── home/               # Home, search
│   ├── library/            # Library tabs
│   ├── player/             # Lyrics, queue
│   └── settings/           # Settings screens
├── services/               # Business logic services
│   ├── player/             # Audio playback
│   ├── cast/               # Chromecast
│   ├── upnp/               # UPnP/DLNA
│   └── download/           # Download service
├── stores/                 # State management (Riverpod/Bloc)
├── theme/                  # Theme configuration
└── utils/                  # Utility functions
```

---

## Screens & Navigation

### Navigation Structure
```
Bottom Tab Navigator:
├── Home (home icon)
├── Search (search icon)
├── Library (music icon)
└── Downloads (download icon)

Stack Navigator (on top of tabs):
├── Album Detail
├── Artist Detail
├── Playlist Detail
├── Settings
└── Shares

Modal Overlays:
├── Full Player (swipe down to dismiss)
├── Queue Screen (swipe down to dismiss)
├── Lyrics Screen (swipe down to dismiss)
└── Various bottom sheets
```

### Screen Specifications

#### Home Screen
- **Header**: App logo (36x36) + "Dino" text on left, user avatar (40x40) on right
- **Hero Banner**: Large promotional/featured content card
- **Sections** (horizontal scroll):
  - Recently Played (circular album cards)
  - Random Albums (album cards)
  - Most Played Albums (album cards)
  - Recommended Albums (album cards)
- **Padding**: 16px horizontal, 24px top spacing

#### Search Screen
- **Search Bar**: Full width, auto-focus on entry
- **Debounce**: 300ms on input
- **Results**: Albums, Artists, Songs in separate sections
- **Empty State**: Search icon with "Search for music" text

#### Library Screen
- **Tabs**: Albums | Artists | Playlists | Favorites
- **Active tab**: Accent color underline
- **Albums Tab**: Grid (2 columns), album cards
- **Artists Tab**: List with circular avatars
- **Playlists Tab**: List with cover art thumbnails
- **Favorites Tab**: Combined albums/artists/songs sections

#### Album Detail Screen
- **Back Button**: Top-left, circular (40x40)
- **Cover Art**: 220x220, rounded corners (12px), 1px border
- **Dynamic Background**: Blur/gradient from cover art colors
- **Title**: XXL bold, center-aligned
- **Artist**: LG medium, tappable link
- **Metadata**: "Year • Song Count • Duration"
- **Action Buttons**:
  - Play (accent color background, uses album color)
  - Shuffle (card background with border)
  - More menu (icon only)
- **Track List**: TrackRow items with track numbers
- **Bottom Padding**: 100px for mini player

#### Artist Detail Screen
- **Back Button**: Top-left, circular
- **Avatar**: 160x160, circular, 1px border
- **Dynamic Background**: Blur/gradient from avatar colors
- **Name**: XXXL bold, center-aligned
- **Album Count**: "X albums" text
- **Action Buttons**: Play, Shuffle, More (same as album)
- **Biography Section**: Collapsible (4 lines max), "Read more" link, Last.fm button
- **Top Songs**: Horizontal list, max 5 visible, "See All" button
- **Albums Grid**: 2 columns
- **Similar Artists**: Horizontal scroll with artist cards

#### Full Player Screen
- **Swipe Handle**: 48x4, rounded, center top
- **Close Button**: ChevronDown icon, top-left
- **Artwork**: 
  - Phone: Full width minus padding, max 380px
  - Tablet landscape: 280px fixed, side-by-side layout
- **Dynamic Background**: Blur/gradient from artwork
- **Track Info**:
  - Title: XL bold, marquee if long
  - Artist: MD medium, tappable
  - Album: SM medium, tappable
- **Top Actions**: More menu, Favorite heart
- **Progress Bar**: 
  - Slider with buffer indicator
  - Time stamps (current / duration)
  - Quality badge (center, tappable to toggle detail)
- **Main Controls**:
  - Shuffle (left)
  - Previous
  - Play/Pause (80x80 circular, uses album color)
  - Next
  - Repeat (right, with slash overlay when off)
- **Bottom Actions**: Lyrics, Cast, Queue

#### Mini Player
- **Height**: 72px
- **Progress Indicator**: 3px bar at top
- **Thumbnail**: 56x56, rounded corners
- **Track Info**: Title (14px semibold), Artist (12px regular)
- **Cast Button**: 20px icon (if enabled)
- **Controls**: Play/Pause (40x40 circular), Skip (36x36)
- **Background**: Secondary background color
- **Border**: 1px top border

#### Queue Screen
- **Swipe Handle**: Same as full player
- **Header**: Close (X), "Queue" title, Save/Load/Clear buttons
- **Info Bar**: Song count, "Save as Playlist" button
- **List**: Draggable items with:
  - Grip handle (left)
  - Thumbnail (48x48)
  - Title + Artist
  - Duration
  - Delete button (right)
- **Current Track**: Highlighted with accent border

#### Lyrics Screen
- **Header**: Close button, track info (artwork + title + artist), Lock/Unlock button
- **Synchronized Lyrics**:
  - Current line: Primary text color, bold
  - Other lines: Secondary text color
  - Tap to seek
  - Auto-scroll with lock toggle
- **Unsynced Lyrics**: Plain text display
- **Empty State**: "No lyrics found" message
- **Font Size Options**: Small (24px), Medium (28px), Large (32px)

#### Downloads Screen
- **Storage Card**: Usage bar, percentage, Play All/Shuffle buttons
- **Sections**: Active Downloads, Albums, Playlists, Individual Tracks
- **Active Downloads**: Progress bar, percentage, status
- **Items**: Cover art, title, subtitle, size, delete button

#### Settings Screen
- **Sections**: Account, Streaming, Network, Downloads, Storage, Playback, Radio, Lyrics, Interface, Appearance, About
- **Item Style**: Card background, 56px min height
- **Toggles**: Platform-appropriate with accent color
- **Selection Modals**: Bottom sheet with options
- **Logout Button**: Error color background

---

## Features

### Authentication
- **Server Management**: Add, edit, remove, switch servers
- **Auth Methods**: 
  - Password (with token: md5(password + salt))
  - API Key
- **Auto-login**: Credentials stored securely

### OpenSubsonic API
- **Version**: 1.16.1
- **Format**: JSON
- **Auth**: Token-based or API key
- **Request Method**: Auto-selects POST (when server supports) or GET
- **Endpoints**:
  - `/rest/ping.view` - Server health check
  - `/rest/getArtists.view` - Artist listing
  - `/rest/getArtist.view` - Artist details
  - `/rest/getAlbum.view` - Album details with tracks
  - `/rest/getAlbumList2.view` - Album lists (newest, recent, random, frequent)
  - `/rest/getPlaylists.view` - Playlist listing
  - `/rest/getPlaylist.view` - Playlist details
  - `/rest/getSong.view` - Song details
  - `/rest/stream.view` - Audio streaming with transcoding
  - `/rest/download.view` - Original file download
  - `/rest/getCoverArt.view` - Cover art
  - `/rest/getAvatar.view` - User avatar
  - `/rest/search3.view` - Search (albums, artists, songs)
  - `/rest/getLyrics.view` - Legacy lyrics
  - `/rest/getLyricsBySongId.view` - OpenSubsonic structured lyrics
  - `/rest/savePlayQueue.view` - Save queue to server
  - `/rest/getPlayQueue.view` - Load queue from server
  - `/rest/scrobble.view` - Scrobble plays
  - `/rest/star.view` / `/rest/unstar.view` - Favorites
  - `/rest/getStarred2.view` - Get favorites
  - `/rest/createPlaylist.view` - Create playlist
  - `/rest/updatePlaylist.view` - Update playlist
  - `/rest/deletePlaylist.view` - Delete playlist
  - `/rest/getSimilarSongs2.view` - Similar songs (radio)
  - `/rest/getTopSongs.view` - Artist top songs
  - `/rest/getArtistInfo2.view` - Artist info/bio
  - `/rest/createShare.view` - Create share link
  - `/rest/getShares.view` - Get shares
  - `/rest/updateShare.view` - Update share
  - `/rest/deleteShare.view` - Delete share

### Audio Playback
- **Local Player**: React-native-track-player equivalent (just_audio in Flutter)
- **Features**:
  - Gapless playback (pre-cache next track at 50% progress)
  - Network-aware quality switching (WiFi vs Mobile)
  - Buffer indicator
  - Seek with smooth animation
  - Volume control
  - Background audio
  - Notification controls (play/pause/skip)
  - Auto-extend queue with similar songs

### Streaming Quality
- **Bitrates**: Original (0), 320, 256, 192, 128, 96, 64 kbps
- **Formats**: Original, MP3, Opus, AAC, FLAC
- **Separate Settings**: WiFi and Mobile data
- **Auto-switch**: Changes quality when network changes (with seamless transition)

### Offline Downloads
- **Download Types**: Tracks, Albums, Playlists
- **Original Quality**: Uses `/download` endpoint (no transcoding)
- **Concurrent Downloads**: Configurable (1-5)
- **WiFi-Only Option**: Toggle
- **Storage Limit**: Configurable (1-50 GB)
- **Progress Tracking**: Per-item and total progress
- **Metadata Storage**: Track info, cover art, lyrics cached locally
- **Resume Support**: Can resume interrupted downloads

### Chromecast
- **Device Discovery**: Auto-scan
- **Streaming**: Direct URL to Cast device
- **State Sync**: Playback state, position sync
- **Quality Settings**: Separate cast quality/format

### UPnP/DLNA
- **Device Discovery**: SSDP/UDP scan
- **Control**: Play, pause, seek, volume
- **State Polling**: 2-second intervals
- **Metadata**: Title, artist, album, cover art

### Synchronized Lyrics
- **Formats**:
  - OpenSubsonic structured lyrics (synced/unsynced)
  - Legacy LRC format
  - Plain text fallback
- **Features**:
  - Auto-scroll with current line highlight
  - Tap-to-seek
  - Scroll lock toggle
  - Timestamp display toggle
  - Font size options (S/M/L)
  - 100ms update interval for tight sync

### Queue Management
- **Operations**: Add, remove, reorder, clear
- **Shuffle**: Fisher-Yates shuffle (preserves current track)
- **Repeat Modes**: Off, Queue, Track
- **Drag to Reorder**: Long-press and drag
- **Server Sync**: Auto-sync queue to server (30s interval)
- **Save as Playlist**: Export current queue
- **History**: Track playback history

### Scrobbling
- **Now Playing**: Update on track start
- **Progress Updates**: Every 30 seconds
- **Scrobble Threshold**: 80% or 4 minutes (whichever first)
- **Toggle**: Enable/disable in settings

### Sharing
- **Create Share**: Generate public link
- **Expiration**: Configurable
- **Share Types**: Album, Artist, Playlist, Track
- **Share Sheet**: Native sharing with custom message

### Radio / Instant Mix
- **Similar Songs**: Based on current track
- **Queue Size**: Configurable (10-50 tracks)
- **Auto-Extend**: Add similar songs when queue nears end

### Search
- **Debounce**: 300ms
- **Categories**: Albums, Artists, Songs
- **Auto-focus**: Optional (default on)
- **Results**: Real-time updates

### Dynamic Album Colors
- **Extraction**: From cover art using color palette extraction
- **Colors**: Primary, secondary, background
- **Caching**: Per-image cache
- **Usage**: Player controls, backgrounds, accent colors

---

## Components

### Cards

#### AlbumCard
- **Size**: 180x180 (artwork), responsive grid
- **Artwork**: 1:1 aspect ratio, rounded corners (12px), 1px border
- **Placeholder**: Musical note icon (♪)
- **Download Badge**: Accent circle (24x24) with download icon
- **Info**: Title (SM semibold, 2 lines), Artist (SM regular, 1 line)
- **Animation**: Scale to 0.98 on press

#### ArtistCard
- **Size**: 160x160 (avatar)
- **Avatar**: Circular, 1px border
- **Info**: Name (SM semibold), Album count (XS tertiary)

#### TrackRow
- **Height**: ~72px
- **Optional Elements**:
  - Track number (32px width)
  - Artwork (40x40, optional)
- **Info**: Title (SM medium), Artist (XS regular)
- **Duration**: Right-aligned (XS muted)
- **Download Indicator**: Accent colored icon
- **Menu Button**: 40x40 touch target
- **Active State**: Card background with accent border

### Common Components

#### Button
- **Variants**: default, primary, secondary, ghost, destructive, outline
- **Sizes**: sm (36px), md (44px), lg (48px), icon (40x40)
- **States**: Normal, pressed, disabled, loading
- **Haptic**: Light impact on press

#### Avatar
- **Sizes**: Configurable (default 40x40)
- **Fallback**: Initial on accent background
- **Source**: URL from server or initials

#### Toast
- **Types**: Success, Error, Info
- **Position**: Top of screen
- **Auto-dismiss**: 3 seconds
- **Animation**: Slide in/out

#### EmptyState
- **Icon**: Large (64px)
- **Title**: XL bold
- **Message**: MD secondary

#### ErrorView
- **Icon**: Error icon
- **Message**: Error description
- **Retry Button**: Primary button

#### LoadingSpinner
- **Size**: Configurable
- **Color**: Accent color

#### Skeleton
- **Pulse Animation**: Shimmer effect
- **Variants**: Card, Row, Detail

#### MarqueeText
- **Trigger**: Text overflow
- **Animation**: Horizontal scroll
- **Speed**: 50px/second

#### CoverArtImage
- **Caching**: Disk cache
- **Placeholder**: Musical note
- **Sizes**: Configurable

#### DynamicBackground
- **Modes**: Blur, Gradient, Solid
- **Blur Radius**: 60-80
- **Gradient**: 4-stop from extracted colors

### Menus (Bottom Sheets)

#### AlbumMenu
- **Items**: Play All, Shuffle, Play Next, Add to Queue, Go to Artist, Add/Remove Favorites, Add to Playlist, Download/Remove Download, Share, Album Info
- **Header**: Cover art (56x56), title, artist
- **Swipe to Dismiss**: Enabled

#### ArtistMenu
- **Items**: Play, Shuffle, Go to Artist (if multiple), Share
- **Header**: Avatar (56x56 circular), name

#### PlaylistMenu
- **Items**: Play, Shuffle, Play Next, Add to Queue, Edit, Delete, Share
- **Header**: Cover art, name, track count

#### TrackMenu
- **Items**: Play Next, Add to Queue, Go to Artist, Add/Remove Favorites, Add to Playlist, Download/Remove Download, Share, Song Info
- **Header**: Artwork (56x56), title, artist

### Modals

#### ConfirmModal
- **Style**: Centered dialog
- **Elements**: Title, message, cancel button, confirm button
- **Destructive Option**: Red confirm button

#### AddToPlaylistModal
- **Search**: Filter playlists
- **List**: Existing playlists
- **Create**: Option to create new playlist

#### CreatePlaylistModal
- **Fields**: Name, Description (optional)
- **Public Toggle**: Optional

#### SongInfoModal / AlbumInfoModal
- **Details**: All metadata (codec, bitrate, size, path, dates)
- **Cover Art**: Large display

#### ArtistSelectionModal
- **Purpose**: Select from multiple artists
- **Style**: Bottom sheet list

#### RemoteDevicesSheet
- **Local Device**: Always first option
- **Chromecast Section**: List of devices
- **UPnP Section**: List of devices with scan indicator
- **Refresh Button**: Manual rescan
- **Connection State**: Loading indicator while connecting

---

## State Management

### Recommended Flutter Approach
Use **Riverpod** or **Bloc/Cubit** for state management.

### Stores (State Classes)

#### PlayerStore
```dart
class PlayerState {
  Track? currentTrack;
  PlaybackState playbackState; // playing, paused, stopped, buffering
  Progress progress; // position, duration, buffered
  RepeatMode repeatMode; // off, queue, track
  bool shuffleEnabled;
  double volume; // 0-1
  LyricsState? currentLyrics;
  StreamingInfo? streamingInfo;
}
```

#### QueueStore
```dart
class QueueState {
  List<Track> queue;
  int currentIndex;
  List<Track> originalQueue; // For unshuffle
  List<Track> history;
  SyncStatus serverSyncStatus;
}
```

#### SettingsStore
```dart
class SettingsState {
  // Streaming
  String streamingQualityWiFi;
  String streamingQualityMobile;
  String streamingFormatWiFi;
  String streamingFormatMobile;
  
  // Downloads
  bool wifiOnlyDownloads;
  int maxConcurrentDownloads;
  
  // Playback
  int crossfadeDuration;
  bool gaplessPlayback;
  bool enableScrobbling;
  bool autoSyncQueue;
  bool autoExtendQueue;
  
  // Storage
  int storageLimit;
  int streamCacheSize;
  
  // Lyrics
  String lyricsFontSize;
  bool showLyricsTimestamps;
  
  // UI
  ThemeMode themeMode;
  BackgroundStyle backgroundStyle;
  bool autoFocusSearch;
  
  // Network
  bool usePostRequests;
}
```

#### AuthStore
```dart
class AuthState {
  Map<String, Credentials> credentials; // serverId -> credentials
  String? currentServerId;
  bool isAuthenticated;
}
```

#### FavoritesStore
```dart
class FavoritesState {
  Set<String> starredTracks;
  Set<String> starredAlbums;
  Set<String> starredArtists;
}
```

#### DownloadStore
```dart
class DownloadState {
  Map<String, DownloadedTrack> downloadedTracks;
  Map<String, DownloadedAlbum> downloadedAlbums;
  Map<String, DownloadedPlaylist> downloadedPlaylists;
  Map<String, ActiveDownload> activeDownloads;
  int totalStorageUsed;
}
```

#### RemotePlaybackStore
```dart
class RemotePlaybackState {
  List<RemoteDevice> chromecastDevices;
  List<RemoteDevice> upnpDevices;
  RemoteDevice? selectedDevice;
  PlayerType activePlayerType; // local, chromecast, upnp
  bool isScanning;
  String? connectionError;
}
```

---

## API Integration

### API Client
```dart
class ApiClient {
  // Singleton instance
  static final ApiClient instance = ApiClient._();
  
  // Base URL: {serverUrl}/rest
  String? baseUrl;
  
  // Auth params (added to every request)
  Map<String, String> generateAuthParams();
  
  // Request methods
  Future<T> get<T>(String endpoint, {Map<String, dynamic>? params});
  Future<T> post<T>(String endpoint, {Map<String, dynamic>? params});
  Future<T> request<T>(String endpoint, {Map<String, dynamic>? params}); // Auto-selects GET/POST
  
  // URL builders
  String buildStreamUrl(String trackId, {String? maxBitRate, String? format});
  String buildDownloadUrl(String trackId);
  String buildCoverArtUrl(String coverArtId, {int? size});
  String buildAvatarUrl(String? username);
  
  // Ping/health check
  Future<bool> ping(String serverUrl, {String? username, String? password, String? apiKey});
}
```

### Data Models

```dart
class Track {
  String id;
  String title;
  String? album;
  String? albumId;
  String? artist;
  String? artistId;
  List<Artist>? artists; // Multiple artists
  String? displayArtist;
  int? trackNumber;
  int? year;
  String? genre;
  String? coverArt;
  int? size;
  String? contentType;
  String? suffix;
  int duration;
  int? bitRate;
  String? path;
  DateTime? created;
  bool? starred;
}

class Album {
  String id;
  String name;
  String? artist;
  String? artistId;
  List<Artist>? artists;
  String? coverArt;
  int songCount;
  int duration;
  DateTime created;
  int? year;
  String? genre;
  bool? starred;
}

class Artist {
  String id;
  String name;
  String? coverArt;
  int? albumCount;
  bool? starred;
}

class Playlist {
  String id;
  String name;
  String? comment;
  String? owner;
  int songCount;
  int duration;
  DateTime created;
  String? coverArt;
}

class LyricLine {
  int start; // milliseconds
  String value; // text
}

class Lyrics {
  String? artist;
  String? title;
  String? value; // plain text (unsynced)
  List<LyricLine>? line; // synced
  bool synced;
}
```

---

## Services

### PlayerRouter
Abstracts player selection (local, Chromecast, UPnP):
```dart
abstract class PlayerService {
  Future<void> initialize();
  Future<void> destroy();
  Future<void> play();
  Future<void> pause();
  Future<void> togglePlayPause();
  Future<void> seekTo(double positionSeconds);
  Future<void> stop();
  Future<void> skipToNext();
  Future<void> skipToPrevious();
  Future<void> playTrack(int index);
  Future<void> setVolume(double volume);
  Future<double> getVolume();
  
  // For remote players
  Future<void> connect(RemoteDevice device);
  Future<void> disconnect();
  Future<PlaybackState> saveState();
}
```

### TrackPlayerService (Local)
- Uses `just_audio` or similar
- Manages audio playback, buffering, caching
- Pre-caches next track for gapless playback
- Network monitoring for quality switching
- Background audio support

### QueueSyncManager
- Syncs queue to server every 30 seconds
- Loads queue from server on app start
- Debounced sync (max once per 5 seconds)

### ScrobblingManager
- Sends "now playing" on track start
- Updates progress every 30 seconds
- Scrobbles when 80% or 4 minutes played

### DownloadService
- Manages downloads with queue
- Progress tracking
- Retry logic (3 attempts, exponential backoff)
- Downloads metadata (lyrics, cover art)

---

## Configuration

### Feature Flags
```dart
class FeatureFlags {
  static const enableChromecast = true;
  static const enableUpnp = true;
  static const enableDownloads = true;
  static const enableOfflineMode = true;
  static const enableRadio = true;
  static const enableLyrics = true;
  static const enableQueueSync = true;
  static const enableScrobbling = true;
  static const enableSmartCache = true;
}
```

### Default Settings
```dart
class DefaultSettings {
  // Streaming
  static const streamingQualityWiFi = '0'; // Original
  static const streamingQualityMobile = '128';
  static const streamingFormatWiFi = 'original';
  static const streamingFormatMobile = 'mp3';
  
  // Downloads
  static const wifiOnlyDownloads = true;
  static const maxConcurrentDownloads = 3;
  
  // Playback
  static const crossfadeDuration = 0;
  static const gaplessPlayback = true;
  static const normalizeVolume = false;
  
  // Instant Mix
  static const instantMixSize = 20;
  
  // Storage
  static const storageLimit = 5120; // 5GB
  static const streamCacheSize = 100; // 100MB
  
  // Lyrics
  static const lyricsFontSize = 'medium';
  static const autoScrollLyrics = true;
  static const showLyricsTimestamps = false;
  
  // Queue Sync
  static const autoSyncQueue = true;
  static const queueSyncInterval = 30000; // 30 seconds
  static const autoExtendQueue = false;
  
  // Scrobbling
  static const enableScrobbling = true;
  
  // UI
  static const themeMode = 'dark';
  static const backgroundStyle = 'blur';
}
```

### Cache Configuration
```dart
class CacheConfig {
  static const streamMemoryCacheSize = 3 * 1024 * 1024; // 3MB
  static const streamDiskCacheTracks = 5;
  static const streamBufferAheadSeconds = 60;
  static const streamBufferBehindSeconds = 30;
  static const precacheThreshold = 0.8; // 80% progress
  static const lyricsMaxCacheSize = 100;
  static const apiCacheExpiration = 5 * 60 * 1000; // 5 minutes
}
```

---

## UI Patterns & Interactions

### Haptic Feedback
- **Light Impact**: Button presses, item selections
- **Medium Impact**: Long presses, context menu opens
- **Heavy Impact**: Drag starts
- **Success Notification**: Successful actions (download complete, favorite added)
- **Error Notification**: Failed actions

### Animations
- **Screen Transitions**: 300-350ms ease-out
- **Modal Present**: Spring animation (tension: 300, friction: 30)
- **Card Press**: Scale to 0.98, spring back
- **Progress Updates**: Smooth interpolation
- **Background Transitions**: 300ms crossfade

### Gestures
- **Swipe Down**: Dismiss modals/full player
- **Long Press**: Open context menus
- **Drag**: Reorder queue items
- **Tap**: Select/play items
- **Double Tap**: Not used (single tap preferred)

### Loading States
- **Skeleton Screens**: Shimmer effect matching content shape
- **Spinners**: For short operations
- **Progress Bars**: For downloads/buffering

### Error Handling
- **Toast Notifications**: Brief error messages
- **Error Views**: Full-screen with retry button
- **Inline Errors**: Below form fields

---

## Platform Considerations

### Android
- Background audio service
- Media notification with controls
- Stream cache ( configurable size)
- File-based downloads to app directory

### iOS
- Background audio session
- Now Playing Info Center
- Stream cache
- File-based downloads

### Tablet
- Responsive grid layouts
- Landscape-optimized layouts for player
- Larger touch targets
- Side-by-side layouts where appropriate

---

## Testing Checklist

### Core Features
- [ ] Server connection and authentication
- [ ] Library browsing (albums, artists, playlists)
- [ ] Playback (play, pause, skip, seek)
- [ ] Queue management (add, remove, reorder)
- [ ] Shuffle and repeat modes
- [ ] Search functionality
- [ ] Offline downloads
- [ ] Synchronized lyrics
- [ ] Favorites
- [ ] Playlist creation and management

### Player
- [ ] Gapless playback
- [ ] Network quality switching
- [ ] Buffer indicator
- [ ] Progress tracking
- [ ] Background playback
- [ ] Notification controls

### Casting
- [ ] Chromecast discovery and connection
- [ ] UPnP discovery and connection
- [ ] State synchronization
- [ ] Disconnect and resume local

### UI/UX
- [ ] Theme switching (dark/light/AMOLED)
- [ ] Background styles (blur/gradient/solid)
- [ ] All screen sizes and orientations
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Haptic feedback
- [ ] Animations

---

## Dependencies (Flutter Equivalents)

```yaml
dependencies:
  # State Management
  flutter_riverpod: ^2.4.0  # or flutter_bloc
  
  # Navigation
  go_router: ^13.0.0
  
  # HTTP
  dio: ^5.4.0
  
  # Audio
  just_audio: ^0.9.36
  audio_service: ^0.18.12
  
  # Storage
  hive_flutter: ^1.1.0
  path_provider: ^2.1.1
  
  # Images
  cached_network_image: ^3.3.1
  palette_generator: ^0.3.3+3
  
  # UI Components
  flutter_blurhash: ^0.8.2
  
  # Chromecast
  dart_chromecast: ^0.3.0  # or similar
  
  # UPnP
  upnp: ^2.0.0  # or custom implementation
  
  # Utilities
  url_launcher: ^6.2.1
  share_plus: ^7.2.1
  connectivity_plus: ^5.0.2
  uuid: ^4.2.2
  
  # Fonts
  google_fonts: ^6.1.0
  
  # Icons
  lucide_icons: ^0.257.0  # or lucide_flutter
```

---

## Key Design Principles

1. **Minimal & Clean**: Tidal-inspired clean layouts with generous whitespace
2. **Album Art Focused**: Large, prominent cover art throughout
3. **Dynamic Colors**: Extract colors from artwork for contextual theming
4. **Smooth Animations**: Spring-based, natural feeling transitions
5. **Haptic Feedback**: Tactile responses for all interactions
6. **Consistent Components**: Reusable design system components
7. **Accessible**: Clear text hierarchy, adequate touch targets
8. **Dark-First**: Primary design optimized for dark mode

---

This spec captures the complete Dino Music App for Flutter recreation. The UI must maintain the Tidal + shadcn/ui aesthetic - clean, minimal, modern - without any Material Design influence.
