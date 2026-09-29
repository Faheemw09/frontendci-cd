const { Router } = require('express');
const bookingController = require('../controllers/booking.controller');
const { platformScoped } = require('../middleware/rbac');

const router = Router();

// Patient funnel browse (public)
router.get('/clinics', bookingController.listClinics);
router.get('/clinics/:slugOrId', bookingController.getClinic);
router.get('/clinics/:slugOrId/doctors', bookingController.listDoctors);
router.get('/doctors/:doctorId/slots', bookingController.listSlots);

// Confirm booking
router.post(
  '/confirm',
  ...platformScoped('patient', 'clinic_admin', 'staff'),
  bookingController.confirm
);

module.exports = router;
