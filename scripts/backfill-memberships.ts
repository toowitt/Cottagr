#!/usr/bin/env ts-node

import { prisma } from '../src/lib/prisma';
import {
  planMembershipBackfill,
  describeBackfillOperation,
  applyBackfillOperations,
  BackfillOwnerProfile,
  BackfillUser,
} from '../src/lib/auth/backfill';
import { InviteStatus } from '@prisma/client';

const args = process.argv.slice(2);
const applyMode = args.includes('--apply');
const dryRunMode = args.includes('--dry-run') || !applyMode;
const jsonMode = args.includes('--json');

function logHeader(message: string) {
  if (!jsonMode) {
    console.log(`\n=== ${message} ===`);
  }
}

async function run() {
  logHeader(`Backfill property memberships (${dryRunMode ? 'dry-run' : 'apply'})`);

  const users: BackfillUser[] = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  const ownerProfiles: BackfillOwnerProfile[] = await prisma.ownerProfile.findMany({
    orderBy: { id: 'asc' },
    include: {
      ownerships: {
        select: {
          propertyId: true,
          role: true,
        },
      },
      memberships: {
        select: {
          id: true,
          propertyId: true,
          userId: true,
          role: true,
        },
      },
      invites: {
        where: { status: InviteStatus.PENDING },
        select: {
          id: true,
          propertyId: true,
          status: true,
          role: true,
        },
      },
    },
  });

  const plan = planMembershipBackfill(ownerProfiles, users);
  const { operations, conflicts } = plan;

  if (operations.length === 0) {
    if (!jsonMode) {
      console.log('No operations required.');
    }
  } else if (!jsonMode) {
    logHeader('Planned operations');
    operations.forEach((operation) => {
      console.log(`- ${describeBackfillOperation(operation)}`);
    });
  }

  if (conflicts.length > 0 && !jsonMode) {
    logHeader('Conflicts detected');
    conflicts.forEach((conflict) => {
      console.error(
        `ownerProfile#${conflict.ownerProfileId} (${conflict.email}): ${conflict.reason}`,
      );
    });
  }

  const summary = {
    mode: dryRunMode ? 'dry-run' : 'apply',
    ownerProfiles: ownerProfiles.length,
    linkedProfiles: plan.linkedProfiles,
    membershipsCreated: plan.membershipsCreated,
    invitesClaimed: plan.invitesClaimed,
    conflicts: conflicts.length,
  };

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          summary,
          operations,
          conflicts,
        },
        null,
        2,
      ),
    );
  } else {
    logHeader('Summary');
    console.log(JSON.stringify(summary, null, 2));
  }

  if (conflicts.length > 0) {
    process.exitCode = 1;
    if (!dryRunMode) {
      console.error('\nConflicts detected. Aborting without applying changes.');
    }
    return;
  }

  if (dryRunMode) {
    return;
  }

  if (operations.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await applyBackfillOperations(tx, operations);
  });

  console.log('\nBackfill completed successfully.');
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
