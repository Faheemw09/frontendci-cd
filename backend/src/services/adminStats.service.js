const { prisma } = require('../config/db');
const env = require('../config/env');

async function getPlatformStats() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    totalClinics,
    activeClinics,
    pendingClinics,
    suspendedClinics,
    bookingsThisMonth,
    openTickets,
    breachedTickets,
    openPlatformIssues,
  ] = await Promise.all([
    prisma.clinic.count(),
    prisma.clinic.count({ where: { status: 'active' } }),
    prisma.clinic.count({ where: { status: 'pending' } }),
    prisma.clinic.count({ where: { status: 'suspended' } }),
    prisma.appointment.count({
      where: {
        createdAt: { gte: monthStart },
        status: { not: 'cancelled' },
      },
    }),
    prisma.supportTicket.count({
      where: { status: { in: ['open', 'in_progress'] } },
    }),
    prisma.supportTicket.count({
      where: {
        status: { in: ['open', 'in_progress'] },
        createdAt: {
          lt: new Date(Date.now() - env.ticketSlaHours * 60 * 60 * 1000),
        },
      },
    }),
    prisma.platformIssue.count({
      where: { status: { in: ['open', 'investigating'] } },
    }),
  ]);

  return {
    totalClinics,
    activeClinics,
    pendingClinics,
    suspendedClinics,
    inactiveClinics: suspendedClinics,
    bookingsThisMonth,
    openTickets,
    slaBreachedTickets: breachedTickets,
    openPlatformIssues,
    slaHours: env.ticketSlaHours,
  };
}

module.exports = { getPlatformStats };
