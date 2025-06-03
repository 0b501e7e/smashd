const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Function to calculate the difference in days between two dates
function dateDiffInDays(a, b) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

// Function to add days to a date
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function expirePoints() {
  console.log('Running scheduled job: Expire Loyalty Points - Starting');
  const today = new Date();

  try {
    const loyaltyAccounts = await prisma.loyaltyPoints.findMany({
      where: {
        points: { gt: 0 } // Only process accounts with points
      }
    });

    for (const account of loyaltyAccounts) {
      const registrationDate = new Date(account.registrationDate);
      const daysSinceRegistration = dateDiffInDays(registrationDate, today);

      if (daysSinceRegistration < 90) {
        // Not yet reached the first 90-day cycle
        continue;
      }

      const numberOf90DayCyclesSinceRegistration = Math.floor(daysSinceRegistration / 90);
      const lastTheoreticalResetDate = addDays(registrationDate, numberOf90DayCyclesSinceRegistration * 90);
      
      // Determine the start of the current 90-day cycle for which points *should have been* reset
      // This is essentially the most recent 90-day anniversary of their registration that has passed.
      let currentCycleStartDate = registrationDate;
      while(addDays(currentCycleStartDate, 90) <= today) {
        currentCycleStartDate = addDays(currentCycleStartDate, 90);
      }
      // currentCycleStartDate is now the beginning of the 90-day period that just ended or is ending today.
      // If lastPointsReset is before this date, it means this cycle's expiration hasn't run.

      const lastResetDate = account.lastPointsReset ? new Date(account.lastPointsReset) : null;

      // If points have never been reset OR the last reset was before the start of the just-completed/ing 90-day cycle
      if (!lastResetDate || lastResetDate < currentCycleStartDate) {
        console.log(`Expiring ${account.points} points for user ${account.userId} (Cycle End: ${currentCycleStartDate.toISOString().split('T')[0]})`);

        await prisma.$transaction(async (tx) => {
          await tx.pointsTransaction.create({
            data: {
              userId: account.userId,
              loyaltyPointsId: account.id,
              points: -account.points, // Deduct all current points
              reason: "POINTS_EXPIRED_90_DAY_CYCLE",
              details: `Points expired at end of 90-day cycle. Registered: ${registrationDate.toISOString().split('T')[0]}. Cycle end: ${currentCycleStartDate.toISOString().split('T')[0]}`, 
            },
          });

          await tx.loyaltyPoints.update({
            where: { id: account.id },
            data: {
              points: 0,
              lastPointsReset: today, // Mark that reset for this cycle has been done now
            },
          });
        });
        console.log(`Successfully expired points for user ${account.userId}`);
      } else {
        // console.log(`Points for user ${account.userId} are current or already reset for this cycle (Last Reset: ${lastResetDate?.toISOString().split('T')[0]}, Cycle Start: ${currentCycleStartDate.toISOString().split('T')[0]}). Skipping.`);
      }
    }
  } catch (error) {
    console.error('Error during points expiration job:', error);
  }
  console.log('Scheduled job: Expire Loyalty Points - Finished');
}

async function handleBirthdayRewardsAndAnnualReset() {
  console.log('Running scheduled job: Handle Birthday Rewards & Annual Reset - Starting');
  const today = new Date();
  const currentYear = today.getFullYear();
  const firstDayOfYear = new Date(currentYear, 0, 1);

  try {
    const usersWithLoyalty = await prisma.user.findMany({
      where: {
        loyaltyPoints: {
          isNot: null,
        },
        dateOfBirth: {
          not: null,
        }
      },
      include: {
        loyaltyPoints: true,
      },
    });

    for (const user of usersWithLoyalty) {
      if (!user.loyaltyPoints || !user.dateOfBirth) continue;

      const userDob = new Date(user.dateOfBirth);
      const userBirthdayThisYear = new Date(currentYear, userDob.getMonth(), userDob.getDate());

      // Annual Reset Logic (run if it's the first day of the year)
      if (today.getMonth() === 0 && today.getDate() === 1) {
        // Check if lastPointsReset is null or was before the start of this year
        // This is to ensure we only reset once per year
        const lastResetYear = user.loyaltyPoints.lastPointsReset ? new Date(user.loyaltyPoints.lastPointsReset).getFullYear() : 0;
        if (lastResetYear < currentYear) {
            console.log(`Performing annual reset for user ${user.id}.`);
            await prisma.loyaltyPoints.update({
              where: { userId: user.id },
              data: {
                totalSpentThisYear: 0,
                birthdayRewardSent: false,
                // lastPointsReset: today, // We use lastPointsReset for 90-day cycle, maybe a new field like 'lastAnnualReset'?
                                        // For now, we'll rely on checking the year of lastPointsReset or if birthdayRewardSent was reset
              },
            });
             console.log(`Annual reset complete for user ${user.id}.`);
        }
      }

      // Birthday Reward Logic
      // Check if today is the user's birthday (ignoring year)
      // And if their total spent this year is >= 600
      // And if they haven't received their birthday reward this year yet
      if (
        userBirthdayThisYear.getMonth() === today.getMonth() &&
        userBirthdayThisYear.getDate() === today.getDate() &&
        user.loyaltyPoints.totalSpentThisYear >= 600 &&
        !user.loyaltyPoints.birthdayRewardSent
      ) {
        console.log(`Processing birthday reward for user ${user.id}.`);
        const rewardMessage = "Happy Birthday! Enjoy a free burger on us! Show this notification to redeem.";
        const rewardTitle = "🎂 Happy Birthday!";

        await prisma.$transaction(async (tx) => {
          await tx.notification.create({
            data: {
              userId: user.id,
              type: 'BIRTHDAY_REWARD',
              title: rewardTitle,
              message: rewardMessage,
              sentAt: today,
            },
          });

          await tx.loyaltyPoints.update({
            where: { userId: user.id },
            data: {
              birthdayRewardSent: true,
            },
          });
        });
        console.log(`Birthday reward notification created for user ${user.id}.`);
      }
    }
  } catch (error) {
    console.error('Error during birthday rewards and annual reset job:', error);
  }
  console.log('Scheduled job: Handle Birthday Rewards & Annual Reset - Finished');
}

// Schedule the job to run, for example, once a day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('\n------------------------------------');
  await expirePoints();
  await handleBirthdayRewardsAndAnnualReset();
  console.log('------------------------------------\n');
}, {
  scheduled: true,
  timezone: "Europe/Dublin" // Set your desired timezone
});

console.log('Loyalty points expiration cron job defined and scheduled to run daily at 2 AM Europe/Dublin.');

// Export for potential manual triggering or testing if needed
module.exports = { expirePoints, handleBirthdayRewardsAndAnnualReset }; 