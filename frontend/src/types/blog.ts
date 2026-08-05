import type { PaginatedResponse } from './api';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  category?: string;
  tags: string[];
  author?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  date?: string;
}

export type BlogListResponse = PaginatedResponse<BlogPost>;
