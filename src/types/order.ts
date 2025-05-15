export interface Order {
  order_id: string;
  coupon_id?: string;
  customer_id: string;
  warehouse_id?: string;
  shipper_id?: string;
  group_id?: string;
  pickup_address_id: string;
  pickup_address: {
    name: string;
    phone: string;
    street: string;
    ward: string;
    district: string;
    city: string;
    email?: string;
    note?: string;
  };
  delivery_address_id: string;
  delivery_address: {
    name: string;
    phone: string;
    street: string;
    ward: string;
    district: string;
    city: string;
    email?: string;
    note?: string;
  };
  weight: number;
  dimensions: string;
  order_items: Array<{
    orderitem_id: string;
    description: string;
    quantity: number;
    item_type: string;
    status: string;
    code?: string;
  }>;
  service_type: string;
  item_type?: string;
  total_fee: number;
  service_fee: number;
  is_suburban: boolean;
  status: string;
  created_at: string;
  delivered_at?: string;
  estimate_time?: string;
  pickup_time_suggestion?: string;
  updated_at: string;
  payment_method: string;
  payment_status: string;
  cost_details?: any;
  coupon_code?: string;
  order_value: number;
}

export interface UserAddress {
  address_id: string;
  user_id: string;
  label?: string;
  name: string;
  phone: string;
  email?: string;
  note?: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  is_default: boolean;
  type: 'delivery' | 'pickup';
}

export interface Warehouse {
  warehouse_id: string;
  location: {
    street: string;
    ward: string;
    district: string;
    city: string;
  };
  capacity: number;
  max_weight_capacity: number;
  current_load: number;
}

export interface OrderResponse {
  message?: string;
  error?: string;
  order?: Order;
}

export interface PaymentResponse {
  paymentUrl?: string;
  error?: string;
  message?: string;
}

export interface UserCoupon {
  usercoupon_id: string;
  coupon: {
    coupon_id: string;
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    min_order_amount: number;
    is_active: boolean;
  };
} 