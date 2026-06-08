import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma';

/* eslint-disable no-console -- deployment scripts must report bootstrap status */

const subjectId = process.env.ADMIN_SUBJECT_ID?.trim();

const bootstrapIdentity = (subject: string): { username: string; email: string } => {
  const suffix = createHash('sha256').update(subject).digest('hex').slice(0, 12);
  return {
    username: `bootstrap-admin-${suffix}`,
    email: `bootstrap-admin-${suffix}@auth2.local`,
  };
};

async function main(): Promise<void> {
  if (!subjectId) {
    console.log('ADMIN_SUBJECT_ID is not set; skipping admin bootstrap.');
    return;
  }

  const identity = bootstrapIdentity(subjectId);
  const admin = await prisma.user.upsert({
    where: { subjectId },
    update: { role: 'admin' },
    create: {
      subjectId,
      username: identity.username,
      email: identity.email,
      firstName: 'Bootstrap',
      lastName: 'Admin',
      role: 'admin',
    },
    select: {
      id: true,
      subjectId: true,
      username: true,
      role: true,
    },
  });

  console.log(
    `Admin bootstrap complete for subject ${admin.subjectId} (user ${admin.id}, role ${admin.role}).`
  );
}

main()
  .catch((error) => {
    console.error('Admin bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
