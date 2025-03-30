export interface ImageMetadata {
  objects: string[];
  scenes: string[];
  colors: {
    name: string;
    hex: string;
    percentage: number;
  }[];
  emotions: string[];
  technical_details: {
    orientation: string;
    quality: string;
    lighting: string;
    composition: string[];
  };
}

export interface Image {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  metadata: ImageMetadata;
  tags: string[];
  created_at: string;
  user_id: string;
}

export interface SearchFilters {
  objects?: string[];
  scenes?: string[];
  colors?: string[];
  emotions?: string[];
  technical?: {
    orientation?: string;
    quality?: string;
    lighting?: string;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
}