import { Category } from "@/constants/category";
import { SubmissionStatus } from "@/constants/submission-status";

export interface Service {
  id: string;
  /** Directus primary key — used by the Visual Editor (setAttr `item`). */
  cmsId?: number;
  title: string;
  description: string;
  category: Category.CLEANING | Category.CONSTRUCTION;
  duration: string;
  benefits: string[];
  features: string[];
  iconName: string;
  popular?: boolean;
}

export interface Project {
  id: string;
  /** Directus primary key — used by the Visual Editor (setAttr `item`). */
  cmsId?: number;
  title: string;
  client: string;
  category: Category.CLEANING | Category.CONSTRUCTION;
  location: string;
  area: string;
  completionTime: string;
  description: string;
  achievement: string;
  imageUrl: string;
  tags: string[];
  testimonial?: {
    author: string;
    role: string;
    content: string;
    avatarUrl?: string;
    rating: number;
  };
}

export interface Testimonial {
  id: string;
  /** Directus primary key — used by the Visual Editor (setAttr `item`). */
  cmsId?: number;
  author: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatarUrl: string;
  category: Category;
}

export interface ContactSubmission {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  serviceCategory: Category;
  serviceId: string;
  companyName?: string;
  address?: string;
  message: string;
  submittedAt: string;
  status: SubmissionStatus;
}
