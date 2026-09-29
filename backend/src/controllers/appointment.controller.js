const appointmentService = require('../services/appointment.service');
const {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
} = require('../validators/clinicOps');
const { asyncHandler } = require('../utils/helpers');

const list = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.listAppointments({
    actor: req.user,
    date: req.query.date,
    doctorId: req.query.doctorId,
    patientId: req.query.patientId,
  });
  res.json({ appointments });
});

const book = asyncHandler(async (req, res) => {
  const body = bookAppointmentSchema.parse(req.body);

  let patientId = body.patientId;
  if (req.user.role === 'patient') {
    patientId = req.user.patientProfile?.id;
    if (!patientId) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }
  }

  const appointment = await appointmentService.bookAppointment({
    actor: req.user,
    doctorId: body.doctorId,
    patientId,
    date: body.date,
    startTime: body.startTime,
    notes: body.notes,
  });
  res.status(201).json({ appointment });
});

const cancel = asyncHandler(async (req, res) => {
  const body = cancelAppointmentSchema.parse(req.body || {});
  const appointment = await appointmentService.cancelAppointment({
    actor: req.user,
    appointmentId: req.params.id,
    reason: body.reason,
  });
  res.json({ appointment });
});

const updateStatus = asyncHandler(async (req, res) => {
  const body = updateAppointmentStatusSchema.parse(req.body);
  const appointment = await appointmentService.updateAppointmentStatus({
    actor: req.user,
    appointmentId: req.params.id,
    status: body.status,
  });
  res.json({ appointment });
});

module.exports = { list, book, cancel, updateStatus };
