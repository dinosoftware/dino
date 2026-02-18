/**
 * Dino Music App - Cover Art Image
 * Image component with automatic fallback to placeholder on error
 */

import React, { useState } from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';

interface CoverArtImageProps {
  uri?: string | null;
  style: StyleProp<ImageStyle>;
  placeholder?: ImageSourcePropType;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export const AlbumArtImage: React.FC<CoverArtImageProps> = ({
  uri,
  style,
  resizeMode = 'cover',
}) => {
  const [error, setError] = useState(false);

  if (error || !uri) {
    return (
      <Image
        source={require('../../../assets/images/album_art_placeholder.png')}
        style={style}
        resizeMode={resizeMode}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setError(true)}
    />
  );
};

export const ArtistArtImage: React.FC<CoverArtImageProps> = ({
  uri,
  style,
  resizeMode = 'cover',
}) => {
  const [error, setError] = useState(false);

  if (error || !uri) {
    return (
      <Image
        source={require('../../../assets/images/artist_art_placeholder.png')}
        style={style}
        resizeMode={resizeMode}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setError(true)}
    />
  );
};
