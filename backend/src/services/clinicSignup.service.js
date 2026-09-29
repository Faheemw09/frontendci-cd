const bcrypt = require('bcryptjs');
const { prisma } = require('../config/db');
const { slugify, publicUser } = require('../utils/helpers');
const { httpError } = require('../utils/httpError');
const { signToken } = require('./auth.service');

async function uniqueClinicSlug(name) {
  const base = slugify(name) || 'clinic';
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.clinic.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

/**
 * Public clinic signup: creates Clinic + first clinic_admin in one transaction.
 * Slug auto-generated from clinic name (subdomain-safe).
 */
async function clinicSignup({
  clinicName,
  phone,
  email,
  address,
  city,
  region,
  admin,
}) {
  const adminEmail = admin.email.toLowerCase();

  const platformCollision = await prisma.user.findFirst({
    where: { email: adminEmail, clinicId: null },
  });
  if (platformCollision) {
    throw httpError(409, 'Email already registered as a platform account');
  }

  const slug = await uniqueClinicSlug(clinicName);
  const passwordHash = await bcrypt.hash(admin.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({
      data: {
        name: clinicName,
        slug,
        phone: phone || null,
        email: email || adminEmail,
        address: address || null,
        city: city || null,
        region: region || 'Kashmir',
        status: 'active',
      },
    });

    const existingAtClinic = await tx.user.findFirst({
      where: { email: adminEmail, clinicId: clinic.id },
    });
    if (existingAtClinic) {
      throw httpError(409, 'Email already in use at this clinic');
    }

    const user = await tx.user.create({
      data: {
        clinicId: clinic.id,
        email: adminEmail,
        passwordHash,
        phone: admin.phone || phone || null,
        role: 'clinic_admin',
        firstName: admin.firstName,
        lastName: admin.lastName,
        isActive: true,
      },
      include: { doctorProfile: true, patientProfile: true },
    });

    return { clinic, user };
  });

  const token = signToken(result.user);
  return {
    token,
    user: publicUser(result.user),
    clinic: result.clinic,
  };
}

module.exports = { clinicSignup, uniqueClinicSlug };
