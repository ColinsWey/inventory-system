import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { SaleCreate } from '../../types/sale';
import Button from '../ui/Button';

interface SaleFormProps {
  onSubmit: (data: SaleCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<SaleCreate>;
}

const schema = yup.object({
  product_id: yup.string().required('Выберите товар'),
  quantity: yup.number().positive('Количество должно быть больше 0').required('Укажите количество'),
  unit_price: yup.number().positive('Цена должна быть больше 0').required('Укажите цену'),
  customer_name: yup.string(),
  order_id: yup.string(),
  location: yup.string(),
  discount: yup.number().min(0, 'Скидка не может быть отрицательной').max(100, 'Скидка не может быть больше 100%'),
  notes: yup.string(),
});

const SaleForm: React.FC<SaleFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SaleCreate>({
    resolver: yupResolver(schema),
    defaultValues: initialData,
  });

  const quantity = watch('quantity');
  const unitPrice = watch('unit_price');
  const discount = watch('discount') || 0;

  const calculateTotal = () => {
    if (!quantity || !unitPrice) return 0;
    const subtotal = quantity * unitPrice;
    const discountAmount = (subtotal * discount) / 100;
    return subtotal - discountAmount;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Товар */}
      <div>
        <label htmlFor="product_id" className="block text-sm font-medium text-gray-700">
          Товар *
        </label>
        <select
          id="product_id"
          {...register('product_id')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Выберите товар</option>
          {/* Здесь будут загружаться товары из API */}
        </select>
        {errors.product_id && (
          <p className="mt-1 text-sm text-red-600">{errors.product_id.message}</p>
        )}
      </div>

      {/* Количество и цена */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Количество *
          </label>
          <input
            type="number"
            id="quantity"
            step="1"
            min="1"
            {...register('quantity')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="unit_price" className="block text-sm font-medium text-gray-700">
            Цена за единицу *
          </label>
          <input
            type="number"
            id="unit_price"
            step="0.01"
            min="0"
            {...register('unit_price')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.unit_price && (
            <p className="mt-1 text-sm text-red-600">{errors.unit_price.message}</p>
          )}
        </div>
      </div>

      {/* Скидка */}
      <div>
        <label htmlFor="discount" className="block text-sm font-medium text-gray-700">
          Скидка (%)
        </label>
        <input
          type="number"
          id="discount"
          step="0.01"
          min="0"
          max="100"
          {...register('discount')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.discount && (
          <p className="mt-1 text-sm text-red-600">{errors.discount.message}</p>
        )}
      </div>

      {/* Итого */}
      {quantity && unitPrice && (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-lg font-semibold text-gray-900">
            Итого: {calculateTotal().toFixed(2)} ₽
          </p>
        </div>
      )}

      {/* Клиент */}
      <div>
        <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
          Имя клиента
        </label>
        <input
          type="text"
          id="customer_name"
          {...register('customer_name')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Номер заказа */}
      <div>
        <label htmlFor="order_id" className="block text-sm font-medium text-gray-700">
          Номер заказа
        </label>
        <input
          type="text"
          id="order_id"
          {...register('order_id')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Местоположение */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Местоположение
        </label>
        <input
          type="text"
          id="location"
          {...register('location')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Примечания */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Примечания
        </label>
        <textarea
          id="notes"
          rows={3}
          {...register('notes')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Кнопки */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
        >
          Создать продажу
        </Button>
      </div>
    </form>
  );
};

export default SaleForm; 