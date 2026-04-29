import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@dev.local';

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {
      email: ADMIN_EMAIL,
      role: 'admin',
    },
    create: {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      role: 'admin',
    },
  });

  console.log(`Seeded admin user: ${admin.username} (${admin.email})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
