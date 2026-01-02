
export interface ThumbnailStyle {
  description: string;
  colors: string[];
  composition: string;
  typographyStyle: string;
}

export interface GenerationInput {
  imageDetail: string;
  textOnImage: string;
  tagline: string;
}

export enum Step {
  AUTH = 'AUTH',
  LINK_INPUT = 'LINK_INPUT',
  STYLE_ANALYSIS = 'STYLE_ANALYSIS',
  DETAILS_INPUT = 'DETAILS_INPUT',
  GENERATING = 'GENERATING',
  RESULT = 'RESULT'
}

export interface HistoryItem {
  id: string;
  originalUrl: string;
  originalThumbnail: string;
  generatedThumbnail: string;
  prompt: string;
  timestamp: number;
}
