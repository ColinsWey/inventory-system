import api from './api';
import { 
  DashboardStats, 
  StockAlert, 
  StockLevelData, 
  MovementTrendData,
  ApiResponse 
} from '../types';

export const dashboardService = {
  // Получение статистики для дашборда
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return response.data.data;
  },

  // Получение уведомлений о низких остатках
  async getStockAlerts(): Promise<StockAlert[]> {
    const response = await api.get<ApiResponse<StockAlert[]>>('/dashboard/alerts');
    return response.data.data;
  },

  // Получение данных для графика уровней остатков
  async getStockLevelsData(): Promise<StockLevelData[]> {
    const response = await api.get<ApiResponse<StockLevelData[]>>('/dashboard/stock-levels');
    return response.data.data;
  },

  // Получение данных для графика трендов движения товаров
  async getMovementTrendsData(days: number = 30): Promise<MovementTrendData[]> {
    const response = await api.get<ApiResponse<MovementTrendData[]>>(`/dashboard/movement-trends?days=${days}`);
    return response.data.data;
  },

  // Получение топ товаров по движению
  async getTopMovingProducts(limit: number = 10): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>(`/dashboard/top-products?limit=${limit}`);
    return response.data.data;
  },

  // Получение данных для графика категорий
  async getCategoriesData(): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/dashboard/categories-stats');
    return response.data.data;
  },
}; 