import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, scryptSync } from 'crypto';

const prisma = new PrismaClient();

// ponytail: using scrypt for seed. App uses bcrypt at runtime, reseed with bcrypt before production.
function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  // 1. Create restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Logesh Kitchen',
      address: 'Anna Nagar, Chennai, Tamil Nadu',
      phone: '9876543210',
      gstNumber: '33AABCU9603R1ZM',
      branchCode: 'MAIN',
    },
  });

  console.log('✅ Restaurant created:', restaurant.name);

  // 2. Create users
  const users = [
    { name: 'Logesh (Owner)', phone: '9000000001', email: 'owner@logesh.kitchen', role: 'OWNER', password: 'owner123' },
    { name: 'Admin', phone: '9000000002', email: 'admin@logesh.kitchen', role: 'ADMIN', password: 'admin123' },
    { name: 'Cashier', phone: '9000000003', email: 'cashier@logesh.kitchen', role: 'CASHIER', password: 'cashier123' },
    { name: 'Chef Ramu', phone: '9000000004', email: 'chef@logesh.kitchen', role: 'CHEF', password: 'chef123' },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role as any,
        password: hashPassword(u.password),
        restaurantId: restaurant.id,
      },
    });
  }
  console.log('✅ Users created');

  // 3. Create tables
  for (let i = 1; i <= 10; i++) {
    await prisma.table.create({
      data: {
        number: i,
        name: `Table ${i}`,
        qrCode: `TBL-${restaurant.id.slice(0, 8)}-${i}`,
        capacity: i <= 4 ? 2 : 4,
        section: i <= 5 ? 'Indoor' : 'Outdoor',
        restaurantId: restaurant.id,
      },
    });
  }
  console.log('✅ 10 Tables created');

  // 4. Categories
  const cats = await Promise.all([
    prisma.category.create({ data: { name: 'Starters', nameTamil: 'தொடக்கம்', sortOrder: 1, restaurantId: restaurant.id } }),
    prisma.category.create({ data: { name: 'Mains', nameTamil: 'முக்கிய உணவு', sortOrder: 2, restaurantId: restaurant.id } }),
    prisma.category.create({ data: { name: 'Biryani', nameTamil: 'பிரியாணி', sortOrder: 3, restaurantId: restaurant.id } }),
    prisma.category.create({ data: { name: 'Drinks', nameTamil: 'பானங்கள்', sortOrder: 4, restaurantId: restaurant.id } }),
    prisma.category.create({ data: { name: 'Desserts', nameTamil: 'இனிப்புகள்', sortOrder: 5, restaurantId: restaurant.id } }),
  ]);

  // 5. Menu items
  const items = [
    { name: 'Chicken 65', nameTamil: 'சிக்கன் 65', price: 180, isVeg: false, prepTime: 12, catIdx: 0 },
    { name: 'Paneer Tikka', nameTamil: 'பன்னீர் டிக்கா', price: 160, isVeg: true, prepTime: 10, catIdx: 0 },
    { name: 'Gobi Manchurian', nameTamil: 'கோபி மஞ்சூரியன்', price: 140, isVeg: true, prepTime: 10, catIdx: 0 },
    { name: 'Chicken Biryani', nameTamil: 'சிக்கன் பிரியாணி', price: 220, isVeg: false, prepTime: 20, catIdx: 2 },
    { name: 'Mutton Biryani', nameTamil: 'மட்டன் பிரியாணி', price: 280, isVeg: false, prepTime: 25, catIdx: 2 },
    { name: 'Veg Biryani', nameTamil: 'காய்கறி பிரியாணி', price: 160, isVeg: true, prepTime: 18, catIdx: 2 },
    { name: 'Butter Chicken', nameTamil: 'பட்டர் சிக்கன்', price: 240, isVeg: false, prepTime: 15, catIdx: 1 },
    { name: 'Paneer Butter Masala', nameTamil: 'பன்னீர் பட்டர் மசாலா', price: 200, isVeg: true, prepTime: 12, catIdx: 1 },
    { name: 'Meals (Veg Thali)', nameTamil: 'சைவ மீல்ஸ்', price: 120, isVeg: true, prepTime: 8, catIdx: 1 },
    { name: 'Masala Chai', nameTamil: 'மசாலா டீ', price: 30, isVeg: true, prepTime: 5, catIdx: 3 },
    { name: 'Fresh Lime Soda', nameTamil: 'எலுமிச்சை சோடா', price: 50, isVeg: true, prepTime: 3, catIdx: 3 },
    { name: 'Mango Lassi', nameTamil: 'மாம்பழ லஸ்ஸி', price: 80, isVeg: true, prepTime: 5, catIdx: 3 },
    { name: 'Gulab Jamun', nameTamil: 'குலாப் ஜாமூன்', price: 60, isVeg: true, prepTime: 2, catIdx: 4 },
    { name: 'Ice Cream', nameTamil: 'ஐஸ்கிரீம்', price: 80, isVeg: true, prepTime: 2, catIdx: 4 },
  ];

  for (const item of items) {
    await prisma.menuItem.create({
      data: {
        name: item.name,
        nameTamil: item.nameTamil,
        price: item.price,
        isVeg: item.isVeg,
        prepTimeMinutes: item.prepTime,
        categoryId: cats[item.catIdx].id,
        restaurantId: restaurant.id,
      },
    });
  }
  console.log('✅ 14 Menu items created');

  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
