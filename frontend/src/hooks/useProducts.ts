import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../services/products';
import { Product, ProductFormData, ProductFilters } from '../types';
import toast from 'react-hot-toast';

// Ключи для React Query
export const PRODUCTS_QUERY_KEYS = {
  all: ['products'] as const,
  lists: () => [...PRODUCTS_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: ProductFilters) => [...PRODUCTS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PRODUCTS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PRODUCTS_QUERY_KEYS.details(), id] as const,
  lowStock: () => [...PRODUCTS_QUERY_KEYS.all, 'low-stock'] as const,
  outOfStock: () => [...PRODUCTS_QUERY_KEYS.all, 'out-of-stock'] as const,
};

// Хук для получения списка товаров
export const useProducts = (
  page: number = 1,
  perPage: number = 20,
  filters?: ProductFilters
) => {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEYS.list(filters),
    queryFn: () => productsService.getProducts(page, perPage, filters),
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
};

// Хук для получения конкретного товара
export const useProduct = (id: string) => {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEYS.detail(id),
    queryFn: () => productsService.getProduct(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Хук для получения товаров с низким остатком
export const useLowStockProducts = () => {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEYS.lowStock(),
    queryFn: () => productsService.getLowStockProducts(),
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
};

// Хук для получения товаров без остатка
export const useOutOfStockProducts = () => {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEYS.outOfStock(),
    queryFn: () => productsService.getOutOfStockProducts(),
    staleTime: 2 * 60 * 1000,
  });
};

// Хук для создания товара
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productData: ProductFormData) => 
      productsService.createProduct(productData),
    onSuccess: (newProduct) => {
      // Инвалидируем кеш списков товаров
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEYS.lists() });
      
      // Добавляем новый товар в кеш
      queryClient.setQueryData(
        PRODUCTS_QUERY_KEYS.detail(newProduct.id),
        newProduct
      );

      toast.success('Товар успешно создан');
    },
    onError: (error: any) => {
      toast.error(error.detail || 'Ошибка создания товара');
    },
  });
};

// Хук для обновления товара
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductFormData> }) =>
      productsService.updateProduct(id, data),
    onSuccess: (updatedProduct) => {
      // Обновляем кеш конкретного товара
      queryClient.setQueryData(
        PRODUCTS_QUERY_KEYS.detail(updatedProduct.id),
        updatedProduct
      );

      // Инвалидируем кеш списков товаров
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEYS.lists() });

      toast.success('Товар успешно обновлен');
    },
    onError: (error: any) => {
      toast.error(error.detail || 'Ошибка обновления товара');
    },
  });
};

// Хук для удаления товара
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsService.deleteProduct(id),
    onSuccess: (_, deletedId) => {
      // Удаляем товар из кеша
      queryClient.removeQueries({ queryKey: PRODUCTS_QUERY_KEYS.detail(deletedId) });

      // Инвалидируем кеш списков товаров
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEYS.lists() });

      toast.success('Товар успешно удален');
    },
    onError: (error: any) => {
      toast.error(error.detail || 'Ошибка удаления товара');
    },
  });
};

// Хук для поиска товаров
export const useSearchProducts = (query: string) => {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEYS.all, 'search', query],
    queryFn: () => productsService.searchProducts(query),
    enabled: query.length > 2, // Поиск только если запрос больше 2 символов
    staleTime: 30 * 1000, // 30 секунд
  });
};

// Хук для экспорта товаров
export const useExportProducts = () => {
  return useMutation({
    mutationFn: (filters?: ProductFilters) => 
      productsService.exportProducts(filters),
    onSuccess: (blob) => {
      // Создаем ссылку для скачивания файла
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Экспорт товаров завершен');
    },
    onError: (error: any) => {
      toast.error(error.detail || 'Ошибка экспорта товаров');
    },
  });
}; 