const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  clinicId: z.string().uuid().optional(),
  clinicSlug: z.string().min(1).max(100).optional(),
  role: z
    .enum(['super_admin', 'clinic_admin', 'staff', 'doctor', 'patient'])
    .optional(),
});

const registerPatientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(7).max(20),
  dateOfBirth: z.string().date().optional(),
  gender: z.string().max(20).optional(),
  address: z.string().optional(),
});

const clinicSignupSchema = z.object({
  clinicName: z.string().min(2).max(200),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  admin: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().max(20).optional(),
  }),
});

const createClinicSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
});

const updateClinicSchema = createClinicSchema.partial().extend({
  status: z.enum(['active', 'suspended', 'pending']).optional(),
});

module.exports = {
  loginSchema,
  registerPatientSchema,
  clinicSignupSchema,
  createClinicSchema,
  updateClinicSchema,
};
