export const en = {
  // Menu categories
  'menu.categories': 'Categories',
  'menu.allItems': 'All Items',
  'menu.veg': 'Vegetarian',
  'menu.nonVeg': 'Non-Vegetarian',
  'menu.addItem': 'Add Item',
  'menu.editItem': 'Edit Item',
  'menu.unavailable': 'Unavailable',

  // Order statuses
  'order.pending': 'Pending',
  'order.confirmed': 'Confirmed',
  'order.preparing': 'Preparing',
  'order.ready': 'Ready',
  'order.served': 'Served',
  'order.completed': 'Completed',
  'order.cancelled': 'Cancelled',

  // Payment
  'payment.cash': 'Cash',
  'payment.card': 'Card',
  'payment.upi': 'UPI',
  'payment.razorpay': 'Razorpay',
  'payment.total': 'Total',
  'payment.gst': 'GST',
  'payment.serviceCharge': 'Service Charge',
  'payment.subtotal': 'Subtotal',

  // Buttons
  'btn.save': 'Save',
  'btn.cancel': 'Cancel',
  'btn.confirm': 'Confirm',
  'btn.delete': 'Delete',
  'btn.edit': 'Edit',
  'btn.add': 'Add',
  'btn.close': 'Close',
  'btn.pay': 'Pay Now',
  'btn.placeOrder': 'Place Order',

  // Errors
  'error.required': 'This field is required',
  'error.invalidPhone': 'Invalid phone number',
  'error.invalidEmail': 'Invalid email address',
  'error.minLength': 'Too short',
  'error.serverError': 'Something went wrong',
  'error.unauthorized': 'Unauthorized',
  'error.notFound': 'Not found',
} as const;

export type TranslationKey = keyof typeof en;
