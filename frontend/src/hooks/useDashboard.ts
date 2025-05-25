import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard';

// Ключи для React Query
export const DASHBOARD_QUERY_KEYS = {
  all: ['dashboard'] as const,
  stats: () => [...DASHBOARD_QUERY_KEYS.all, 'stats'] as const,
  alerts: () => [...DASHBOARD_QUERY_KEYS.all, 'alerts'] as const,
  stockLevels: () => [...DASHBOARD_QUERY_KEYS.all, 'stock-levels'] as const,
  movementTrends: (days: number) => [...DASHBOARD_QUERY_KEYS.all, 'movement-trends', days] as const,
  topProducts: (limit: number) => [...DASHBOARD_QUERY_KEYS.all, 'top-products', limit] as const,
  categories: () => [...DASHBOARD_QUERY_KEYS.all, 'categories'] as const,
};

// Хук для получения статистики дашборда
export const useDashboardStats = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.stats(),
    queryFn: () => dashboardService.getDashboardStats(),
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 5 * 60 * 1000, // 5 минут
    refetchInterval: 5 * 60 * 1000, // Обновляем каждые 5 минут
  });
};

// Хук для получения уведомлений о низких остатках
export const useStockAlerts = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.alerts(),
    queryFn: () => dashboardService.getStockAlerts(),
    staleTime: 1 * 60 * 1000, // 1 минута
    refetchInterval: 2 * 60 * 1000, // Обновляем каждые 2 минуты
  });
};

// Хук для получения данных уровней остатков
export const useStockLevelsData = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.stockLevels(),
    queryFn: () => dashboardService.getStockLevelsData(),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};

// Хук для получения трендов движения товаров
export const useMovementTrendsData = (days: number = 30) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.movementTrends(days),
    queryFn: () => dashboardService.getMovementTrendsData(days),
    staleTime: 10 * 60 * 1000, // 10 минут
  });
};

// Хук для получения топ товаров по движению
export const useTopMovingProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.topProducts(limit),
    queryFn: () => dashboardService.getTopMovingProducts(limit),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};

// Хук для получения данных по категориям
export const useCategoriesData = () => {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.categories(),
    queryFn: () => dashboardService.getCategoriesData(),
    staleTime: 10 * 60 * 1000, // 10 минут
  });
}; 