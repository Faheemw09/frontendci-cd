const { z } = require('zod');

const timeHm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM 24h');

const confirmBookingSchema = z.object({
  doctorId: z.string().uuid(),
  patientId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: timeHm,
  notes: z.string().max(2000).optional(),
});

const walkInBookingSchema = z.object({
  doctorId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: timeHm,
  notes: z.string().max(2000).optional(),
  patient: z.object({
    fullName: z.string().min(1).max(200),
    phone: z.string().min(7).max(20),
    email: z.string().email().optional(),
  }),
});

const cancelAppointmentSchema = z.object({
  reason: z.string().max(500).optional(),
});

const updateAppointmentStatusSchema = z.object({
  status: z.enum(['completed', 'no_show', 'cancelled']),
});

module.exports = {
  confirmBookingSchema,
  walkInBookingSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
  bookAppointmentSchema: confirmBookingSchema,
};
