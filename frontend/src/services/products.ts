import api from './api';
import { 
  Product, 
  ProductFormData, 
  ProductFilters, 
  PaginatedResponse, 
  ApiResponse 
} from '../types';

export const productsService = {
  // Получение списка товаров с фильтрацией и пагинацией
  async getProducts(
    page: number = 1,
    perPage: number = 20,
    filters?: ProductFilters
  ): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get<PaginatedResponse<Product>>(`/products?${params}`);
    return response.data;
  },

  // Получение товара по ID
  async getProduct(id: string): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data;
  },

  // Создание нового товара
  async createProduct(productData: ProductFormData): Promise<Product> {
    const response = await api.post<ApiResponse<Product>>('/products', productData);
    return response.data.data;
  },

  // Обновление товара
  async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<Product> {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, productData);
    return response.data.data;
  },

  // Удаление товара
  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  // Поиск товаров
  async searchProducts(query: string): Promise<Product[]> {
    const response = await api.get<PaginatedResponse<Product>>(`/products/search?q=${encodeURIComponent(query)}`);
    return response.data.data;
  },

  // Получение товаров с низким остатком
  async getLowStockProducts(): Promise<Product[]> {
    const response = await api.get<PaginatedResponse<Product>>('/products?stock_level=low');
    return response.data.data;
  },

  // Получение товаров без остатка
  async getOutOfStockProducts(): Promise<Product[]> {
    const response = await api.get<PaginatedResponse<Product>>('/products?stock_level=out');
    return response.data.data;
  },

  // Массовое обновление товаров
  async bulkUpdateProducts(updates: Array<{ id: string; data: Partial<ProductFormData> }>): Promise<void> {
    await api.post('/products/bulk-update', { updates });
  },

  // Экспорт товаров в CSV
  async exportProducts(filters?: ProductFilters): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/products/export?${params}`, {
      responseType: 'blob',
    });

    return response.data;
  },
}; 