import { Timestamp } from 'firebase/firestore';

export interface Category {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  icon: string;
  count: number;
  priority: number;
  isActive: boolean;
  coverImage: string;
  thumbnail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Wallpaper {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  originalUrl: string;
  optimizedUrl: string;
  thumbnailUrl: string;
  palette: {
    primary: string;
    secondary: string;
    isDark: boolean;
  };
  resolution: string;
  aspectRatio: string;
  size: number;
  fileType: string;
  downloads: number;
  likes: number;
  views: number;
  tags: string[];
  isPremium: boolean;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  uploadedBy: string;
}