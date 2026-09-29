const bcrypt = require('bcryptjs');
const { httpError } = require('../utils/httpError');
const { publicUser } = require('../utils/helpers');

const MANAGEABLE_ROLES = new Set(['clinic_admin', 'staff']);

async function listClinicUsers(db) {
  const users = await db.user.findMany({
    where: { role: { in: ['clinic_admin', 'staff'] } },
    orderBy: { createdAt: 'desc' },
    include: { doctorProfile: true, patientProfile: true },
  });
  return users.map(publicUser);
}

async function getClinicUser(db, id) {
  const user = await db.user.findFirst({
    where: { id, role: { in: ['clinic_admin', 'staff'] } },
    include: { doctorProfile: true, patientProfile: true },
  });
  if (!user) throw httpError(404, 'User not found');
  return publicUser(user);
}

async function createClinicUser(db, clinicId, data) {
  if (!MANAGEABLE_ROLES.has(data.role)) {
    throw httpError(400, 'Role must be clinic_admin or staff');
  }

  const email = data.email.toLowerCase();
  const existing = await db.user.findFirst({ where: { email } });
  if (existing) throw httpError(409, 'Email already in use at this clinic');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await db.user.create({
    data: {
      clinicId,
      email,
      passwordHash,
      phone: data.phone || null,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
    },
    include: { doctorProfile: true, patientProfile: true },
  });
  return publicUser(user);
}

async function updateClinicUser(db, id, data) {
  const existing = await db.user.findFirst({
    where: { id, role: { in: ['clinic_admin', 'staff'] } },
  });
  if (!existing) throw httpError(404, 'User not found');

  const passwordHash = data.password
    ? await bcrypt.hash(data.password, 12)
    : undefined;

  const user = await db.user.update({
    where: { id },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(passwordHash && { passwordHash }),
    },
    include: { doctorProfile: true, patientProfile: true },
  });
  return publicUser(user);
}

async function deactivateClinicUser(db, id) {
  return updateClinicUser(db, id, { isActive: false });
}

/** Super-admin bootstrap: create clinic_admin on a specific clinic (global prisma). */
async function bootstrapClinicAdmin(prisma, clinicId, data) {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) throw httpError(404, 'Clinic not found');

  const email = data.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email, clinicId },
  });
  if (existing) throw httpError(409, 'Email already in use at this clinic');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      clinicId,
      email,
      passwordHash,
      phone: data.phone || null,
      role: 'clinic_admin',
      firstName: data.firstName,
      lastName: data.lastName,
    },
    include: { doctorProfile: true, patientProfile: true },
  });
  return publicUser(user);
}

module.exports = {
  listClinicUsers,
  getClinicUser,
  createClinicUser,
  updateClinicUser,
  deactivateClinicUser,
  bootstrapClinicAdmin,
};
