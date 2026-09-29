const appointmentService = require('../services/appointment.service');
const bookingBrowse = require('../services/bookingBrowse.service');
const slotsService = require('../services/slots.service');
const {
  confirmBookingSchema,
  walkInBookingSchema,
  cancelAppointmentSchema,
  updateAppointmentStatusSchema,
} = require('../validators/booking');
const { slotsQuerySchema } = require('../validators/clinicOps');
const { asyncHandler } = require('../utils/helpers');

const listClinics = asyncHandler(async (req, res) => {
  const clinics = await bookingBrowse.listActiveClinics();
  res.json({ clinics });
});

const getClinic = asyncHandler(async (req, res) => {
  const result = await bookingBrowse.getClinicProfile(req.params.slugOrId);
  res.json(result);
});

const listDoctors = asyncHandler(async (req, res) => {
  const result = await bookingBrowse.listClinicDoctors(req.params.slugOrId);
  res.json(result);
});

const listSlots = asyncHandler(async (req, res) => {
  const { date } = slotsQuerySchema.parse(req.query);
  const result = await slotsService.getAvailableSlots(req.params.doctorId, date, null);
  res.json(result);
});

const confirm = asyncHandler(async (req, res) => {
  const body = confirmBookingSchema.parse(req.body);
  let patientId = body.patientId;

  if (req.user.role === 'patient') {
    patientId = req.user.patientProfile?.id;
    if (!patientId) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }
  } else if (!patientId) {
    return res.status(400).json({ error: 'patientId required for staff bookings' });
  }

  const appointment = await appointmentService.confirmBooking({
    actor: req.user,
    doctorId: body.doctorId,
    patientId,
    date: body.date,
    startTime: body.startTime,
    notes: body.notes,
  });
  res.status(201).json({ appointment });
});

const walkIn = asyncHandler(async (req, res) => {
  const body = walkInBookingSchema.parse(req.body);
  const appointment = await appointmentService.bookWalkIn({
    actor: req.user,
    ...body,
  });
  res.status(201).json({ appointment });
});

const list = asyncHandler(async (req, res) => {
  const appointments = await appointmentService.listAppointments({
    actor: req.user,
    date: req.query.date,
    doctorId: req.query.doctorId,
    patientId: req.query.patientId,
    status: req.query.status,
  });
  res.json({ appointments });
});

const cancel = asyncHandler(async (req, res) => {
  const body = cancelAppointmentSchema.parse(req.body || {});
  const result = await appointmentService.cancelAppointment({
    actor: req.user,
    appointmentId: req.params.id,
    reason: body.reason,
  });
  res.json(result);
});

const updateStatus = asyncHandler(async (req, res) => {
  const body = updateAppointmentStatusSchema.parse(req.body);
  const result = await appointmentService.updateAppointmentStatus({
    actor: req.user,
    appointmentId: req.params.id,
    status: body.status,
  });
  res.json(result);
});

module.exports = {
  listClinics,
  getClinic,
  listDoctors,
  listSlots,
  confirm,
  walkIn,
  list,
  cancel,
  updateStatus,
};
