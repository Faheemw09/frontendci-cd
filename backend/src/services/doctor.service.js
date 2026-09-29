const bcrypt = require('bcryptjs');
const { httpError } = require('../utils/httpError');
const { publicUser } = require('../utils/helpers');

function serializeDoctor(doctor) {
  if (!doctor) return null;
  return {
    id: doctor.id,
    clinicId: doctor.clinicId,
    userId: doctor.userId,
    specialization: doctor.specialization,
    bio: doctor.bio,
    photoUrl: doctor.photoUrl,
    consultationFee: doctor.consultationFee,
    slotDurationMinutes: doctor.slotDurationMinutes,
    isActive: doctor.isActive,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
    user: doctor.user ? publicUser({ ...doctor.user, doctorProfile: null, patientProfile: null }) : null,
  };
}

async function listDoctors(db) {
  const doctors = await db.doctor.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true },
  });
  return doctors.map(serializeDoctor);
}

async function getDoctor(db, id) {
  const doctor = await db.doctor.findFirst({
    where: { id },
    include: { user: true },
  });
  if (!doctor) throw httpError(404, 'Doctor not found');
  return serializeDoctor(doctor);
}

async function createDoctor(db, clinicId, data) {
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
      role: 'doctor',
      firstName: data.firstName,
      lastName: data.lastName,
      doctorProfile: {
        create: {
          clinicId,
          specialization: data.specialization,
          bio: data.bio || null,
          consultationFee: data.consultationFee ?? 0,
          slotDurationMinutes: data.slotDurationMinutes ?? 30,
        },
      },
    },
    include: { doctorProfile: { include: { user: true } } },
  });

  return serializeDoctor({ ...user.doctorProfile, user });
}

async function updateDoctor(db, id, data) {
  const doctor = await db.doctor.findFirst({
    where: { id },
    include: { user: true },
  });
  if (!doctor) throw httpError(404, 'Doctor not found');

  const passwordHash = data.password
    ? await bcrypt.hash(data.password, 12)
    : undefined;

  await db.user.update({
    where: { id: doctor.userId },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(passwordHash && { passwordHash }),
      ...(data.isActive === false && { isActive: false }),
      ...(data.isActive === true && { isActive: true }),
    },
  });

  const updated = await db.doctor.update({
    where: { id },
    data: {
      ...(data.specialization !== undefined && { specialization: data.specialization }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.consultationFee !== undefined && { consultationFee: data.consultationFee }),
      ...(data.slotDurationMinutes !== undefined && {
        slotDurationMinutes: data.slotDurationMinutes,
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: { user: true },
  });

  return serializeDoctor(updated);
}

async function deactivateDoctor(db, id) {
  return updateDoctor(db, id, { isActive: false });
}

module.exports = {
  listDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  deactivateDoctor,
  serializeDoctor,
};
