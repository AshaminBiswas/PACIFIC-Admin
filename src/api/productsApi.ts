import apiClient from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  ProductCategory,
  ProductMaterial,
  ProductFinish,
  ProductUnit,
  ProductSubcategory,
} from '../types/admin';

export const productsMasterApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/products/master', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<Product>>(`/products/master/${id}`),
  create: (data: any) => apiClient.post<ApiResponse<Product>>('/products/master', data),
  update: (id: string, data: any) => apiClient.patch<ApiResponse<Product>>(`/products/master/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/master/${id}`),
  getMaterials: () => apiClient.get<ApiResponse<ProductMaterial[]>>('/products/master/materials'),
  getFinishes: () => apiClient.get<ApiResponse<ProductFinish[]>>('/products/master/finishes'),
  getUnits: () => apiClient.get<ApiResponse<ProductUnit[]>>('/products/master/units'),
  getSubcategories: (categoryId?: string) =>
    apiClient.get<ApiResponse<ProductSubcategory[]>>('/products/master/subcategories', { params: { categoryId } }),
};

export const productsApi = {
  list: (params?: Record<string, any>) =>
    apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/products', { params }),
  getById: (id: string) => apiClient.get<ApiResponse<Product>>(`/products/${id}`),
  create: (data: Partial<Product>) => apiClient.post<ApiResponse<Product>>('/products', data),
  update: (id: string, data: Partial<Product>) => apiClient.put<ApiResponse<Product>>(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
  listCategories: () => apiClient.get<ApiResponse<ProductCategory[]>>('/products/categories'),
  createCategory: (data: Partial<ProductCategory>) =>
    apiClient.post<ApiResponse<ProductCategory>>('/products/categories', data),
};
