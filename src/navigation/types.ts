/**
 * Dino Music App - Navigation Types
 * TypeScript types for navigation parameters
 */

import { Track, Album, Artist, Playlist } from '../api/opensubsonic/types';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  ServerSetup: undefined;
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
  Settings: undefined;
};

export type LibraryStackParamList = {
  LibraryTabs: undefined;
  AlbumDetail: { albumId: string; album?: Album };
  ArtistDetail: { artistId: string; artist?: Artist };
  PlaylistDetail: { playlistId: string; playlist?: Playlist };
};

export type PlayerStackParamList = {
  FullPlayer: undefined;
  Lyrics: undefined;
};
