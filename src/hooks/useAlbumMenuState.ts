/**
 * Dino Music App - Album Menu State Hook
 * Reusable hook for managing AlbumMenu + related modals
 */

import { useState } from 'react';
import { Album } from '../api/opensubsonic/types';

export const useAlbumMenuState = () => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showAlbumMenu, setShowAlbumMenu] = useState(false);
  const [showAlbumInfo, setShowAlbumInfo] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  const openAlbumMenu = (album: Album) => {
    setSelectedAlbum(album);
    setShowAlbumMenu(true);
  };

  const closeAlbumMenu = () => {
    setShowAlbumMenu(false);
  };

  const handleShowInfo = () => {
    setShowAlbumInfo(true);
  };

  const handleShowAddToPlaylist = () => {
    setShowAddToPlaylist(true);
  };

  return {
    selectedAlbum,
    showAlbumMenu,
    showAlbumInfo,
    showAddToPlaylist,
    openAlbumMenu,
    closeAlbumMenu,
    setShowAlbumInfo,
    setShowAddToPlaylist,
    handleShowInfo,
    handleShowAddToPlaylist,
  };
};
