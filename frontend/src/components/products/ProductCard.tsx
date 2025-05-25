import React, { useState } from 'react';
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  ChartBarIcon,
  CubeIcon,
  TagIcon,
  CurrencyDollarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Product } from '../../types';
import { formatCurrency, formatNumber, formatDate, cn } from '../../utils';
import ColorIndicator, { ColorProgressBar, StatusCard } from './ColorIndicator';
import Button from '../ui/Button';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProductCardProps {
  product: Product;
  salesData?: {
    labels: string[];
    sales: number[];
    revenue: number[];
  };
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onView?: (product: Product) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  salesData,
  onEdit,
  onDelete,
  onView,
  className,
  variant = 'default'
}) => {
  const [showChart, setShowChart] = useState(false);

  // Данные для графика
  const chartData = {
    labels: salesData?.labels || [],
    datasets: [
      {
        label: 'Продажи',
        data: salesData?.sales || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Выручка',
        data: salesData?.revenue || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn(
        "bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-200",
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <span className="text-lg font-semibold text-gray-600">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 truncate max-w-xs">
                {product.name}
              </h3>
              <p className="text-sm text-gray-500">{product.sku}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ColorIndicator
              current={product.current_stock}
              min={product.min_stock_level || 0}
              max={product.max_stock_level}
            />
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(product.unit_price)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden",
      className
    )}>
      {/* Заголовок карточки */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {product.name}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="font-mono">{product.sku}</span>
                {product.category && (
                  <span className="flex items-center">
                    <TagIcon className="h-4 w-4 mr-1" />
                    {product.category.name}
                  </span>
                )}
              </div>
              {product.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {/* Действия */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowChart(!showChart)}
              leftIcon={<ChartBarIcon className="h-4 w-4" />}
            >
              График
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView?.(product)}
              leftIcon={<EyeIcon className="h-4 w-4" />}
            >
              Просмотр
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit?.(product)}
              leftIcon={<PencilIcon className="h-4 w-4" />}
            >
              Изменить
            </Button>
          </div>
        </div>
      </div>

      {/* Основная информация */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Цена и стоимость */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Цена</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(product.unit_price)}
              </span>
            </div>
            
            {product.cost_price && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Себестоимость</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(product.cost_price)}
                </span>
              </div>
            )}
          </div>

          {/* Остатки */}
          <div className="space-y-4">
            <StatusCard
              title="Текущий остаток"
              current={product.current_stock}
              min={product.min_stock_level || 0}
              max={product.max_stock_level}
              unit={product.unit_of_measure}
            />
          </div>

          {/* Статус и даты */}
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Статус</span>
                <span className={cn(
                  "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                  product.status === 'active' && "bg-green-100 text-green-800",
                  product.status === 'inactive' && "bg-yellow-100 text-yellow-800",
                  product.status === 'discontinued' && "bg-red-100 text-red-800"
                )}>
                  {product.status === 'active' && 'Активный'}
                  {product.status === 'inactive' && 'Неактивный'}
                  {product.status === 'discontinued' && 'Снят с производства'}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-500">
                <CalendarIcon className="h-4 w-4 mr-1" />
                Создан: {formatDate(product.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Прогресс-бар остатков */}
        {product.max_stock_level && (
          <div className="mt-6">
            <ColorProgressBar
              current={product.current_stock}
              min={product.min_stock_level || 0}
              max={product.max_stock_level}
              height="md"
            />
          </div>
        )}
      </div>

      {/* График продаж */}
      {showChart && salesData && (
        <div className="border-t border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              Динамика продаж
            </h4>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span>Количество</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span>Выручка</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Нижняя панель действий */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Обновлено: {formatDate(product.updated_at)}</span>
            {product.supplier && (
              <span>Поставщик: {product.supplier.name}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit?.(product)}
            >
              Редактировать
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDelete?.(product)}
            >
              Удалить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент сетки карточек товаров
interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onView?: (product: Product) => void;
  className?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  variant = 'default',
  onEdit,
  onDelete,
  onView,
  className
}) => {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-16 w-16 bg-gray-200 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const gridClasses = {
    compact: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
    default: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    detailed: "grid grid-cols-1 lg:grid-cols-2 gap-8"
  };

  return (
    <div className={cn(gridClasses[variant], className)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={variant}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
};

export default ProductCard; 