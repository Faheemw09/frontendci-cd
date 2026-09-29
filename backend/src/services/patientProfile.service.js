const { prisma } = require('../config/db');
const { httpError } = require('../utils/httpError');
const { publicUser } = require('../utils/helpers');

async function getPatientProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { patientProfile: true },
  });
  if (!user || user.role !== 'patient') throw httpError(404, 'Patient not found');
  return {
    user: publicUser(user),
    patient: user.patientProfile,
  };
}

async function updatePatientProfile(userId, data) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { patientProfile: true },
  });
  if (!user || user.role !== 'patient' || !user.patientProfile) {
    throw httpError(404, 'Patient not found');
  }

  const fullName =
    data.fullName ||
    `${data.firstName || user.firstName} ${data.lastName || user.lastName}`.trim();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
    }),
    prisma.patient.update({
      where: { id: user.patientProfile.id },
      data: {
        ...(fullName && { fullName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.dateOfBirth !== undefined && {
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        }),
      },
    }),
  ]);

  const refreshed = await prisma.user.findUnique({
    where: { id: userId },
    include: { patientProfile: true, doctorProfile: true },
  });

  return {
    user: publicUser(refreshed),
    patient: refreshed.patientProfile,
  };
}

module.exports = { getPatientProfile, updatePatientProfile };
