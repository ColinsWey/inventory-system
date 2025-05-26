import apiClient from './client';

interface DashboardData {
  total_inventory_value: number;
  active_products_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_sales_amount: number;
  sales_count: number;
}

interface InventoryAnalytics {
  by_category: Array<{
    id: string;
    category_name: string;
    products_count: number;
    total_quantity: number;
    total_value: number;
    turnover_rate: number;
  }>;
  abc_analysis: {
    a_count: number;
    b_count: number;
    c_count: number;
  };
  top_products: Array<{
    id: string;
    name: string;
    sku: string;
    sales_count: number;
    sales_amount: number;
  }>;
}

interface TrendsData {
  daily_sales: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  weekly_sales: Array<{
    week: string;
    amount: number;
    count: number;
  }>;
  monthly_sales: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}

export const analyticsApi = {
  // Получение данных дашборда
  async getDashboardData(): Promise<DashboardData> {
    const response = await apiClient.get('/analytics/dashboard');
    return response.data;
  },

  // Получение аналитики по остаткам
  async getInventoryAnalytics(params: {
    start_date?: string;
    end_date?: string;
  } = {}): Promise<InventoryAnalytics> {
    const response = await apiClient.get('/analytics/inventory', { params });
    return response.data;
  },

  // Получение трендов
  async getTrends(params: {
    days?: number;
    period?: 'daily' | 'weekly' | 'monthly';
  } = {}): Promise<TrendsData> {
    const response = await apiClient.get('/analytics/trends', { params });
    return response.data;
  },

  // ABC-анализ
  async getAbcAnalysis(params: {
    period_days?: number;
  } = {}): Promise<{
    a_products: any[];
    b_products: any[];
    c_products: any[];
  }> {
    const response = await apiClient.get('/analytics/abc-analysis', { params });
    return response.data;
  },

  // Отчет по оборачиваемости
  async getTurnoverReport(params: {
    start_date?: string;
    end_date?: string;
    category_id?: string;
  } = {}): Promise<any> {
    const response = await apiClient.get('/analytics/turnover', { params });
    return response.data;
  },

  // Экспорт отчета
  async exportReport(params: {
    format: 'excel' | 'csv' | 'pdf';
    start_date?: string;
    end_date?: string;
    report_type?: 'inventory' | 'sales' | 'abc' | 'turnover';
  }): Promise<Blob> {
    const response = await apiClient.get('/analytics/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Прогноз продаж
  async getSalesForecast(params: {
    product_id?: string;
    days?: number;
    method?: 'linear' | 'seasonal' | 'ml';
  } = {}): Promise<{
    forecast: Array<{
      date: string;
      predicted_sales: number;
      confidence_interval: [number, number];
    }>;
    accuracy: number;
    method_used: string;
  }> {
    const response = await apiClient.get('/analytics/forecast/sales', { params });
    return response.data;
  },
}; 