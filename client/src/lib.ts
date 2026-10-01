import type { SpotifyImage } from './types';

// 215000 ms -> "3:35"
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${Math.floor(totalSeconds / 60)}:${seconds}`;
}

// Première image disponible (ou undefined si l'élément n'en a pas).
export function firstImage(images: SpotifyImage[]): string | undefined {
  return images[0]?.url;
}
