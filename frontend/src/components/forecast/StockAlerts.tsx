import React, { useState, useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  BellIcon,
  BellSlashIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { StockAlert, DeliveryOption } from '../../services/ForecastEngine';
import { cn, formatNumber } from '../../utils';
import Button from '../ui/Button';

interface StockAlertsProps {
  alerts: StockAlert[];
  deliveryOptions?: DeliveryOption[];
  onDismiss?: (alertIndex: number) => void;
  onTakeAction?: (alert: StockAlert) => void;
  showDismissed?: boolean;
  className?: string;
}

interface AlertGroup {
  level: 'red' | 'yellow' | 'green';
  alerts: (StockAlert & { index: number })[];
  count: number;
}

const StockAlerts: React.FC<StockAlertsProps> = ({
  alerts,
  deliveryOptions = [],
  onDismiss,
  onTakeAction,
  showDismissed = false,
  className
}) => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['red', 'yellow']));
  const [filterLevel, setFilterLevel] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'daysLeft' | 'alphabetical'>('urgency');

  // Группировка алертов по уровням
  const alertGroups = useMemo(() => {
    const filteredAlerts = alerts
      .map((alert, index) => ({ ...alert, index }))
      .filter(alert => {
        if (!showDismissed && dismissedAlerts.has(alert.index)) return false;
        if (filterLevel !== 'all' && alert.level !== filterLevel) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'urgency':
            return b.urgency - a.urgency;
          case 'daysLeft':
            return a.daysLeft - b.daysLeft;
          case 'alphabetical':
            return a.message.localeCompare(b.message);
          default:
            return 0;
        }
      });

    const groups: Record<string, AlertGroup> = {
      red: { level: 'red', alerts: [], count: 0 },
      yellow: { level: 'yellow', alerts: [], count: 0 },
      green: { level: 'green', alerts: [], count: 0 }
    };

    filteredAlerts.forEach(alert => {
      groups[alert.level].alerts.push(alert);
      groups[alert.level].count++;
    });

    return Object.values(groups).filter(group => group.count > 0);
  }, [alerts, dismissedAlerts, showDismissed, filterLevel, sortBy]);

  const handleDismiss = (alertIndex: number) => {
    setDismissedAlerts(prev => new Set([...prev, alertIndex]));
    onDismiss?.(alertIndex);
  };

  const toggleGroup = (level: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  const getAlertIcon = (level: 'red' | 'yellow' | 'green') => {
    switch (level) {
      case 'red':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'yellow':
        return <InformationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'green':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
  };

  const getAlertStyles = (level: 'red' | 'yellow' | 'green') => {
    switch (level) {
      case 'red':
        return {
          container: 'bg-red-50 border-red-200',
          header: 'text-red-900 bg-red-100',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'yellow':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          header: 'text-yellow-900 bg-yellow-100',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        };
      case 'green':
        return {
          container: 'bg-green-50 border-green-200',
          header: 'text-green-900 bg-green-100',
          text: 'text-green-800',
          button: 'bg-green-600 hover:bg-green-700 text-white'
        };
    }
  };

  const getLevelName = (level: 'red' | 'yellow' | 'green') => {
    switch (level) {
      case 'red':
        return 'Критические';
      case 'yellow':
        return 'Предупреждения';
      case 'green':
        return 'Информационные';
    }
  };

  const getDeliveryInfo = (daysLeft: number) => {
    const airDelivery = deliveryOptions.find(d => d.type === 'air');
    const seaDelivery = deliveryOptions.find(d => d.type === 'sea');

    if (daysLeft <= 0) {
      return { type: 'immediate', message: 'Требуется немедленное действие', icon: '🚨' };
    }

    if (airDelivery && daysLeft <= airDelivery.maxDays) {
      return { 
        type: 'air', 
        message: `Только авиадоставка (${airDelivery.minDays}-${airDelivery.maxDays} дней)`,
        icon: '✈️'
      };
    }

    if (seaDelivery && daysLeft <= seaDelivery.maxDays) {
      return { 
        type: 'sea', 
        message: `Морская доставка возможна (${seaDelivery.minDays}-${seaDelivery.maxDays} дней)`,
        icon: '🚢'
      };
    }

    return { 
      type: 'planning', 
      message: 'Время для планирования заказа',
      icon: '📅'
    };
  };

  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter(a => a.level === 'red').length;
  const warningAlerts = alerts.filter(a => a.level === 'yellow').length;

  if (totalAlerts === 0) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Все в порядке!
          </h3>
          <p className="text-gray-500">
            Нет активных предупреждений по остаткам товаров
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200", className)}>
      {/* Заголовок и статистика */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BellIcon className="h-6 w-6 text-gray-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Уведомления о запасах
              </h3>
              <p className="text-sm text-gray-500">
                {totalAlerts} активных уведомлений
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Фильтр по уровню */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все уровни</option>
              <option value="red">Критические</option>
              <option value="yellow">Предупреждения</option>
              <option value="green">Информационные</option>
            </select>

            {/* Сортировка */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="urgency">По важности</option>
              <option value="daysLeft">По времени</option>
              <option value="alphabetical">По алфавиту</option>
            </select>
          </div>
        </div>

        {/* Сводка */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-900">Критические</p>
                <p className="text-2xl font-bold text-red-600">{criticalAlerts}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-900">Предупреждения</p>
                <p className="text-2xl font-bold text-yellow-600">{warningAlerts}</p>
              </div>
              <InformationCircleIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">Всего</p>
                <p className="text-2xl font-bold text-green-600">{totalAlerts}</p>
              </div>
              <BellIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Группы алертов */}
      <div className="divide-y divide-gray-100">
        {alertGroups.map((group) => {
          const styles = getAlertStyles(group.level);
          const isExpanded = expandedGroups.has(group.level);

          return (
            <div key={group.level}>
              {/* Заголовок группы */}
              <button
                onClick={() => toggleGroup(group.level)}
                className={cn(
                  "w-full px-6 py-3 flex items-center justify-between transition-colors",
                  styles.header
                )}
              >
                <div className="flex items-center space-x-3">
                  {getAlertIcon(group.level)}
                  <span className="font-medium">
                    {getLevelName(group.level)} ({group.count})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>

              {/* Список алертов */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {group.alerts.map((alert) => {
                    const deliveryInfo = getDeliveryInfo(alert.daysLeft);
                    const isDismissed = dismissedAlerts.has(alert.index);

                    return (
                      <div
                        key={alert.index}
                        className={cn(
                          "p-6 transition-all duration-200",
                          styles.container,
                          isDismissed && "opacity-50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start space-x-3">
                              {getAlertIcon(alert.level)}
                              <div className="flex-1">
                                <h4 className={cn("font-medium", styles.text)}>
                                  {alert.message}
                                </h4>
                                
                                <div className="mt-2 space-y-2">
                                  {/* Информация о времени */}
                                  <div className="flex items-center space-x-4 text-sm">
                                    <div className="flex items-center space-x-1">
                                      <ClockIcon className="h-4 w-4 text-gray-400" />
                                      <span className={styles.text}>
                                        {alert.daysLeft > 0 
                                          ? `${alert.daysLeft} дней до исчерпания`
                                          : 'Запасы исчерпаны'
                                        }
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center space-x-1">
                                      <span className="text-lg">{deliveryInfo.icon}</span>
                                      <span className={cn("text-xs", styles.text)}>
                                        {deliveryInfo.message}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Рекомендуемое действие */}
                                  <div className={cn(
                                    "p-3 rounded-lg border-l-4",
                                    alert.level === 'red' ? "bg-red-100 border-red-400" :
                                    alert.level === 'yellow' ? "bg-yellow-100 border-yellow-400" :
                                    "bg-green-100 border-green-400"
                                  )}>
                                    <p className={cn("text-sm font-medium", styles.text)}>
                                      Рекомендуемое действие:
                                    </p>
                                    <p className={cn("text-sm mt-1", styles.text)}>
                                      {alert.recommendedAction}
                                    </p>
                                  </div>

                                  {/* Уровень важности */}
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">Важность:</span>
                                    <div className="flex space-x-1">
                                      {Array.from({ length: 10 }, (_, i) => (
                                        <div
                                          key={i}
                                          className={cn(
                                            "w-2 h-2 rounded-full",
                                            i < alert.urgency
                                              ? alert.level === 'red' ? "bg-red-500" :
                                                alert.level === 'yellow' ? "bg-yellow-500" :
                                                "bg-green-500"
                                              : "bg-gray-200"
                                          )}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {alert.urgency}/10
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Действия */}
                          <div className="flex items-center space-x-2 ml-4">
                            {!isDismissed && (
                              <>
                                <Button
                                  size="sm"
                                  className={styles.button}
                                  onClick={() => onTakeAction?.(alert)}
                                >
                                  Принять меры
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDismiss(alert.index)}
                                >
                                  <BellSlashIcon className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Нижняя панель */}
      {dismissedAlerts.size > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Скрыто уведомлений: {dismissedAlerts.size}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissedAlerts(new Set())}
            >
              Показать все
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAlerts; 