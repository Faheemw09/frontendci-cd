/**
 * Seed: super_admin + 2 clinics with admins, staff, doctors, availability, patients.
 * Password for all demo users: Password123!
 *
 * Idempotent: skips creating rows that already exist (by email/slug).
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const env = require('../src/config/env');

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password123!';

async function hash(pw) {
  return bcrypt.hash(pw, 12);
}

async function ensureUser(data) {
  const existing = await prisma.user.findFirst({
    where: {
      email: data.email,
      clinicId: data.clinicId ?? null,
    },
    include: { doctorProfile: true, patientProfile: true },
  });
  if (existing) return existing;
  return prisma.user.create({
    data,
    include: { doctorProfile: true, patientProfile: true },
  });
}

async function ensureClinic({ name, slug, ...rest }) {
  const existing = await prisma.clinic.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.clinic.create({
    data: { name, slug, status: 'active', region: 'Kashmir', ...rest },
  });
}

async function ensureAvailability(doctorId, clinicId, windows) {
  for (const w of windows) {
    const existing = await prisma.doctorAvailability.findFirst({
      where: {
        doctorId,
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
      },
    });
    if (!existing) {
      await prisma.doctorAvailability.create({
        data: { clinicId, doctorId, ...w, isActive: true },
      });
    }
  }
}

async function seedClinicBundle({
  clinic,
  admin,
  staff,
  doctors,
  passwordHash,
}) {
  const c = await ensureClinic(clinic);

  const adminUser = await ensureUser({
    email: admin.email,
    passwordHash,
    role: 'clinic_admin',
    clinicId: c.id,
    firstName: admin.firstName,
    lastName: admin.lastName,
    phone: admin.phone,
  });

  const staffUser = await ensureUser({
    email: staff.email,
    passwordHash,
    role: 'staff',
    clinicId: c.id,
    firstName: staff.firstName,
    lastName: staff.lastName,
    phone: staff.phone,
  });

  const doctorRecords = [];
  for (const d of doctors) {
    let user = await prisma.user.findFirst({
      where: { email: d.email, clinicId: c.id },
      include: { doctorProfile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: d.email,
          passwordHash,
          role: 'doctor',
          clinicId: c.id,
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.phone,
          doctorProfile: {
            create: {
              clinicId: c.id,
              specialization: d.specialization,
              consultationFee: d.consultationFee,
              slotDurationMinutes: d.slotDurationMinutes || 30,
              bio: d.bio || null,
            },
          },
        },
        include: { doctorProfile: true },
      });
    }

    await ensureAvailability(user.doctorProfile.id, c.id, d.availability || []);
    doctorRecords.push(user);
  }

  return { clinic: c, adminUser, staffUser, doctors: doctorRecords };
}

async function ensurePatient({ email, firstName, lastName, phone, passwordHash }) {
  let user = await prisma.user.findFirst({
    where: { email, clinicId: null, role: 'patient' },
    include: { patientProfile: true },
  });
  if (user) return user;

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'patient',
      clinicId: null,
      firstName,
      lastName,
      phone,
      patientProfile: {
        create: {
          fullName: `${firstName} ${lastName}`,
          phone,
          email,
        },
      },
    },
    include: { patientProfile: true },
  });
}

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD);
  const superHash = await hash(env.seed.superAdminPassword);

  await ensureUser({
    email: env.seed.superAdminEmail.toLowerCase(),
    passwordHash: superHash,
    role: 'super_admin',
    clinicId: null,
    firstName: 'Super',
    lastName: 'Admin',
  });
  console.log('✓ super_admin', env.seed.superAdminEmail);

  const clinicA = await seedClinicBundle({
    passwordHash,
    clinic: {
      name: 'Kashmir Care Clinic',
      slug: 'kashmir-care',
      city: 'Srinagar',
      phone: '+910000000001',
      email: 'hello@kashmir-care.local',
      address: 'Residency Road, Srinagar',
    },
    admin: {
      email: 'admin@kashmir-care.local',
      firstName: 'Aisha',
      lastName: 'Khan',
      phone: '+910000000011',
    },
    staff: {
      email: 'staff@kashmir-care.local',
      firstName: 'Imran',
      lastName: 'Bhat',
      phone: '+910000000012',
    },
    doctors: [
      {
        email: 'dr.raza@kashmir-care.local',
        firstName: 'Farooq',
        lastName: 'Raza',
        phone: '+910000000013',
        specialization: 'General Physician',
        consultationFee: 500,
        availability: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
          { dayOfWeek: 1, startTime: '15:00', endTime: '18:00' },
          { dayOfWeek: 3, startTime: '09:00', endTime: '13:00' },
          { dayOfWeek: 5, startTime: '09:00', endTime: '13:00' },
        ],
      },
      {
        email: 'dr.mir@kashmir-care.local',
        firstName: 'Sana',
        lastName: 'Mir',
        phone: '+910000000014',
        specialization: 'Dermatology',
        consultationFee: 800,
        availability: [
          { dayOfWeek: 2, startTime: '10:00', endTime: '14:00' },
          { dayOfWeek: 4, startTime: '10:00', endTime: '14:00' },
        ],
      },
    ],
  });
  console.log('✓ clinic', clinicA.clinic.slug);

  const clinicB = await seedClinicBundle({
    passwordHash,
    clinic: {
      name: 'Valley Health Centre',
      slug: 'valley-health',
      city: 'Anantnag',
      phone: '+910000000002',
      email: 'hello@valley-health.local',
      address: 'Lal Chowk, Anantnag',
    },
    admin: {
      email: 'admin@valley-health.local',
      firstName: 'Naveed',
      lastName: 'Shah',
      phone: '+910000000021',
    },
    staff: {
      email: 'staff@valley-health.local',
      firstName: 'Zoya',
      lastName: 'Dar',
      phone: '+910000000022',
    },
    doctors: [
      {
        email: 'dr.wani@valley-health.local',
        firstName: 'Bilal',
        lastName: 'Wani',
        phone: '+910000000023',
        specialization: 'Pediatrics',
        consultationFee: 600,
        availability: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
          { dayOfWeek: 4, startTime: '14:00', endTime: '18:00' },
        ],
      },
      {
        email: 'dr.lone@valley-health.local',
        firstName: 'Mehreen',
        lastName: 'Lone',
        phone: '+910000000024',
        specialization: 'Orthopedics',
        consultationFee: 900,
        availability: [
          { dayOfWeek: 3, startTime: '11:00', endTime: '16:00' },
          { dayOfWeek: 5, startTime: '11:00', endTime: '16:00' },
        ],
      },
    ],
  });
  console.log('✓ clinic', clinicB.clinic.slug);

  const patient1 = await ensurePatient({
    email: 'patient.one@clinicy.local',
    firstName: 'Arif',
    lastName: 'Hussain',
    phone: '+910000000101',
    passwordHash,
  });
  const patient2 = await ensurePatient({
    email: 'patient.two@clinicy.local',
    firstName: 'Fatima',
    lastName: 'Qadri',
    phone: '+910000000102',
    passwordHash,
  });
  console.log('✓ patients', patient1.email, patient2.email);

  // Sample support ticket at clinic A
  const existingTicket = await prisma.supportTicket.findFirst({
    where: { clinicId: clinicA.clinic.id, subject: 'Seed: booking help' },
  });
  if (!existingTicket) {
    const ticket = await prisma.supportTicket.create({
      data: {
        clinicId: clinicA.clinic.id,
        patientId: patient1.patientProfile.id,
        raisedBy: patient1.id,
        assignedTo: clinicA.staffUser.id,
        subject: 'Seed: booking help',
        description: 'Need help choosing a morning slot with Dr Raza.',
        category: 'general_complaint',
        status: 'open',
        priority: 'medium',
      },
    });
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: patient1.id,
        body: 'Need help choosing a morning slot with Dr Raza.',
      },
    });
    console.log('✓ sample support_ticket at kashmir-care');
  }

  console.log('\nDemo password for clinic/patient users:', DEMO_PASSWORD);
  console.log('Login tip: clinic users → include clinicSlug (e.g. kashmir-care)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
