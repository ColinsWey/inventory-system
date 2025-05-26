import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  PresentationChartLineIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

import { analyticsApi } from '../api/analyticsApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import Button from '../components/ui/Button';
import DateRangePicker from '../components/ui/DateRangePicker';

// Регистрация компонентов Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement
);

interface DateRange {
  startDate: Date;
  endDate: Date;
}

const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  // Получение данных дашборда
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: analyticsApi.getDashboardData,
  });

  // Получение аналитики по остаткам
  const { data: inventoryAnalytics, isLoading: isInventoryLoading } = useQuery({
    queryKey: ['analytics', 'inventory', dateRange],
    queryFn: () =>
      analyticsApi.getInventoryAnalytics({
        start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
        end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
      }),
  });

  // Получение трендов
  const { data: trendsData, isLoading: isTrendsLoading } = useQuery({
    queryKey: ['analytics', 'trends', 30],
    queryFn: () => analyticsApi.getTrends({ days: 30 }),
  });

  const handleExportReport = async () => {
    try {
      const blob = await analyticsApi.exportReport({
        start_date: format(dateRange.startDate, 'yyyy-MM-dd'),
        end_date: format(dateRange.endDate, 'yyyy-MM-dd'),
        format: 'excel',
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Ошибка экспорта отчета:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(amount);
  };

  // Данные для графика продаж по дням
  const salesChartData = {
    labels: trendsData?.daily_sales?.map((item: any) =>
      format(new Date(item.date), 'dd.MM', { locale: ru })
    ) || [],
    datasets: [
      {
        label: 'Продажи',
        data: trendsData?.daily_sales?.map((item: any) => item.amount) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
    ],
  };

  // Данные для графика остатков по категориям
  const inventoryChartData = {
    labels: inventoryAnalytics?.by_category?.map((item: any) => item.category_name) || [],
    datasets: [
      {
        label: 'Количество товаров',
        data: inventoryAnalytics?.by_category?.map((item: any) => item.total_quantity) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
      },
    ],
  };

  // Данные для ABC-анализа
  const abcChartData = {
    labels: ['A-товары', 'B-товары', 'C-товары'],
    datasets: [
      {
        data: [
          inventoryAnalytics?.abc_analysis?.a_count || 0,
          inventoryAnalytics?.abc_analysis?.b_count || 0,
          inventoryAnalytics?.abc_analysis?.c_count || 0,
        ],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  if (isDashboardLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
          <p className="text-gray-600">Отчеты и аналитика по складским операциям</p>
        </div>
        <div className="flex space-x-4">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={setDateRange}
          />
          <Button onClick={handleExportReport} className="flex items-center space-x-2">
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span>Экспорт</span>
          </Button>
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Общая стоимость остатков</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(dashboardData?.total_inventory_value || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <PresentationChartLineIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Активных товаров</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.active_products_count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TableCellsIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Товаров с низким остатком</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.low_stock_count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Товаров закончилось</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.out_of_stock_count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График продаж */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Динамика продаж (30 дней)
          </h3>
          {isTrendsLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="h-64">
              <Line data={salesChartData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* График остатков по категориям */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Остатки по категориям
          </h3>
          {isInventoryLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="h-64">
              <Bar data={inventoryChartData} options={chartOptions} />
            </div>
          )}
        </div>
      </div>

      {/* ABC-анализ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ABC-анализ товаров</h3>
          {isInventoryLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="h-64">
              <Doughnut data={abcChartData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* Топ товаров */}
        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Топ товаров по продажам
          </h3>
          {isInventoryLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-3">
              {inventoryAnalytics?.top_products?.slice(0, 5).map((product: any, index: number) => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{product.sales_count} шт.</p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(product.sales_amount)}
                    </p>
                  </div>
                </div>
              )) || []}
            </div>
          )}
        </div>
      </div>

      {/* Таблица категорий */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Анализ по категориям</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Товаров
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Общее количество
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Стоимость остатков
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Оборачиваемость
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryAnalytics?.by_category?.map((category: any) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {category.category_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.products_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.total_quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(category.total_value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.turnover_rate?.toFixed(2) || 'N/A'}
                  </td>
                </tr>
              )) || []}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage; 