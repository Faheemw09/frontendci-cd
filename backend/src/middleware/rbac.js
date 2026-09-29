const { authenticate } = require('./authenticate');
const { authorize } = require('./authorize');
const { tenantScope } = require('./tenantScope');

/**
 * Reusable stack for clinic-tenant routes.
 * Usage: router.get('/', ...clinicScoped('clinic_admin', 'staff'), handler)
 *
 * Guarantees: JWT verified → role allowed → req.db is clinic-scoped Prisma.
 */
function clinicScoped(...roles) {
  const allowed = roles.length ? roles : ['clinic_admin', 'staff', 'doctor'];
  return [authenticate, authorize(...allowed), tenantScope];
}

/**
 * Platform routes (super_admin / patient) — global Prisma on req.db.
 */
function platformScoped(...roles) {
  return [authenticate, authorize(...roles), tenantScope];
}

module.exports = { clinicScoped, platformScoped };
