/**
 * Dino Music App - Playback Service
 * Background playback service for react-native-track-player
 */

import TrackPlayer, { Event } from 'react-native-track-player';
import { trackPlayerService } from './TrackPlayerService';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('[PlaybackService] Remote play');
    trackPlayerService.togglePlayPause();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('[PlaybackService] Remote pause');
    trackPlayerService.togglePlayPause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('[PlaybackService] Remote next');
    trackPlayerService.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('[PlaybackService] Remote previous');
    trackPlayerService.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    console.log('[PlaybackService] Remote seek:', event.position);
    trackPlayerService.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteSkip, (event) => {
    console.log('[PlaybackService] Remote skip to index:', event.index);
    trackPlayerService.playTrack(event.index);
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('[PlaybackService] Remote stop');
    TrackPlayer.stop();
  });
}
