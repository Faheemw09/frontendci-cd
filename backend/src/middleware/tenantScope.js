const { prisma } = require('../config/db');
const { createTenantPrisma, TENANT_MODELS } = require('../utils/prismaTenant');

const PLATFORM_ROLES = new Set(['super_admin', 'patient']);
const CLINIC_ROLES = new Set(['clinic_admin', 'staff', 'doctor']);

/**
 * Attaches req.db:
 * - clinic roles → tenant-scoped Prisma (clinicId forced on every tenant model op)
 * - super_admin / patient → global Prisma (ownership filters live in services)
 *
 * Also sets req.prisma = null for clinic roles so handlers cannot casually
 * reach for an unscoped client (use req.db only).
 */
function tenantScope(req, res, next) {
  const { role, clinicId } = req.user;

  const bodyClinicId = req.body?.clinicId;
  const queryClinicId = req.query?.clinicId;
  const paramClinicId = req.params?.clinicId;

  if (CLINIC_ROLES.has(role)) {
    if (!clinicId) {
      return res.status(403).json({ error: 'User is not bound to a clinic' });
    }

    const attempted =
      bodyClinicId ||
      queryClinicId ||
      (paramClinicId && paramClinicId !== 'me' ? paramClinicId : null);

    if (attempted && attempted !== clinicId) {
      return res.status(403).json({ error: 'Cross-tenant clinicId rejected' });
    }

    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'clinicId')) {
      delete req.body.clinicId;
    }

    req.clinicId = clinicId;
    req.db = createTenantPrisma(prisma, clinicId);
    // Discourage accidental use of global client in clinic routes
    Object.defineProperty(req, 'prisma', {
      get() {
        throw new Error(
          'Use req.db (tenant-scoped). Global prisma is blocked for clinic roles.'
        );
      },
    });
    return next();
  }

  if (PLATFORM_ROLES.has(role)) {
    req.clinicId = null;
    req.db = prisma;
    req.prisma = prisma;
    return next();
  }

  return res.status(403).json({ error: 'Unknown role' });
}

/**
 * Assert handler is using a scoped client (clinicId present on req).
 * Call at the top of clinic-only services if desired.
 */
function assertTenantDb(req) {
  if (!req.clinicId || !req.db) {
    const err = new Error('Tenant-scoped database client required');
    err.status = 500;
    throw err;
  }
}

module.exports = {
  tenantScope,
  assertTenantDb,
  PLATFORM_ROLES,
  CLINIC_ROLES,
  TENANT_MODELS,
};
