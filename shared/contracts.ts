export type MenuCategoryDTO = 'BURGER' | 'SIDE' | 'DRINK' | 'DESSERT';

export type FulfillmentMethodDTO = 'PICKUP' | 'DELIVERY';

export type PaymentMethodDTO = 'SUMUP' | 'CASH' | 'CARD_READER';

export type OrderStatusDTO =
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

export interface MenuItemDTO {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: MenuCategoryDTO;
  imageUrl: string | null;
  isAvailable: boolean;
  originalPrice?: number | null;
  promotionTitle?: string | null;
  vatRate?: number;
}

export interface CustomizationOptionDTO {
  id: number | string;
  name: string;
  price: number;
  categoryId?: number;
  isDefaultSelected?: boolean;
}

export interface CustomizationCategoryDTO<TOption extends CustomizationOptionDTO = CustomizationOptionDTO> {
  id: number;
  name: string;
  key: string;
  options: TOption[];
}

export interface CustomizationSelectionDTO {
  selected?: Record<string, string[]>;
  removed?: string[];
  specialRequests?: string;
}

export interface CreateOrderItemDTO {
  menuItemId: number;
  quantity: number;
  price?: number;
  customizations?: CustomizationSelectionDTO;
}

export interface CreateOrderRequestDTO {
  items: CreateOrderItemDTO[];
  total?: number;
  fulfillmentMethod?: FulfillmentMethodDTO;
  deliveryAddress?: string;
}

export interface OrderStatusItemDTO {
  id: number;
  menuItemId: number;
  quantity: number;
  price: number;
  name: string;
  customizations: CustomizationSelectionDTO;
}

export interface OrderStatusResponseDTO {
  id: number;
  status: OrderStatusDTO;
  readyAt: Date | null;
  estimatedReadyTime: Date | null;
  sumupCheckoutId: string | null;
  total: number;
  createdAt: Date;
  fulfillmentMethod?: FulfillmentMethodDTO;
  paymentMethod?: PaymentMethodDTO;
  deliveryAddress?: string | null;
  items: OrderStatusItemDTO[];
}
