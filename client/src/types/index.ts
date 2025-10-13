export interface Customer {
  id: string; // Customer Code
  name: string; // Customer Name
  address1?: string;
  address2?: string;
  phone?: string;
}

export interface SalesOrder {
  id: string;
  customerId: string; // Customer Code
  deliveryDate: string;
  deliveryTime: string;
  orderNumber: string;
  items: string[]; // Sales Order Item(s)
  quantity: number;
}