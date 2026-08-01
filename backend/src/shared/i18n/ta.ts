import type { TranslationKey } from './en';

export const ta: Record<TranslationKey, string> = {
  // Menu categories
  'menu.categories': 'வகைகள்',
  'menu.allItems': 'அனைத்து உணவுகள்',
  'menu.veg': 'சைவம்',
  'menu.nonVeg': 'அசைவம்',
  'menu.addItem': 'உணவு சேர்',
  'menu.editItem': 'உணவு திருத்து',
  'menu.unavailable': 'கிடைக்காது',

  // Order statuses
  'order.pending': 'நிலுவையில்',
  'order.confirmed': 'உறுதிசெய்யப்பட்டது',
  'order.preparing': 'தயாரிக்கப்படுகிறது',
  'order.ready': 'தயார்',
  'order.served': 'பரிமாறப்பட்டது',
  'order.completed': 'நிறைவடைந்தது',
  'order.cancelled': 'ரத்து செய்யப்பட்டது',

  // Payment
  'payment.cash': 'ரொக்கம்',
  'payment.card': 'கார்டு',
  'payment.upi': 'UPI',
  'payment.razorpay': 'Razorpay',
  'payment.total': 'மொத்தம்',
  'payment.gst': 'GST',
  'payment.serviceCharge': 'சேவைக் கட்டணம்',
  'payment.subtotal': 'உட்கூட்டு',

  // Buttons
  'btn.save': 'சேமி',
  'btn.cancel': 'ரத்து',
  'btn.confirm': 'உறுதிசெய்',
  'btn.delete': 'நீக்கு',
  'btn.edit': 'திருத்து',
  'btn.add': 'சேர்',
  'btn.close': 'மூடு',
  'btn.pay': 'இப்போது செலுத்து',
  'btn.placeOrder': 'ஆர்டர் செய்',

  // Errors
  'error.required': 'இது கட்டாயம்',
  'error.invalidPhone': 'தவறான தொலைபேசி எண்',
  'error.invalidEmail': 'தவறான மின்னஞ்சல்',
  'error.minLength': 'மிகக் குறுகியது',
  'error.serverError': 'ஏதோ தவறு ஏற்பட்டது',
  'error.unauthorized': 'அங்கீகரிக்கப்படவில்லை',
  'error.notFound': 'கிடைக்கவில்லை',
};
