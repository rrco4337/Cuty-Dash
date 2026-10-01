export interface SpotifyImage {
  url: string;
}

export interface Me {
  id: string;
  display_name: string | null;
  images: SpotifyImage[];
  followers: { total: number };
  external_urls: { spotify: string };
}

export interface Artist {
  id: string;
  name: string;
  genres?: string[]; // absent chez certains artistes
  images: SpotifyImage[];
  external_urls: { spotify: string };
}

export interface Track {
  id: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { name: string; images: SpotifyImage[] };
  external_urls: { spotify: string };
}

// Réponse de /me/player : null quand aucun appareil n'est actif.
export interface Playback {
  is_playing: boolean;
  progress_ms: number | null;
  item: Track | null;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';
