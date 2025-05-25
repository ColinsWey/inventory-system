import React, { useState, useMemo } from 'react';
import {
  TruckIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShoppingCartIcon,
  PaperAirplaneIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { OrderRecommendation, DeliveryOption } from '../../services/ForecastEngine';
import { formatCurrency, formatNumber, formatDate, cn } from '../../utils';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';

interface OrderRecommendationsProps {
  recommendations: OrderRecommendation[];
  currentStock: number;
  minStock: number;
  productName?: string;
  onCreateOrder?: (recommendation: OrderRecommendation) => void;
  onModifyRecommendation?: (recommendation: OrderRecommendation, changes: Partial<OrderRecommendation>) => void;
  className?: string;
}

interface RecommendationGroup {
  type: 'urgent' | 'planned';
  recommendations: OrderRecommendation[];
  totalQuantity: number;
  totalCost: number;
}

const OrderRecommendations: React.FC<OrderRecommendationsProps> = ({
  recommendations,
  currentStock,
  minStock,
  productName,
  onCreateOrder,
  onModifyRecommendation,
  className
}) => {
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<number>>(new Set());
  const [showDetails, setShowDetails] = useState<Set<number>>(new Set());

  // Группировка рекомендаций
  const recommendationGroups = useMemo(() => {
    const groups: Record<string, RecommendationGroup> = {
      urgent: { type: 'urgent', recommendations: [], totalQuantity: 0, totalCost: 0 },
      planned: { type: 'planned', recommendations: [], totalQuantity: 0, totalCost: 0 }
    };

    recommendations.forEach(rec => {
      const isUrgent = rec.deliveryType === 'air' || rec.reasoning.includes('срочн');
      const groupKey = isUrgent ? 'urgent' : 'planned';
      
      groups[groupKey].recommendations.push(rec);
      groups[groupKey].totalQuantity += rec.quantity;
      groups[groupKey].totalCost += rec.cost;
    });

    return Object.values(groups).filter(group => group.recommendations.length > 0);
  }, [recommendations]);

  // Общая статистика
  const totalStats = useMemo(() => {
    const totalQuantity = recommendations.reduce((sum, rec) => sum + rec.quantity, 0);
    const totalCost = recommendations.reduce((sum, rec) => sum + rec.cost, 0);
    const avgDeliveryDays = recommendations.length > 0 
      ? recommendations.reduce((sum, rec) => {
          const days = Math.ceil((new Date(rec.expectedArrival).getTime() - new Date(rec.orderDate).getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / recommendations.length
      : 0;

    return { totalQuantity, totalCost, avgDeliveryDays };
  }, [recommendations]);

  const toggleRecommendation = (index: number) => {
    setSelectedRecommendations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleDetails = (index: number) => {
    setShowDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getDeliveryIcon = (type: 'air' | 'sea') => {
    return type === 'air' ? '✈️' : '🚢';
  };

  const getDeliveryName = (type: 'air' | 'sea') => {
    return type === 'air' ? 'Авиадоставка' : 'Морская доставка';
  };

  const getUrgencyLevel = (recommendation: OrderRecommendation) => {
    const daysUntilOrder = Math.ceil((new Date(recommendation.orderDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilOrder <= 0) return 'immediate';
    if (daysUntilOrder <= 7) return 'urgent';
    if (daysUntilOrder <= 30) return 'normal';
    return 'planned';
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'immediate':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: 'text-red-500' };
      case 'urgent':
        return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: 'text-orange-500' };
      case 'normal':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: 'text-yellow-500' };
      case 'planned':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: 'text-green-500' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: 'text-gray-500' };
    }
  };

  const createBulkOrder = () => {
    const selectedRecs = recommendations.filter((_, index) => selectedRecommendations.has(index));
    // Здесь можно объединить выбранные рекомендации в один заказ
    console.log('Создание группового заказа:', selectedRecs);
  };

  if (recommendations.length === 0) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Заказы не требуются
          </h3>
          <p className="text-gray-500">
            Текущий уровень запасов достаточен
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Заголовок и общая статистика */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Рекомендации по заказу</CardTitle>
                {productName && (
                  <p className="text-sm text-gray-500 mt-1">{productName}</p>
                )}
              </div>
            </div>
            
            {selectedRecommendations.size > 0 && (
              <Button onClick={createBulkOrder}>
                Создать групповой заказ ({selectedRecommendations.size})
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Текущий остаток</p>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(currentStock)}</p>
                </div>
                <TruckIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">К заказу</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(totalStats.totalQuantity)}</p>
                </div>
                <ShoppingCartIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">Общая стоимость</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalStats.totalCost)}</p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-900">Средний срок</p>
                  <p className="text-2xl font-bold text-orange-600">{Math.round(totalStats.avgDeliveryDays)} дней</p>
                </div>
                <ClockIcon className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Группы рекомендаций */}
      {recommendationGroups.map((group) => (
        <Card key={group.type}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {group.type === 'urgent' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                ) : (
                  <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {group.type === 'urgent' ? 'Срочные заказы' : 'Плановые заказы'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {group.recommendations.length} рекомендаций • {formatNumber(group.totalQuantity)} шт • {formatCurrency(group.totalCost)}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {group.recommendations.map((recommendation, index) => {
                const globalIndex = recommendations.indexOf(recommendation);
                const isSelected = selectedRecommendations.has(globalIndex);
                const showDetail = showDetails.has(globalIndex);
                const urgency = getUrgencyLevel(recommendation);
                const urgencyStyles = getUrgencyStyles(urgency);
                
                const deliveryDays = Math.ceil(
                  (new Date(recommendation.expectedArrival).getTime() - new Date(recommendation.orderDate).getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div
                    key={globalIndex}
                    className={cn(
                      "border rounded-lg transition-all duration-200",
                      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecommendation(globalIndex)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-2xl">{getDeliveryIcon(recommendation.deliveryType)}</span>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {getDeliveryName(recommendation.deliveryType)}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {formatNumber(recommendation.quantity)} шт • {formatCurrency(recommendation.cost)}
                                </p>
                              </div>
                              
                              <div className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium border",
                                urgencyStyles.bg,
                                urgencyStyles.text,
                                urgencyStyles.border
                              )}>
                                {urgency === 'immediate' ? 'Немедленно' :
                                 urgency === 'urgent' ? 'Срочно' :
                                 urgency === 'normal' ? 'Обычно' : 'Планово'}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <CalendarIcon className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-gray-500">Заказать</p>
                                  <p className="font-medium">{formatDate(recommendation.orderDate)}</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <TruckIcon className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-gray-500">Прибытие</p>
                                  <p className="font-medium">{formatDate(recommendation.expectedArrival)}</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <ClockIcon className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-gray-500">Срок доставки</p>
                                  <p className="font-medium">{deliveryDays} дней</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-gray-500">Стоимость</p>
                                  <p className="font-medium">{formatCurrency(recommendation.cost)}</p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Обоснование:</span> {recommendation.reasoning}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleDetails(globalIndex)}
                          >
                            {showDetail ? 'Скрыть' : 'Детали'}
                          </Button>
                          
                          <Button
                            size="sm"
                            onClick={() => onCreateOrder?.(recommendation)}
                          >
                            Создать заказ
                          </Button>
                        </div>
                      </div>

                      {/* Детальная информация */}
                      {showDetail && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Временная шкала */}
                            <div>
                              <h5 className="font-medium text-gray-900 mb-3">Временная шкала</h5>
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <div>
                                    <p className="text-sm font-medium">Размещение заказа</p>
                                    <p className="text-xs text-gray-500">{formatDate(recommendation.orderDate)}</p>
                                  </div>
                                </div>
                                
                                <div className="ml-1.5 w-0.5 h-6 bg-gray-300"></div>
                                
                                <div className="flex items-center space-x-3">
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  <div>
                                    <p className="text-sm font-medium">Ожидаемое прибытие</p>
                                    <p className="text-xs text-gray-500">{formatDate(recommendation.expectedArrival)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Расчет стоимости */}
                            <div>
                              <h5 className="font-medium text-gray-900 mb-3">Расчет стоимости</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Количество:</span>
                                  <span>{formatNumber(recommendation.quantity)} шт</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Тип доставки:</span>
                                  <span>{getDeliveryName(recommendation.deliveryType)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Коэффициент доставки:</span>
                                  <span>{recommendation.deliveryType === 'air' ? '1.5x' : '1.0x'}</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between font-medium">
                                  <span>Итого:</span>
                                  <span>{formatCurrency(recommendation.cost)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Действия */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onModifyRecommendation?.(recommendation, {})}
                                leftIcon={<DocumentTextIcon className="h-4 w-4" />}
                              >
                                Изменить
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                leftIcon={<PaperAirplaneIcon className="h-4 w-4" />}
                              >
                                Отправить поставщику
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Итоговая информация */}
      <Card>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <h4 className="font-medium mb-2">Рекомендации по оптимизации заказов:</h4>
                <ul className="space-y-1 text-xs">
                  <li>• Объединяйте заказы одного типа доставки для экономии</li>
                  <li>• Морская доставка дешевле, но требует больше времени</li>
                  <li>• Авиадоставка подходит для срочных заказов</li>
                  <li>• Учитывайте сезонность при планировании заказов</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderRecommendations; 