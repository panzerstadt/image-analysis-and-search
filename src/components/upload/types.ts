export interface ImageAnalysis {
  objects: string[];
  scenes: string[];
  tags: string[];
  description: string;
  technical_details: {
    orientation: string;
    quality: string;
    lighting: string;
    composition: string[];
  };
  raw_results: {
    llm_analysis: {
      objects: Array<{ label: string; confidence: number; } | string>;
      scenes: Array<{ label: string; confidence: number; } | string>;
      tags: string[];
      description: string;
    };
  };
}

export interface ImageFile {
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  analysis?: ImageAnalysis;
  isAnalyzing?: boolean;
  isGeneratingDescription?: boolean;
}

export interface MetadataFormData {
  title: string;
  description: string;
  tags: string[];
  objects: string[];
  scenes: string[];
  emotions: string[];
  technical: {
    orientation: string;
    quality: string;
    lighting: string;
    composition: string[];
  };
}

export const defaultMetadata: MetadataFormData = {
  title: '',
  description: '',
  tags: [],
  objects: [],
  scenes: [],
  emotions: [],
  technical: {
    orientation: 'landscape',
    quality: 'high',
    lighting: 'natural',
    composition: [],
  },
};