const { Router } = require('express');
const bookingController = require('../controllers/booking.controller');
const clinicSettingsController = require('../controllers/clinicSettings.controller');
const { platformScoped } = require('../middleware/rbac');

const router = Router();

const bookers = platformScoped('clinic_admin', 'staff', 'patient');
const viewers = platformScoped('clinic_admin', 'staff', 'doctor', 'patient');
const statusUpdaters = platformScoped('clinic_admin', 'staff', 'doctor');
const walkInRoles = platformScoped('clinic_admin', 'staff');
const rescheduleRoles = platformScoped('clinic_admin', 'staff', 'patient');

router.get('/', ...viewers, bookingController.list);
router.post('/confirm', ...bookers, bookingController.confirm);
router.post('/walk-in', ...walkInRoles, bookingController.walkIn);
router.post('/:id/cancel', ...viewers, bookingController.cancel);
router.patch('/:id/status', ...statusUpdaters, bookingController.updateStatus);
router.post('/:id/reschedule', ...rescheduleRoles, clinicSettingsController.reschedule);
router.post('/', ...bookers, bookingController.confirm);

module.exports = router;
