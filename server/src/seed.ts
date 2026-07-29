import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

export async function seedAdmin() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await prisma.admin.findUnique({
      where: { username: adminUsername },
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.admin.create({
        data: {
          username: adminUsername,
          password: hashedPassword,
        },
      });
      console.log(`Admin user created: ${adminUsername}`);
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Seed admin error:', error);
  }
}
