/**
 * Dino Music App - Track Menu State Hook
 * Reusable hook for managing TrackMenu + related modals
 */

import { useState } from 'react';
import { Artist, Track } from '../api/opensubsonic/types';

export const useTrackMenuState = () => {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [showSongInfo, setShowSongInfo] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState({ title: '', message: '' });
  const [showArtistSelection, setShowArtistSelection] = useState(false);
  const [artistsToSelect, setArtistsToSelect] = useState<Artist[]>([]);

  const openTrackMenu = (track: Track) => {
    setSelectedTrack(track);
    setShowTrackMenu(true);
  };

  const closeTrackMenu = () => {
    setShowTrackMenu(false);
  };

  const handleShowInfo = () => {
    setShowSongInfo(true);
  };

  const handleShowAddToPlaylist = () => {
    setShowAddToPlaylist(true);
  };

  const handleShowConfirm = (title: string, message: string) => {
    setConfirmMessage({ title, message });
    setShowConfirm(true);
  };

  const handleGoToArtist = (artists: Artist[]) => {
    setArtistsToSelect(artists);
    setShowArtistSelection(true);
  };

  return {
    selectedTrack,
    showTrackMenu,
    showSongInfo,
    showAddToPlaylist,
    showConfirm,
    confirmMessage,
    showArtistSelection,
    artistsToSelect,
    openTrackMenu,
    closeTrackMenu,
    setShowSongInfo,
    setShowAddToPlaylist,
    setShowConfirm,
    setShowArtistSelection,
    handleShowInfo,
    handleShowAddToPlaylist,
    handleShowConfirm,
    handleGoToArtist,
  };
};
