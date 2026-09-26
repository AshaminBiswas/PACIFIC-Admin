import apiClient from './client';
import { supabase } from '../lib/supabase';
import type {
  ApiResponse,
  PaginatedResponse,
  Blog,
  GalleryImage,
  Catalog,
  Faq,
  Testimonial,
  Lead,
  ConfiguratorDesign,
  Quotation,
  CommercialProject,
  Invoice,
  AuditLog,
} from '../types/admin';

export const cmsApi = {
  listBlogs: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Blog>>>('/cms/blogs', { params }),
  createBlog: (data: Partial<Blog>) => apiClient.post('/cms/blogs', data),
  updateBlog: (id: string, data: Partial<Blog>) => apiClient.put(`/cms/blogs/${id}`, data),
  deleteBlog: async (id: string) => {
    try {
      return await apiClient.delete(`/cms/blogs/${id}`);
    } catch {
      return await supabase.from('blogs').delete().eq('id', id);
    }
  },

  listGallery: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<GalleryImage>>>('/cms/gallery', { params }),
  createGalleryImage: (data: Partial<GalleryImage>) => apiClient.post('/cms/gallery', data),
  updateGalleryImage: (id: string, data: Partial<GalleryImage>) =>
    apiClient.put(`/cms/gallery/${id}`, data),
  deleteGalleryImage: async (id: string) => {
    try {
      return await apiClient.delete(`/cms/gallery/${id}`);
    } catch {
      return await supabase.from('gallery_images').delete().eq('id', id);
    }
  },

  listCatalogs: () => apiClient.get<ApiResponse<Catalog[]>>('/cms/catalogs'),
  createCatalog: (data: Partial<Catalog>) => apiClient.post('/cms/catalogs', data),
  deleteCatalog: async (id: string) => {
    try {
      return await apiClient.delete(`/cms/catalogs/${id}`);
    } catch {
      return await supabase.from('catalogs').delete().eq('id', id);
    }
  },

  listFaqs: () => apiClient.get<ApiResponse<Faq[]>>('/cms/faqs'),
  createFaq: (data: Partial<Faq>) => apiClient.post('/cms/faqs', data),
  updateFaq: (id: string, data: Partial<Faq>) => apiClient.put(`/cms/faqs/${id}`, data),
  deleteFaq: async (id: string) => {
    try {
      return await apiClient.delete(`/cms/faqs/${id}`);
    } catch {
      return await supabase.from('faqs').delete().eq('id', id);
    }
  },

  listTestimonials: () => apiClient.get<ApiResponse<Testimonial[]>>('/cms/testimonials'),
  createTestimonial: (data: Partial<Testimonial>) => apiClient.post('/cms/testimonials', data),
  updateTestimonial: (id: string, data: Partial<Testimonial>) =>
    apiClient.put(`/cms/testimonials/${id}`, data),
  deleteTestimonial: async (id: string) => {
    try {
      return await apiClient.delete(`/cms/testimonials/${id}`);
    } catch {
      return await supabase.from('testimonials').delete().eq('id', id);
    }
  },
};

