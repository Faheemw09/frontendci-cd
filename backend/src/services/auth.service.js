const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');
const env = require('../config/env');
const { publicUser } = require('../utils/helpers');
const { httpError } = require('../utils/httpError');

const ALL_ROLES = ['super_admin', 'clinic_admin', 'staff', 'doctor', 'patient'];

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      clinicId: user.clinicId,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

async function resolveClinicId({ clinicId, clinicSlug }) {
  if (clinicId) return clinicId;
  if (!clinicSlug) return null;
  const clinic = await prisma.clinic.findUnique({ where: { slug: clinicSlug } });
  if (!clinic) throw httpError(404, 'Clinic not found for clinicSlug');
  return clinic.id;
}

async function findUserForLogin(email, { clinicId, role }) {
  const where = { email };
  if (clinicId) where.clinicId = clinicId;
  if (role) where.role = role;

  if (clinicId || role) {
    const matches = await prisma.user.findMany({
      where,
      include: { doctorProfile: true, patientProfile: true },
      take: 5,
    });
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      throw httpError(400, 'Multiple accounts match; provide clinicId/clinicSlug and/or role');
    }
    return null;
  }

  // Prefer platform account (super_admin / patient)
  const platform = await prisma.user.findFirst({
    where: { email, clinicId: null },
    include: { doctorProfile: true, patientProfile: true },
  });
  if (platform) return platform;

  const clinicUsers = await prisma.user.findMany({
    where: { email, clinicId: { not: null } },
    include: { doctorProfile: true, patientProfile: true },
    take: 2,
  });
  if (clinicUsers.length === 1) return clinicUsers[0];
  if (clinicUsers.length > 1) {
    throw httpError(400, 'Multiple clinic accounts for this email; provide clinicId or clinicSlug');
  }
  return null;
}

async function login({ email, password, clinicId, clinicSlug, role }) {
  if (role && !ALL_ROLES.includes(role)) {
    throw httpError(400, 'Invalid role');
  }

  const resolvedClinicId = await resolveClinicId({ clinicId, clinicSlug });
  const user = await findUserForLogin(email.toLowerCase(), {
    clinicId: resolvedClinicId,
    role,
  });

  if (!user || !user.isActive) {
    throw httpError(401, 'Invalid credentials');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw httpError(401, 'Invalid credentials');

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { token: signToken(user), user: publicUser(user) };
}

async function registerPatient(data) {
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { email, clinicId: null },
  });
  if (existing) throw httpError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      phone: data.phone,
      role: 'patient',
      clinicId: null,
      firstName: data.firstName,
      lastName: data.lastName,
      patientProfile: {
        create: {
          fullName: `${data.firstName} ${data.lastName}`.trim(),
          phone: data.phone,
          email,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender || null,
          address: data.address || null,
        },
      },
    },
    include: { patientProfile: true, doctorProfile: true },
  });

  return { token: signToken(user), user: publicUser(user) };
}

async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctorProfile: true, patientProfile: true },
  });
  return publicUser(user);
}

module.exports = { login, registerPatient, me, signToken, ALL_ROLES };
