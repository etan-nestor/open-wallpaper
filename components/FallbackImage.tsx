// components/FallbackImage.tsx (version améliorée)
import React, { useState, useEffect } from 'react';
import { Image, ImageProps } from 'react-native';

// Cache pour stocker les URLs valides
const validUrlsCache = new Map<string, string>();

const EXTENSIONS = ['.jpeg', '.jpg', '.png', '.webp'];

interface FallbackImageProps extends ImageProps {
  sourceUri: string;
}

const FallbackImage: React.FC<FallbackImageProps> = ({ sourceUri, ...props }) => {
  const [currentUri, setCurrentUri] = useState(() => {
    // Vérifier d'abord le cache
    return validUrlsCache.get(sourceUri) || sourceUri;
  });

  const [extensionIndex, setExtensionIndex] = useState(0);

  const handleError = () => {
    if (sourceUri.toLowerCase().endsWith('.jfif') && extensionIndex < EXTENSIONS.length) {
      const newUri = sourceUri.replace('.jfif', EXTENSIONS[extensionIndex]);
      setCurrentUri(newUri);
      setExtensionIndex(extensionIndex + 1);
    }
  };

  const handleLoad = () => {
    // Si l'image a réussi à charger, mettre en cache
    if (currentUri !== sourceUri) {
      validUrlsCache.set(sourceUri, currentUri);
    }
  };

  return (
    <Image
      {...props}
      source={{ uri: currentUri }}
      onError={handleError}
      onLoad={handleLoad}
    />
  );
};

export default FallbackImage;