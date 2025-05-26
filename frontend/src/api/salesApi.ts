import apiClient from './client';
import { Sale, SaleCreate, SalesResponse } from '../types/sale';

interface GetSalesParams {
  page?: number;
  size?: number;
  product_id?: string;
  customer_name?: string;
  date_from?: string;
  date_to?: string;
}

interface SalesAnalytics {
  total_sales: number;
  total_amount: number;
  average_sale: number;
  period: {
    start_date: string;
    end_date: string;
  };
}

export const salesApi = {
  // Получение списка продаж
  async getSales(params: GetSalesParams = {}): Promise<SalesResponse> {
    const response = await apiClient.get('/sales', { params });
    return response.data;
  },

  // Получение продажи по ID
  async getSale(id: string): Promise<Sale> {
    const response = await apiClient.get(`/sales/${id}`);
    return response.data;
  },

  // Создание продажи
  async createSale(data: SaleCreate): Promise<Sale> {
    const response = await apiClient.post('/sales', data);
    return response.data;
  },

  // Обновление продажи
  async updateSale(id: string, data: Partial<SaleCreate>): Promise<Sale> {
    const response = await apiClient.put(`/sales/${id}`, data);
    return response.data;
  },

  // Удаление продажи
  async deleteSale(id: string): Promise<void> {
    await apiClient.delete(`/sales/${id}`);
  },

  // Аналитика продаж
  async getSalesAnalytics(params: {
    date_from?: string;
    date_to?: string;
  } = {}): Promise<SalesAnalytics> {
    const response = await apiClient.get('/sales/analytics/summary', { params });
    return response.data;
  },

  // Экспорт продаж
  async exportSales(params: {
    format: 'excel' | 'csv';
    date_from?: string;
    date_to?: string;
  }): Promise<Blob> {
    const response = await apiClient.get('/sales/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
}; 