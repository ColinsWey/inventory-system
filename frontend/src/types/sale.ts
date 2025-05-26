export interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  customer_name?: string;
  order_id?: string;
  location?: string;
  discount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Связанные объекты
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
  };
}

export interface SaleCreate {
  product_id: string;
  quantity: number;
  unit_price: number;
  customer_name?: string;
  order_id?: string;
  location?: string;
  discount?: number;
  notes?: string;
  sale_date?: string;
}

export interface SalesResponse {
  items: Sale[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface SaleFilters {
  product_id?: string;
  customer_name?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
} 