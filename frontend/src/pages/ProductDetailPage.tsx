import React from 'react';
import { useParams } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Карточка товара</h1>
        <p className="mt-1 text-sm text-gray-600">
          Детальная информация о товаре ID: {id}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Информация о товаре</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">
              Страница в разработке
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductDetailPage;
