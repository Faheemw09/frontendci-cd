const { prisma } = require('../config/db');
const { httpError } = require('../utils/httpError');

async function getMyClinic(clinicId) {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) throw httpError(404, 'Clinic not found');
  return clinic;
}

async function updateMyClinic(clinicId, data) {
  const existing = await prisma.clinic.findUnique({ where: { id: clinicId } });
  if (!existing) throw httpError(404, 'Clinic not found');

  const settings = {
    ...(existing.settings && typeof existing.settings === 'object' ? existing.settings : {}),
    ...(data.settings || {}),
  };

  return prisma.clinic.update({
    where: { id: clinicId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.region !== undefined && { region: data.region }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      settings,
    },
  });
}

module.exports = { getMyClinic, updateMyClinic };
