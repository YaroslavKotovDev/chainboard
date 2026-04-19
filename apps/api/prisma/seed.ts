import { PrismaClient, ClaimStatus, RewardStatus, TransactionStatus, SnapshotScope } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic fixtures — realistic enough to make the dashboard credible
// ---------------------------------------------------------------------------

const WALLETS = [
  { address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', chainId: 84532, label: 'Main wallet' },
  { address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chainId: 84532, label: 'DeFi wallet' },
  { address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db', chainId: 84532, label: null },
];

const REWARDS = [
  {
    title: 'Early Adopter Bonus',
    description: 'Reward for wallets active before the platform launch.',
    status: RewardStatus.ACTIVE,
    totalAmount: '10000.000000000000000000',
    startAt: new Date('2026-01-01'),
    endAt: new Date('2026-12-31'),
  },
  {
    title: 'Q1 Trading Volume Reward',
    description: 'Distributed to top trading wallets in Q1 2026.',
    status: RewardStatus.ACTIVE,
    totalAmount: '5000.000000000000000000',
    startAt: new Date('2026-01-01'),
    endAt: new Date('2026-03-31'),
  },
  {
    title: 'Referral Incentive',
    description: 'Reward for referring verified users to ChainBoard.',
    status: RewardStatus.PAUSED,
    totalAmount: '2500.000000000000000000',
    startAt: new Date('2026-02-01'),
    endAt: new Date('2026-06-30'),
  },
  {
    title: 'Beta Tester Grant',
    description: 'One-time grant for beta program participants.',
    status: RewardStatus.EXPIRED,
    totalAmount: '1000.000000000000000000',
    startAt: new Date('2025-09-01'),
    endAt: new Date('2025-12-31'),
  },
  {
    title: 'Loyalty Milestone',
    description: 'Reward for wallets holding for 90+ consecutive days.',
    status: RewardStatus.ACTIVE,
    totalAmount: '7500.000000000000000000',
    startAt: new Date('2026-03-01'),
    endAt: new Date('2026-09-30'),
  },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomHex(bytes: number): string {
  return (
    '0x' +
    Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('')
  );
}

async function main() {
  console.log('🌱 Seeding ChainBoard database...');

  // ------------------------------------------------------------------
  // Users + Wallets + Roles
  // ------------------------------------------------------------------
  const users = await Promise.all(
    WALLETS.map(async (w, i) => {
      const user = await prisma.user.create({
        data: {
          displayName: i === 0 ? 'Alice' : i === 1 ? 'Bob' : null,
          role: {
            create: { name: i === 0 ? 'ADMIN' : 'USER' },
          },
          wallets: {
            create: {
              address: w.address,
              chainId: w.chainId,
              isVerified: true,
              label: w.label,
            },
          },
        },
        include: { wallets: true },
      });
      return user;
    }),
  );

  console.log(`  ✓ Created ${users.length} users with wallets`);

  // ------------------------------------------------------------------
  // Rewards
  // ------------------------------------------------------------------
  const rewards = await Promise.all(
    REWARDS.map((r) =>
      prisma.reward.create({
        data: {
          ...r,
          claimedAmount: '0',
        },
      }),
    ),
  );

  console.log(`  ✓ Created ${rewards.length} rewards`);

  // ------------------------------------------------------------------
  // Claims + Transactions (varied statuses)
  // ------------------------------------------------------------------
  const claimScenarios: Array<{
    userIdx: number;
    rewardIdx: number;
    status: ClaimStatus;
    txStatus?: TransactionStatus;
    daysBack: number;
  }> = [
    { userIdx: 0, rewardIdx: 0, status: 'CONFIRMED', txStatus: 'CONFIRMED', daysBack: 30 },
    { userIdx: 0, rewardIdx: 1, status: 'CONFIRMED', txStatus: 'CONFIRMED', daysBack: 20 },
    { userIdx: 0, rewardIdx: 2, status: 'PENDING', daysBack: 5 },
    { userIdx: 0, rewardIdx: 4, status: 'FAILED', txStatus: 'FAILED', daysBack: 10 },
    { userIdx: 1, rewardIdx: 0, status: 'CONFIRMED', txStatus: 'CONFIRMED', daysBack: 28 },
    { userIdx: 1, rewardIdx: 1, status: 'SUBMITTED', txStatus: 'PENDING', daysBack: 2 },
    { userIdx: 1, rewardIdx: 3, status: 'REJECTED', daysBack: 60 },
    { userIdx: 1, rewardIdx: 4, status: 'CONFIRMED', txStatus: 'CONFIRMED', daysBack: 8 },
    { userIdx: 2, rewardIdx: 0, status: 'CONFIRMED', txStatus: 'CONFIRMED', daysBack: 25 },
    { userIdx: 2, rewardIdx: 1, status: 'PENDING', daysBack: 1 },
    { userIdx: 2, rewardIdx: 2, status: 'FAILED', txStatus: 'FAILED', daysBack: 15 },
    { userIdx: 2, rewardIdx: 4, status: 'SUBMITTED', txStatus: 'PENDING', daysBack: 3 },
  ];

  for (const scenario of claimScenarios) {
    const user = users[scenario.userIdx]!;
    const wallet = user.wallets[0]!;
    const reward = rewards[scenario.rewardIdx]!;
    const claimedAt = scenario.status === 'CONFIRMED' ? daysAgo(scenario.daysBack) : null;

    const claim = await prisma.claim.create({
      data: {
        userId: user.id,
        rewardId: reward.id,
        walletId: wallet.id,
        status: scenario.status,
        claimedAt,
        createdAt: daysAgo(scenario.daysBack),
        updatedAt: daysAgo(Math.max(0, scenario.daysBack - 1)),
      },
    });

    if (scenario.txStatus) {
      await prisma.transaction.create({
        data: {
          hash: randomHex(32),
          chainId: wallet.chainId,
          walletId: wallet.id,
          claimId: claim.id,
          status: scenario.txStatus,
          blockNumber: scenario.txStatus === 'CONFIRMED' ? BigInt(12_000_000 + scenario.daysBack * 100) : null,
          gasUsed: scenario.txStatus === 'CONFIRMED' ? BigInt(85_000) : null,
          createdAt: daysAgo(scenario.daysBack),
          updatedAt: daysAgo(Math.max(0, scenario.daysBack - 1)),
        },
      });
    }
  }

  console.log(`  ✓ Created ${claimScenarios.length} claims with transactions`);

  // ------------------------------------------------------------------
  // Analytics snapshots — 90 days of daily data
  // ------------------------------------------------------------------
  const metrics = ['claims_count', 'success_rate', 'active_wallets', 'volume_usd'];
  const snapshots: Array<Parameters<typeof prisma.analyticsSnapshot.create>[0]['data']> = [];

  for (let day = 89; day >= 0; day--) {
    const periodStart = daysAgo(day + 1);
    const periodEnd = daysAgo(day);

    for (const metric of metrics) {
      let value: number;
      switch (metric) {
        case 'claims_count':
          value = Math.floor(Math.random() * 20 + 5);
          break;
        case 'success_rate':
          value = Math.random() * 30 + 65; // 65–95%
          break;
        case 'active_wallets':
          value = Math.floor(Math.random() * 8 + 2);
          break;
        case 'volume_usd':
          value = Math.random() * 50_000 + 10_000;
          break;
        default:
          value = 0;
      }

      snapshots.push({
        scope: SnapshotScope.DAILY,
        metric,
        value,
        periodStart,
        periodEnd,
      });
    }
  }

  // Weekly snapshots (last 12 weeks)
  for (let week = 11; week >= 0; week--) {
    const periodStart = daysAgo((week + 1) * 7);
    const periodEnd = daysAgo(week * 7);
    for (const metric of metrics) {
      snapshots.push({
        scope: SnapshotScope.WEEKLY,
        metric,
        value: Math.random() * 100 + 50,
        periodStart,
        periodEnd,
      });
    }
  }

  await prisma.analyticsSnapshot.createMany({ data: snapshots });
  console.log(`  ✓ Created ${snapshots.length} analytics snapshots`);

  // ------------------------------------------------------------------
  // Audit log entries
  // ------------------------------------------------------------------
  const adminUser = users[0]!;
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'REWARD_CREATED',
        entityType: 'Reward',
        entityId: rewards[0]!.id,
        createdAt: daysAgo(60),
      },
      {
        userId: adminUser.id,
        action: 'REWARD_PAUSED',
        entityType: 'Reward',
        entityId: rewards[2]!.id,
        metadata: { reason: 'Budget review' },
        createdAt: daysAgo(10),
      },
      {
        userId: adminUser.id,
        action: 'CLAIM_REJECTED',
        entityType: 'Claim',
        entityId: 'placeholder',
        metadata: { reason: 'Ineligible wallet' },
        createdAt: daysAgo(55),
      },
    ],
  });

  console.log('  ✓ Created audit log entries');
  console.log('\n✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
