const { prisma } = require('../config/db');
const { httpError } = require('../utils/httpError');

async function listActiveClinics() {
  const clinics = await prisma.clinic.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      region: true,
      phone: true,
      email: true,
      logoUrl: true,
      address: true,
      doctors: {
        where: { isActive: true },
        select: { specialization: true },
      },
    },
  });

  return clinics.map((c) => {
    const specialties = [...new Set(c.doctors.map((d) => d.specialization))];
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      city: c.city,
      region: c.region,
      phone: c.phone,
      email: c.email,
      logoUrl: c.logoUrl,
      address: c.address,
      specialties,
      doctorCount: c.doctors.length,
    };
  });
}

async function getClinicBySlugOrId(slugOrId) {
  const clinic = await prisma.clinic.findFirst({
    where: {
      status: 'active',
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      region: true,
      phone: true,
      email: true,
      logoUrl: true,
      address: true,
    },
  });
  if (!clinic) throw httpError(404, 'Clinic not found');
  return clinic;
}

async function getClinicProfile(slugOrId) {
  const clinic = await getClinicBySlugOrId(slugOrId);
  const doctors = await prisma.doctor.findMany({
    where: { clinicId: clinic.id, isActive: true },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { firstName: true, lastName: true, avatarUrl: true },
      },
    },
  });

  const mapped = doctors.map((d) => ({
    id: d.id,
    specialization: d.specialization,
    bio: d.bio,
    photoUrl: d.photoUrl,
    consultationFee: d.consultationFee,
    slotDurationMinutes: d.slotDurationMinutes,
    firstName: d.user.firstName,
    lastName: d.user.lastName,
  }));

  const specialties = [...new Set(mapped.map((d) => d.specialization))];
  const mapQuery = encodeURIComponent(
    [clinic.address, clinic.city, clinic.region].filter(Boolean).join(', ') || clinic.name
  );

  return {
    clinic: {
      ...clinic,
      specialties,
      mapEmbedUrl: `https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed`,
    },
    doctors: mapped,
  };
}

async function listClinicDoctors(slugOrId) {
  const profile = await getClinicProfile(slugOrId);
  return { clinic: profile.clinic, doctors: profile.doctors };
}

module.exports = {
  listActiveClinics,
  getClinicBySlugOrId,
  getClinicProfile,
  listClinicDoctors,
};
