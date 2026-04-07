/**
 * Dino Music App - OpenSubsonic API Types
 * TypeScript interfaces for all API responses
 */

// Base Response
export interface SubsonicResponse<T = unknown> {
  'subsonic-response': {
    status: 'ok' | 'failed';
    version: string;
    error?: {
      code: number;
      message: string;
    };
  } & T;
}

// Common Types
export interface Artist {
  id: string;
  name: string;
  coverArt?: string;
  albumCount?: number;
  starred?: string;
}

export interface ArtistWithAlbumsID3 extends Artist {
  album?: Album[];
}

export interface Album {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  artists?: Artist[];
  displayArtist?: string;
  coverArt?: string;
  songCount: number;
  duration: number;
  created: string;
  year?: number;
  genre?: string;
  starred?: string;
  releaseTypes?: string[];
  isCompilation?: boolean;
}

export interface AlbumWithSongsID3 extends Album {
  song?: Track[];
}

export interface Track {
  id: string;
  parent?: string;
  title: string;
  album?: string;
  albumId?: string;
  artist?: string;
  artistId?: string;
  artists?: Artist[]; // OpenSubsonic multiple artists support
  displayArtist?: string; // Formatted artist display string
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  size?: number;
  contentType?: string;
  suffix?: string;
  duration: number;
  bitRate?: number;
  path?: string;
  created?: string;
  starred?: string;
  type?: string;
}

export interface Playlist {
  id: string;
  name: string;
  comment?: string;
  owner?: string;
  public?: boolean;
  songCount: number;
  duration: number;
  created: string;
  changed?: string;
  coverArt?: string;
}

export interface PlaylistWithSongs extends Playlist {
  entry?: Track[];
}

// Lyrics Types
export interface LyricLine {
  start: number; // Milliseconds from track start
  value: string; // Lyric text
}

export interface Lyrics {
  artist?: string;
  title?: string;
  value?: string; // Plain text lyrics (unsynced)
  line?: LyricLine[]; // Synchronized lyrics
}

// OpenSubsonic extended lyrics format
export interface StructuredLyrics {
  displayArtist?: string;
  displayTitle?: string;
  lang?: string;
  synced: boolean;
  line?: LyricLine[];
  value?: string; // Unsynced lyrics text
}

export interface LyricsList {
  structuredLyrics?: StructuredLyrics[];
}

// Play Queue Types
export interface PlayQueue {
  current?: string;
  position?: number;
  username?: string;
  changed?: string;
  changedBy?: string;
  entry?: Track[];
}

// Search Types
export interface SearchResult3 {
  artist?: Artist[];
  album?: Album[];
  song?: Track[];
}

// Share Types
export interface Share {
  id: string;
  url: string;
  description?: string;
  username: string;
  created: string;
  expires?: string;
  lastVisited?: string;
  visitCount: number;
  entry?: Track[];
}

// Starred Types
export interface Starred2 {
  artist?: Artist[];
  album?: Album[];
  song?: Track[];
}

// Index Types (for browsing)
export interface Index {
  name: string;
  artist: Artist[];
}

export interface Indexes {
  lastModified: number;
  ignoredArticles: string;
  index?: Index[];
  child?: MusicFolder[];
}

export interface MusicFolder {
  id: string;
  name: string;
}

export interface Directory {
  id: string;
  parent?: string;
  name: string;
  starred?: string;
  userRating?: number;
  averageRating?: number;
  playCount?: number;
  child?: Track[];
}

// Artist Info
export interface ArtistInfo {
  biography?: string;
  musicBrainzId?: string;
  lastFmUrl?: string;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  similarArtist?: Artist[];
}

// API Response Types
export interface PingResponse {
  status: 'ok';
  version: string;
}

export interface GetArtistsResponse {
  artists: {
    index?: {
      name: string;
      artist: Artist[];
    }[];
    ignoredArticles?: string;
  };
}

export interface GetArtistResponse {
  artist: ArtistWithAlbumsID3;
}

export interface GetAlbumResponse {
  album: AlbumWithSongsID3;
}

export interface GetAlbumListResponse {
  albumList: {
    album: Album[];
  };
}

export interface GetAlbumList2Response {
  albumList2: {
    album: Album[];
  };
}

export interface GetPlaylistsResponse {
  playlists: {
    playlist: Playlist[];
  };
}

export interface GetPlaylistResponse {
  playlist: PlaylistWithSongs;
}

export interface GetLyricsResponse {
  lyrics?: Lyrics; // Old format (Subsonic)
  lyricsList?: LyricsList; // New format (OpenSubsonic)
}

export interface GetPlayQueueResponse {
  playQueue: PlayQueue;
}

export interface SearchResponse3 {
  searchResult3: SearchResult3;
}

export interface GetStarredResponse2 {
  starred2: Starred2;
}

export interface GetSharesResponse {
  shares: {
    share: Share[];
  };
}

export interface GetShareResponse {
  share: Share;
}

export interface GetIndexesResponse {
  indexes: Indexes;
}

export interface GetMusicDirectoryResponse {
  directory: Directory;
}

export interface GetArtistInfoResponse {
  artistInfo2: ArtistInfo;
}

export interface GetSimilarSongsResponse {
  similarSongs: {
    song: Track[];
  };
}

export interface GetSimilarSongs2Response {
  similarSongs2: {
    song: Track[];
  };
}

export interface GetRandomSongsResponse {
  randomSongs: {
    song: Track[];
  };
}

export interface GetTopSongsResponse {
  topSongs: {
    song?: Track[];
  };
}

// Stream Parameters
export interface StreamParams {
  id: string;
  maxBitRate?: string;
  format?: string;
  timeOffset?: number;
  size?: string;
  estimateContentLength?: boolean;
}

// Cover Art Parameters
export interface CoverArtParams {
  id: string;
  size?: number;
}
