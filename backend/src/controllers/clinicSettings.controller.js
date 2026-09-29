const clinicSettings = require('../services/clinicSettings.service');
const appointmentService = require('../services/appointment.service');
const { z } = require('zod');
const { asyncHandler } = require('../utils/helpers');

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  region: z.string().max(100).nullable().optional(),
  logoUrl: z.string().max(500000).nullable().optional(),
  settings: z
    .object({
      hours: z
        .array(
          z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            open: z.string(),
            close: z.string(),
            closed: z.boolean().optional(),
          })
        )
        .optional(),
      holidays: z
        .array(
          z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            label: z.string().max(200),
          })
        )
        .optional(),
    })
    .optional(),
});

const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

const getSettings = asyncHandler(async (req, res) => {
  const clinic = await clinicSettings.getMyClinic(req.clinicId);
  res.json({ clinic });
});

const patchSettings = asyncHandler(async (req, res) => {
  const body = updateSchema.parse(req.body);
  const clinic = await clinicSettings.updateMyClinic(req.clinicId, body);
  res.json({ clinic });
});

const reschedule = asyncHandler(async (req, res) => {
  const body = rescheduleSchema.parse(req.body);
  const result = await appointmentService.rescheduleAppointment({
    actor: req.user,
    appointmentId: req.params.id,
    date: body.date,
    startTime: body.startTime,
  });
  res.json(result);
});

module.exports = { getSettings, patchSettings, reschedule };
