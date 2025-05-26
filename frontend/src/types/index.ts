// Основные типы для системы управления товарными остатками

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  category?: Category;
  supplier_id?: string;
  supplier?: Supplier;
  unit_price: number;
  cost_price?: number;
  unit_of_measure: string;
  min_stock_level?: number;
  max_stock_level?: number;
  current_stock: number;
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product?: Product;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason?: string;
  reference_number?: string;
  created_by: string;
  created_at: string;
}

export interface ImportLog {
  id: string;
  source: 'manual' | 'csv' | 'excel' | 'salesdrive';
  status: 'pending' | 'running' | 'success' | 'error';
  total_items: number;
  processed_items: number;
  created_items: number;
  updated_items: number;
  failed_items: number;
  errors?: string[];
  warnings?: string[];
  started_by: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface SalesDriveConfig {
  api_url: string;
  api_key: string;
  timeout: number;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
}

export interface DashboardStats {
  total_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_categories: number;
  recent_movements: number;
  total_value: number;
}

export interface StockAlert {
  id: string;
  product_id: string;
  product: Product;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock';
  current_level: number;
  threshold_level: number;
  created_at: string;
}

// API Response типы
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

// Форма типы
export interface ProductFormData {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  unit_price: number;
  cost_price?: number;
  unit_of_measure: string;
  min_stock_level?: number;
  max_stock_level?: number;
  current_stock: number;
  status: 'active' | 'inactive' | 'discontinued';
}

export interface CategoryFormData {
  name: string;
  description?: string;
  parent_id?: string;
}

export interface SupplierFormData {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface StockMovementFormData {
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason?: string;
  reference_number?: string;
}

// Фильтры и поиск
export interface ProductFilters {
  search?: string;
  category_id?: string;
  supplier_id?: string;
  status?: 'active' | 'inactive' | 'discontinued';
  stock_level?: 'all' | 'low' | 'out' | 'normal';
  sort_by?: 'name' | 'sku' | 'created_at' | 'current_stock';
  sort_order?: 'asc' | 'desc';
}

export interface ImportLogFilters {
  source?: 'manual' | 'csv' | 'excel' | 'salesdrive';
  status?: 'pending' | 'running' | 'success' | 'error';
  date_from?: string;
  date_to?: string;
}

// Chart данные
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface StockLevelData {
  product_name: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
}

export interface MovementTrendData {
  date: string;
  in_movements: number;
  out_movements: number;
} 