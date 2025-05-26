import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, EyeIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';

import { salesApi } from '../api/salesApi';
import { Sale, SaleCreate } from '../types/sale';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SaleForm from '../components/sales/SaleForm';
import SaleFilters from '../components/sales/SaleFilters';
import Pagination from '../components/ui/Pagination';

interface SalesFilters {
  product_id?: string;
  customer_name?: string;
  date_from?: string;
  date_to?: string;
}

const SalesPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SalesFilters>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  const queryClient = useQueryClient();

  // Получение списка продаж
  const { data: salesData, isLoading, error } = useQuery({
    queryKey: ['sales', page, filters],
    queryFn: () => salesApi.getSales({ page, size: 20, ...filters }),
  });

  // Создание продажи
  const createSaleMutation = useMutation({
    mutationFn: salesApi.createSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setIsCreateModalOpen(false);
      toast.success('Продажа успешно создана');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Ошибка создания продажи');
    },
  });

  const handleCreateSale = (data: SaleCreate) => {
    createSaleMutation.mutate(data);
  };

  const handleFilterChange = (newFilters: SalesFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Ошибка загрузки продаж" />;

  const sales = salesData?.items || [];
  const totalPages = Math.ceil((salesData?.total || 0) / 20);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Продажи</h1>
          <p className="text-gray-600">Управление продажами и аналитика</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Новая продажа</span>
        </Button>
      </div>

      {/* Фильтры */}
      <SaleFilters onFilterChange={handleFilterChange} />

      {/* Статистика */}
      {salesData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего продаж</p>
                <p className="text-2xl font-bold text-gray-900">{salesData.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Сумма продаж</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    sales.reduce((sum, sale) => sum + sale.total_amount, 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <EyeIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Средний чек</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    sales.length > 0
                      ? sales.reduce((sum, sale) => sum + sale.total_amount, 0) / sales.length
                      : 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Таблица продаж */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Товар
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Клиент
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Количество
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(sale.sale_date), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {sale.product?.name || 'Неизвестный товар'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {sale.product?.sku}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.customer_name || 'Не указан'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(sale.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sales.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Продажи не найдены</p>
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Модальное окно создания продажи */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Новая продажа"
      >
        <SaleForm
          onSubmit={handleCreateSale}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={createSaleMutation.isPending}
        />
      </Modal>

      {/* Модальное окно просмотра продажи */}
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title="Детали продажи"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Дата</label>
              <p className="text-sm text-gray-900">
                {format(new Date(selectedSale.sale_date), 'dd.MM.yyyy HH:mm', { locale: ru })}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Товар</label>
              <p className="text-sm text-gray-900">
                {selectedSale.product?.name} ({selectedSale.product?.sku})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Клиент</label>
              <p className="text-sm text-gray-900">
                {selectedSale.customer_name || 'Не указан'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Количество</label>
                <p className="text-sm text-gray-900">{selectedSale.quantity}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Цена за единицу</label>
                <p className="text-sm text-gray-900">{formatCurrency(selectedSale.unit_price)}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Общая сумма</label>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(selectedSale.total_amount)}
              </p>
            </div>
            {selectedSale.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Примечания</label>
                <p className="text-sm text-gray-900">{selectedSale.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SalesPage; 