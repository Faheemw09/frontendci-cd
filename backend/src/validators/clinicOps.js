const { z } = require('zod');

const timeHm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM 24h');

const createClinicUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  role: z.enum(['clinic_admin', 'staff']),
});

const updateClinicUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  specialization: z.string().min(1).max(150),
  bio: z.string().optional(),
  consultationFee: z.coerce.number().nonnegative().optional(),
  slotDurationMinutes: z.coerce.number().int().min(5).max(240).optional(),
});

const updateDoctorSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  specialization: z.string().min(1).max(150).optional(),
  bio: z.string().nullable().optional(),
  consultationFee: z.coerce.number().nonnegative().optional(),
  slotDurationMinutes: z.coerce.number().int().min(5).max(240).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

const availabilityWindowSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: timeHm,
    endTime: timeHm,
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: 'startTime must be before endTime',
    path: ['endTime'],
  });

const createAvailabilitySchema = availabilityWindowSchema;

const updateAvailabilitySchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    startTime: timeHm.optional(),
    endTime: timeHm.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) => {
      if (v.startTime && v.endTime) return v.startTime < v.endTime;
      return true;
    },
    { message: 'startTime must be before endTime', path: ['endTime'] }
  );

const createLeaveSchema = z
  .object({
    startDate: z.string().date(),
    endDate: z.string().date(),
    reason: z.string().max(500).optional(),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: 'startDate must be on or before endDate',
    path: ['endDate'],
  });

const updateLeaveSchema = z
  .object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    reason: z.string().max(500).nullable().optional(),
  })
  .refine(
    (v) => {
      if (v.startDate && v.endDate) return v.startDate <= v.endDate;
      return true;
    },
    { message: 'startDate must be on or before endDate', path: ['endDate'] }
  );

const bootstrapClinicAdminSchema = createClinicUserSchema.extend({
  role: z.literal('clinic_admin').optional().default('clinic_admin'),
});

const replaceAvailabilitySchema = z.object({
  windows: z.array(availabilityWindowSchema).max(50),
});

const slotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
});

const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid(),
  patientId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: timeHm,
  notes: z.string().max(2000).optional(),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
});

const updateAppointmentStatusSchema = z.object({
  status: z.enum(['completed', 'no_show', 'cancelled']),
});

module.exports = {
  createClinicUserSchema,
  updateClinicUserSchema,
  createDoctorSchema,
  updateDoctorSchema,
  createAvailabilitySchema,
  updateAvailabilitySchema,
  replaceAvailabilitySchema,
  createLeaveSchema,
  updateLeaveSchema,
  bootstrapClinicAdminSchema,
  slotsQuerySchema,
  bookAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
};
