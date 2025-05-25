import React, { useState, useMemo } from 'react';
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
  Filler,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { SalesDataPoint, ForecastResult } from '../../services/ForecastEngine';
import { formatCurrency, formatNumber, formatDate, cn } from '../../utils';
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
  Filler,
  TimeScale
);

interface PriceChange {
  date: string;
  oldPrice: number;
  newPrice: number;
  reason?: string;
}

interface SalesChartProps {
  salesData: SalesDataPoint[];
  forecastData?: ForecastResult[];
  priceChanges?: PriceChange[];
  title?: string;
  period?: 'day' | 'week' | 'month';
  onPeriodChange?: (period: 'day' | 'week' | 'month') => void;
  showForecast?: boolean;
  showPriceChanges?: boolean;
  showConfidenceInterval?: boolean;
  height?: number;
  className?: string;
}

const SalesChart: React.FC<SalesChartProps> = ({
  salesData,
  forecastData = [],
  priceChanges = [],
  title = 'График продаж',
  period = 'day',
  onPeriodChange,
  showForecast = true,
  showPriceChanges = true,
  showConfidenceInterval = true,
  height = 400,
  className
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [visibleSeries, setVisibleSeries] = useState({
    sales: true,
    revenue: true,
    forecast: showForecast,
    confidence: showConfidenceInterval,
    priceChanges: showPriceChanges
  });

  // Агрегация данных по периодам
  const aggregatedData = useMemo(() => {
    const groupedData = new Map<string, {
      date: string;
      quantity: number;
      revenue: number;
      price: number;
      count: number;
    }>();

    salesData.forEach(point => {
      const date = new Date(point.date);
      let key: string;

      switch (selectedPeriod) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default:
          key = point.date.split('T')[0];
      }

      const existing = groupedData.get(key);
      if (existing) {
        existing.quantity += point.quantity;
        existing.revenue += point.revenue;
        existing.price = (existing.price * existing.count + point.price) / (existing.count + 1);
        existing.count += 1;
      } else {
        groupedData.set(key, {
          date: key,
          quantity: point.quantity,
          revenue: point.revenue,
          price: point.price,
          count: 1
        });
      }
    });

    return Array.from(groupedData.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [salesData, selectedPeriod]);

  // Подготовка данных для графика
  const chartData = useMemo(() => {
    const labels = aggregatedData.map(point => point.date);
    const datasets = [];

    // Продажи (количество)
    if (visibleSeries.sales) {
      datasets.push({
        label: 'Продажи (шт)',
        data: aggregatedData.map(point => point.quantity),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        yAxisID: 'y'
      });
    }

    // Выручка
    if (visibleSeries.revenue) {
      datasets.push({
        label: 'Выручка',
        data: aggregatedData.map(point => point.revenue),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        yAxisID: 'y1'
      });
    }

    // Прогноз
    if (visibleSeries.forecast && forecastData.length > 0) {
      const forecastLabels = forecastData.map(point => point.date);
      const allLabels = [...labels, ...forecastLabels];
      
      // Дополняем исторические данные null значениями для прогноза
      const forecastQuantities = [
        ...Array(labels.length).fill(null),
        ...forecastData.map(point => point.predicted)
      ];

      datasets.push({
        label: 'Прогноз продаж',
        data: forecastQuantities,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        borderDash: [5, 5],
        yAxisID: 'y'
      });

      // Доверительный интервал
      if (visibleSeries.confidence) {
        const upperBound = [
          ...Array(labels.length).fill(null),
          ...forecastData.map(point => point.confidence.upper)
        ];
        
        const lowerBound = [
          ...Array(labels.length).fill(null),
          ...forecastData.map(point => point.confidence.lower)
        ];

        datasets.push({
          label: 'Верхняя граница',
          data: upperBound,
          borderColor: 'rgba(239, 68, 68, 0.3)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: '+1',
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1,
          borderDash: [2, 2],
          yAxisID: 'y'
        });

        datasets.push({
          label: 'Нижняя граница',
          data: lowerBound,
          borderColor: 'rgba(239, 68, 68, 0.3)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1,
          borderDash: [2, 2],
          yAxisID: 'y'
        });
      }

      // Обновляем labels для включения прогноза
      return {
        labels: allLabels,
        datasets
      };
    }

    return { labels, datasets };
  }, [aggregatedData, forecastData, visibleSeries]);

  // Аннотации для изменений цен
  const priceChangeAnnotations = useMemo(() => {
    if (!visibleSeries.priceChanges) return [];

    return priceChanges.map((change, index) => ({
      type: 'line' as const,
      scaleID: 'x',
      value: change.date,
      borderColor: 'rgb(245, 158, 11)',
      borderWidth: 2,
      borderDash: [3, 3],
      label: {
        enabled: true,
        content: `${formatCurrency(change.oldPrice)} → ${formatCurrency(change.newPrice)}`,
        position: 'top' as const,
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        color: 'white',
        font: {
          size: 10
        }
      }
    }));
  }, [priceChanges, visibleSeries.priceChanges]);

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
          },
          filter: (legendItem: any) => {
            // Скрываем границы доверительного интервала из легенды
            return !legendItem.text.includes('граница');
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
        callbacks: {
          title: function(tooltipItems: any[]) {
            const date = tooltipItems[0]?.label;
            if (date) {
              return formatDate(date);
            }
            return '';
          },
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (label.includes('граница')) return null;
            if (label.includes('Выручка')) {
              return `${label}: ${formatCurrency(value)}`;
            }
            return `${label}: ${formatNumber(value)}`;
          },
          afterBody: function(tooltipItems: any[]) {
            const date = tooltipItems[0]?.label;
            const priceChange = priceChanges.find(change => change.date === date);
            
            if (priceChange) {
              return [
                '',
                `💰 Изменение цены:`,
                `${formatCurrency(priceChange.oldPrice)} → ${formatCurrency(priceChange.newPrice)}`,
                priceChange.reason ? `Причина: ${priceChange.reason}` : ''
              ].filter(Boolean);
            }
            return [];
          }
        }
      },
      annotation: {
        annotations: priceChangeAnnotations
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: selectedPeriod === 'month' ? 'month' : selectedPeriod === 'week' ? 'week' : 'day',
          displayFormats: {
            day: 'dd MMM',
            week: 'dd MMM',
            month: 'MMM yyyy'
          }
        },
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
        title: {
          display: true,
          text: 'Количество (шт)',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value: any) {
            return formatNumber(value);
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: visibleSeries.revenue,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Выручка',
          font: {
            size: 12
          }
        },
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

  // Статистика
  const stats = useMemo(() => {
    if (aggregatedData.length === 0) return null;

    const totalQuantity = aggregatedData.reduce((sum, point) => sum + point.quantity, 0);
    const totalRevenue = aggregatedData.reduce((sum, point) => sum + point.revenue, 0);
    const avgPrice = totalRevenue / totalQuantity;
    
    // Тренд (сравнение первой и последней недели)
    const firstWeek = aggregatedData.slice(0, 7);
    const lastWeek = aggregatedData.slice(-7);
    
    const firstWeekAvg = firstWeek.reduce((sum, p) => sum + p.quantity, 0) / firstWeek.length;
    const lastWeekAvg = lastWeek.reduce((sum, p) => sum + p.quantity, 0) / lastWeek.length;
    
    const trendPercentage = firstWeekAvg > 0 
      ? ((lastWeekAvg - firstWeekAvg) / firstWeekAvg * 100)
      : 0;

    return {
      totalQuantity,
      totalRevenue,
      avgPrice,
      trendPercentage,
      trendDirection: trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable'
    };
  }, [aggregatedData]);

  const handlePeriodChange = (newPeriod: 'day' | 'week' | 'month') => {
    setSelectedPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const toggleSeries = (series: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({
      ...prev,
      [series]: !prev[series]
    }));
  };

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
      {/* Заголовок и управление */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {stats && (
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>Всего продано: {formatNumber(stats.totalQuantity)} шт</span>
                <span>Выручка: {formatCurrency(stats.totalRevenue)}</span>
                <span>Средняя цена: {formatCurrency(stats.avgPrice)}</span>
                <div className="flex items-center space-x-1">
                  <span>Тренд:</span>
                  {stats.trendDirection === 'up' ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                  ) : stats.trendDirection === 'down' ? (
                    <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                  <span className={cn(
                    "font-medium",
                    stats.trendDirection === 'up' ? "text-green-600" :
                    stats.trendDirection === 'down' ? "text-red-600" : "text-gray-500"
                  )}>
                    {stats.trendPercentage > 0 ? '+' : ''}{stats.trendPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Переключатель периода */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    selectedPeriod === p 
                      ? "bg-white shadow-sm text-gray-900" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Управление видимостью серий */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Показать:</span>
          
          <button
            onClick={() => toggleSeries('sales')}
            className={cn(
              "flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors",
              visibleSeries.sales 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-500"
            )}
          >
            {visibleSeries.sales ? <EyeIcon className="h-3 w-3" /> : <EyeSlashIcon className="h-3 w-3" />}
            <span>Продажи</span>
          </button>

          <button
            onClick={() => toggleSeries('revenue')}
            className={cn(
              "flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors",
              visibleSeries.revenue 
                ? "bg-green-100 text-green-700" 
                : "bg-gray-100 text-gray-500"
            )}
          >
            {visibleSeries.revenue ? <EyeIcon className="h-3 w-3" /> : <EyeSlashIcon className="h-3 w-3" />}
            <span>Выручка</span>
          </button>

          {forecastData.length > 0 && (
            <>
              <button
                onClick={() => toggleSeries('forecast')}
                className={cn(
                  "flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors",
                  visibleSeries.forecast 
                    ? "bg-red-100 text-red-700" 
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {visibleSeries.forecast ? <EyeIcon className="h-3 w-3" /> : <EyeSlashIcon className="h-3 w-3" />}
                <span>Прогноз</span>
              </button>

              <button
                onClick={() => toggleSeries('confidence')}
                className={cn(
                  "flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors",
                  visibleSeries.confidence 
                    ? "bg-red-100 text-red-700" 
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {visibleSeries.confidence ? <EyeIcon className="h-3 w-3" /> : <EyeSlashIcon className="h-3 w-3" />}
                <span>Доверительный интервал</span>
              </button>
            </>
          )}

          {priceChanges.length > 0 && (
            <button
              onClick={() => toggleSeries('priceChanges')}
              className={cn(
                "flex items-center space-x-1 px-2 py-1 text-xs rounded-md transition-colors",
                visibleSeries.priceChanges 
                  ? "bg-yellow-100 text-yellow-700" 
                  : "bg-gray-100 text-gray-500"
              )}
            >
              {visibleSeries.priceChanges ? <EyeIcon className="h-3 w-3" /> : <EyeSlashIcon className="h-3 w-3" />}
              <span>Изменения цен</span>
            </button>
          )}
        </div>
      </div>

      {/* График */}
      <div className="p-6">
        <div style={{ height }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Легенда изменений цен */}
      {visibleSeries.priceChanges && priceChanges.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center">
              <CurrencyDollarIcon className="h-4 w-4 mr-1" />
              История изменений цен
            </h4>
            <div className="space-y-2">
              {priceChanges.map((change, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-3 w-3 text-yellow-600" />
                    <span className="text-yellow-900">{formatDate(change.date)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-700">
                      {formatCurrency(change.oldPrice)} → {formatCurrency(change.newPrice)}
                    </span>
                    {change.reason && (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                        {change.reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesChart; 