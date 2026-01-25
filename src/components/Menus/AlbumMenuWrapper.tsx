/**
 * Dino Music App - Album Menu Wrapper
 * Wrapper that handles AlbumMenu + all related modals automatically
 * Use this everywhere to ensure consistent behavior
 */

import React from 'react';
import { useAlbum, useCoverArt } from '../../hooks/api';
import { AlbumMenu } from './AlbumMenu';
import { AlbumInfoModal } from '../Modals/AlbumInfoModal';
import { AddToPlaylistModal } from '../Modals/AddToPlaylistModal';
import { Album } from '../../api/opensubsonic/types';

interface AlbumMenuWrapperProps {
  visible: boolean;
  onClose: () => void;
  album: Album | null;
  // Optional states for modals (managed externally)
  showAlbumInfo?: boolean;
  setShowAlbumInfo?: (show: boolean) => void;
  showAddToPlaylist?: boolean;
  setShowAddToPlaylist?: (show: boolean) => void;
}

export const AlbumMenuWrapper: React.FC<AlbumMenuWrapperProps> = ({
  visible,
  onClose,
  album,
  showAlbumInfo = false,
  setShowAlbumInfo,
  showAddToPlaylist = false,
  setShowAddToPlaylist,
}) => {
  const { data: albumDetails } = useAlbum(album?.id || '');
  const { data: coverArtUrl } = useCoverArt(album?.coverArt, 200);

  if (!album) return null;

  return (
    <>
      <AlbumMenu
        visible={visible}
        onClose={onClose}
        album={album}
        coverArtUrl={coverArtUrl || undefined}
        onShowInfo={() => setShowAlbumInfo?.(true)}
        onAddToPlaylist={() => setShowAddToPlaylist?.(true)}
      />

      {/* Album Info Modal */}
      {setShowAlbumInfo && (
        <AlbumInfoModal
          visible={showAlbumInfo}
          onClose={() => setShowAlbumInfo(false)}
          album={album}
          coverArtUrl={coverArtUrl || undefined}
        />
      )}

      {/* Add to Playlist Modal */}
      {setShowAddToPlaylist && (
        <AddToPlaylistModal
          visible={showAddToPlaylist}
          onClose={() => setShowAddToPlaylist(false)}
          songIds={albumDetails?.song?.map(s => s.id) || []}
          songTitle={album.name}
        />
      )}
    </>
  );
};
