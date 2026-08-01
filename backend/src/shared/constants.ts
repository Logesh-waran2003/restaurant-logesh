export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled',
] as const;

export const PAYMENT_METHODS = [
  'cash',
  'card',
  'upi',
  'razorpay',
] as const;

export const ROLES = [
  'owner',
  'manager',
  'chef',
  'waiter',
  'cashier',
] as const;

export const DEPARTMENTS = [
  'kitchen',
  'bar',
  'billing',
  'service',
] as const;

export const SPICE_LEVELS = [
  { level: 1, label: 'Mild' },
  { level: 2, label: 'Medium' },
  { level: 3, label: 'Hot' },
  { level: 4, label: 'Very Hot' },
  { level: 5, label: 'Extra Hot' },
] as const;

export const DEFAULT_GST_PERCENT = 5;
export const DEFAULT_SERVICE_CHARGE_PERCENT = 0;
