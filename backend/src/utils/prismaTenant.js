/**
 * Tenant-scoped Prisma client.
 *
 * For TENANT_MODELS, clinicId is ALWAYS forced on where/data (last-write wins),
 * so a buggy service cannot query another tenant by passing a foreign clinicId.
 * Patient and Clinic are intentionally excluded (global / root).
 */

const TENANT_MODELS = new Set([
  'User',
  'Doctor',
  'DoctorAvailability',
  'DoctorLeave',
  'Appointment',
  'SupportTicket',
  'NotificationLog',
]);

function modelKey(model) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function forceWhere(args, clinicId) {
  args.where = { ...(args.where || {}), clinicId };
}

function forceData(args, clinicId) {
  if (Array.isArray(args.data)) {
    args.data = args.data.map((row) => ({ ...row, clinicId }));
  } else {
    args.data = { ...(args.data || {}), clinicId };
  }
}

function createTenantPrisma(basePrisma, clinicId) {
  if (!clinicId) {
    throw new Error('createTenantPrisma requires clinicId');
  }

  return basePrisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) forceWhere(args, clinicId);
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (TENANT_MODELS.has(model)) forceWhere(args, clinicId);
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const result = await query(args);
          if (
            TENANT_MODELS.has(model) &&
            result &&
            result.clinicId != null &&
            result.clinicId !== clinicId
          ) {
            return null;
          }
          return result;
        },
        async findUniqueOrThrow({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            const delegate = basePrisma[modelKey(model)];
            const owned = await delegate.findFirst({
              where: { ...args.where, clinicId },
            });
            if (!owned) {
              const err = new Error('Record not found');
              err.code = 'P2025';
              throw err;
            }
          }
          return query(args);
        },
        async create({ model, args, query }) {
          if (TENANT_MODELS.has(model)) forceData(args, clinicId);
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) forceData(args, clinicId);
          return query(args);
        },
        async update({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            const delegate = basePrisma[modelKey(model)];
            const owned = await delegate.findFirst({
              where: { ...args.where, clinicId },
            });
            if (!owned) {
              const err = new Error('Record not found');
              err.code = 'P2025';
              throw err;
            }
            if (args.data && Object.prototype.hasOwnProperty.call(args.data, 'clinicId')) {
              args.data.clinicId = clinicId;
            }
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            forceWhere(args, clinicId);
            if (args.data && Object.prototype.hasOwnProperty.call(args.data, 'clinicId')) {
              args.data.clinicId = clinicId;
            }
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            args.create = { ...(args.create || {}), clinicId };
            if (args.update && Object.prototype.hasOwnProperty.call(args.update, 'clinicId')) {
              args.update.clinicId = clinicId;
            }
            // Verify existing row is in-tenant when where matches
            const delegate = basePrisma[modelKey(model)];
            const existing = await delegate.findFirst({
              where: { ...args.where, clinicId },
            });
            if (!existing) {
              // May be create path; still stamp create
              forceWhere(args, clinicId);
            }
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            const delegate = basePrisma[modelKey(model)];
            const owned = await delegate.findFirst({
              where: { ...args.where, clinicId },
            });
            if (!owned) {
              const err = new Error('Record not found');
              err.code = 'P2025';
              throw err;
            }
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) forceWhere(args, clinicId);
          return query(args);
        },
        async count({ model, args, query }) {
          if (TENANT_MODELS.has(model)) forceWhere(args, clinicId);
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (TENANT_MODELS.has(model)) forceWhere(args, clinicId);
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (TENANT_MODELS.has(model)) forceWhere(args, clinicId);
          return query(args);
        },
      },
    },
  });
}

module.exports = { createTenantPrisma, TENANT_MODELS };