export const configuratorApi = {
  list: async (params?: Record<string, any>) => {
    try {
      return await apiClient.get<ApiResponse<PaginatedResponse<ConfiguratorDesign>>>('/configurator', { params });
    } catch {
      const { data, count } = await supabase.from('configurator_designs').select('*', { count: 'exact' });
      return {
        data: {
          success: true,
          data: {
            items: (data as any[]) || [],
            total: count || (data?.length ?? 0),
            page: params?.page || 1,
            limit: params?.limit || 20,
            totalPages: Math.ceil((count || (data?.length ?? 0)) / (params?.limit || 20)) || 1,
          },
        },
      } as any;
    }
  },
  getById: (id: string) => apiClient.get<ApiResponse<ConfiguratorDesign>>(`/configurator/${id}`),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/configurator/${id}/status`, { status }),
  delete: async (id: string) => {
    try {
      return await apiClient.delete(`/configurator/${id}`);
    } catch {
      const { error } = await supabase.from('configurator_designs').delete().eq('id', id);
      if (error) throw error;
      return { data: { success: true } } as any;
    }
  },
};

export const quotesApi = {
  list: async (params?: Record<string, any>) => {
    try {
      return await apiClient.get<ApiResponse<PaginatedResponse<Quotation>>>('/quotes', { params });
    } catch {
      const { data, count } = await supabase.from('quotations').select('*', { count: 'exact' });
      return {
        data: {
          success: true,
          data: {
            items: (data as any[]) || [],
            total: count || (data?.length ?? 0),
            page: params?.page || 1,
            limit: params?.limit || 20,
            totalPages: Math.ceil((count || (data?.length ?? 0)) / (params?.limit || 20)) || 1,
          },
        },
      } as any;
    }
  },
  getById: (id: string) => apiClient.get<ApiResponse<Quotation>>(`/quotes/${id}`),
  create: (data: Partial<Quotation>) => apiClient.post<ApiResponse<Quotation>>('/quotes', data),
  update: (id: string, data: any) => apiClient.patch<ApiResponse<Quotation>>(`/quotes/${id}`, data),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/quotes/${id}/status`, { status }),
  delete: async (id: string) => {
    try {
      return await apiClient.delete(`/quotes/${id}`);
    } catch {
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw error;
      return { data: { success: true } } as any;
    }
  },
};

export const leadsApi = {
  list: async (params?: Record<string, any>) => {
    try {
      return await apiClient.get<ApiResponse<PaginatedResponse<Lead>>>('/leads', { params });
    } catch {
      const { data, count } = await supabase.from('leads').select('*', { count: 'exact' });
      return {
        data: {
          success: true,
          data: {
            items: (data as any[]) || [],
            total: count || (data?.length ?? 0),
            page: params?.page || 1,
            limit: params?.limit || 20,
            totalPages: Math.ceil((count || (data?.length ?? 0)) / (params?.limit || 20)) || 1,
          },
        },
      } as any;
    }
  },
  getById: (id: string) => apiClient.get<ApiResponse<Lead>>(`/leads/${id}`),
  update: (id: string, data: Partial<Lead>) => apiClient.put<ApiResponse<Lead>>(`/leads/${id}`, data),
  delete: async (id: string) => {
    try {
      return await apiClient.delete(`/leads/${id}`);
    } catch {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
      return { data: { success: true } } as any;
    }
  },
  getStats: () => apiClient.get('/leads/stats'),
};

export const projectsApi = {
  list: async (params?: Record<string, any>) => {
    try {
      return await apiClient.get<ApiResponse<PaginatedResponse<CommercialProject>>>('/projects', { params });
    } catch {
      const { data, count } = await supabase.from('commercial_projects').select('*', { count: 'exact' });
      return {
        data: {
          success: true,
          data: {
            items: (data as any[]) || [],
            total: count || (data?.length ?? 0),
            page: params?.page || 1,
            limit: params?.limit || 20,
            totalPages: Math.ceil((count || (data?.length ?? 0)) / (params?.limit || 20)) || 1,
          },
        },
      } as any;
    }
  },
  getById: (id: string) => apiClient.get<ApiResponse<CommercialProject>>(`/projects/${id}`),
  create: (data: Partial<CommercialProject>) =>
    apiClient.post<ApiResponse<CommercialProject>>('/projects', data),
  update: (id: string, data: Partial<CommercialProject>) =>
    apiClient.put<ApiResponse<CommercialProject>>(`/projects/${id}`, data),
  delete: async (id: string) => {
    try {
      return await apiClient.delete(`/projects/${id}`);
    } catch {
      const { error } = await supabase.from('commercial_projects').delete().eq('id', id);
      if (error) throw error;
      return { data: { success: true } } as any;
    }
  },
};



export const auditApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>('/audit', { params }),
};
