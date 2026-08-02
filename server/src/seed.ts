import bcrypt from 'bcryptjs';
import prisma from './lib/prisma';

export async function seedAdmin() {
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existing = await prisma.admin.findUnique({
      where: { username: adminUsername },
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (!existing) {
      await prisma.admin.create({
        data: {
          username: adminUsername,
          password: hashedPassword,
        },
      });
      console.log(`Admin user created: ${adminUsername}`);
    } else {
      await prisma.admin.update({
        where: { id: existing.id },
        data: { password: hashedPassword },
      });
      console.log(`Admin user updated: ${adminUsername}`);
    }
  } catch (error) {
    console.error('Seed admin error:', error);
  }
}
