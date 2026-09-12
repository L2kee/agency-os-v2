export interface Prospect {
  place_id: string;
  business_name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  has_website: boolean;
  rating: number | null;
  reviews: number | null;
}

export interface SearchResult {
  prospects?: Prospect[];
  error?: string;
}

export interface ImportResult {
  imported: number;
  skipped?: number;
  error?: string;
}
