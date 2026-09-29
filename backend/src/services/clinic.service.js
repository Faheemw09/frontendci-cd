const { prisma } = require('../config/db');
const { slugify } = require('../utils/helpers');
const { httpError } = require('../utils/httpError');

async function listClinics() {
  return prisma.clinic.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

async function getClinicById(id) {
  const clinic = await prisma.clinic.findUnique({ where: { id } });
  if (!clinic) throw httpError(404, 'Clinic not found');
  return clinic;
}

async function createClinic(data) {
  const slug = data.slug || slugify(data.name);
  return prisma.clinic.create({
    data: {
      name: data.name,
      slug,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      region: data.region,
      status: data.status || 'pending',
      plan: data.plan || 'basic',
    },
  });
}

async function updateClinic(id, data) {
  await getClinicById(id);
  return prisma.clinic.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.region !== undefined && { region: data.region }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.plan !== undefined && { plan: data.plan }),
    },
  });
}

async function approveClinic(id) {
  return updateClinic(id, { status: 'active' });
}

async function suspendClinic(id) {
  return updateClinic(id, { status: 'suspended' });
}

module.exports = {
  listClinics,
  getClinicById,
  createClinic,
  updateClinic,
  approveClinic,
  suspendClinic,
};
