export interface SpotifyImage {
  url: string;
}

export interface Me {
  id: string;
  display_name: string | null;
  images: SpotifyImage[];
}

export interface Artist {
  id: string;
  name: string;
  genres: string[];
  images: SpotifyImage[];
  external_urls: { spotify: string };
}
