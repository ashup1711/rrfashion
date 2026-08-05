export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  category?: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
}
