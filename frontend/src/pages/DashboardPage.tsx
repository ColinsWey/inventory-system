import React from 'react';
import { 
  CubeIcon, 
  ExclamationTriangleIcon, 
  ChartBarIcon,
  TagIcon 
} from '@heroicons/react/24/outline';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useDashboardStats, useStockAlerts } from '../hooks/useDashboard';
import { formatCurrency, formatNumber, getStockLevelColor } from '../utils';

// Компонент статистической карточки
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, change }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-lg font-medium text-gray-900">
              {typeof value === 'number' ? formatNumber(value) : value}
            </dd>
          </dl>
        </div>
      </div>
      {change && (
        <div className="mt-4">
          <div className="flex items-center text-sm">
            <span className={`${
              change.type === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
            </span>
            <span className="text-gray-500 ml-2">за последний месяц</span>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

// Компонент уведомления о низких остатках
const StockAlert: React.FC<{ alert: any }> = ({ alert }) => (
  <div className="flex items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" />
    <div className="flex-1">
      <p className="text-sm font-medium text-yellow-800">
        {alert.product.name}
      </p>
      <p className="text-xs text-yellow-600">
        Остаток: {alert.current_level} {alert.product.unit_of_measure}
        {alert.threshold_level && ` (мин: ${alert.threshold_level})`}
      </p>
    </div>
    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
      getStockLevelColor(alert.current_level, alert.threshold_level)
    }`}>
      {alert.alert_type === 'low_stock' ? 'Низкий остаток' : 'Нет в наличии'}
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: alerts, isLoading: alertsLoading } = useStockAlerts();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Ошибка загрузки данных
            </h3>
            <div className="mt-2 text-sm text-red-700">
              Не удалось загрузить статистику дашборда
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Главная панель</h1>
        <p className="mt-1 text-sm text-gray-600">
          Обзор состояния товарных остатков
        </p>
      </div>

      {/* Статистические карточки */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Всего товаров"
          value={stats?.total_products || 0}
          icon={CubeIcon}
          color="bg-blue-500"
          change={{ value: 5.2, type: 'increase' }}
        />
        <StatsCard
          title="Низкий остаток"
          value={stats?.low_stock_products || 0}
          icon={ExclamationTriangleIcon}
          color="bg-yellow-500"
        />
        <StatsCard
          title="Нет в наличии"
          value={stats?.out_of_stock_products || 0}
          icon={ExclamationTriangleIcon}
          color="bg-red-500"
        />
        <StatsCard
          title="Общая стоимость"
          value={formatCurrency(stats?.total_value || 0)}
          icon={ChartBarIcon}
          color="bg-green-500"
          change={{ value: 2.1, type: 'increase' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Уведомления о низких остатках */}
        <Card>
          <CardHeader>
            <CardTitle>Уведомления о остатках</CardTitle>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : alerts && alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <StockAlert key={alert.id} alert={alert} />
                ))}
                {alerts.length > 5 && (
                  <div className="text-center">
                    <button className="text-sm text-blue-600 hover:text-blue-500">
                      Показать еще {alerts.length - 5} уведомлений
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Нет уведомлений
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Все товары имеют достаточный остаток
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Быстрые действия */}
        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <CubeIcon className="h-8 w-8 text-blue-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  Добавить товар
                </span>
              </button>
              
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <TagIcon className="h-8 w-8 text-green-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  Новая категория
                </span>
              </button>
              
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <ChartBarIcon className="h-8 w-8 text-purple-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  Отчеты
                </span>
              </button>
              
              <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">
                  Импорт данных
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Последние движения товаров */}
      <Card>
        <CardHeader>
          <CardTitle>Последние движения товаров</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Данные загружаются
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Здесь будет отображаться история движений товаров
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage; 