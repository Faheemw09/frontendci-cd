const { Router } = require('express');
const doctorController = require('../controllers/doctor.controller');
const scheduleController = require('../controllers/schedule.controller');
const { clinicScoped, platformScoped } = require('../middleware/rbac');
const { requireDoctorAccess } = require('../middleware/requireDoctorAccess');

const router = Router();

router.get('/', ...clinicScoped('clinic_admin', 'doctor', 'staff'), doctorController.list);
router.get('/me', ...clinicScoped('doctor'), doctorController.getMe);
router.post('/', ...clinicScoped('clinic_admin'), doctorController.create);
router.get('/:id', ...clinicScoped('clinic_admin', 'doctor', 'staff'), doctorController.getOne);
router.patch('/:id', ...clinicScoped('clinic_admin'), doctorController.update);
router.post('/:id/deactivate', ...clinicScoped('clinic_admin'), doctorController.deactivate);

// Available slots — patients + clinic roles
router.get(
  '/:doctorId/slots',
  ...platformScoped('clinic_admin', 'staff', 'doctor', 'patient'),
  scheduleController.getSlots
);

const scheduleStack = [
  ...clinicScoped('clinic_admin', 'doctor'),
  requireDoctorAccess('doctorId'),
];

router.get('/:doctorId/availability', ...scheduleStack, scheduleController.listAvailability);
router.post('/:doctorId/availability', ...scheduleStack, scheduleController.createAvailability);
router.put(
  '/:doctorId/availability',
  ...clinicScoped('clinic_admin', 'doctor'),
  requireDoctorAccess('doctorId'),
  scheduleController.replaceAvailability
);
router.patch(
  '/:doctorId/availability/:availabilityId',
  ...scheduleStack,
  scheduleController.updateAvailability
);
router.delete(
  '/:doctorId/availability/:availabilityId',
  ...scheduleStack,
  scheduleController.deleteAvailability
);

router.get('/:doctorId/leave', ...scheduleStack, scheduleController.listLeave);
router.post('/:doctorId/leave', ...scheduleStack, scheduleController.createLeave);
router.patch('/:doctorId/leave/:leaveId', ...scheduleStack, scheduleController.updateLeave);
router.delete('/:doctorId/leave/:leaveId', ...scheduleStack, scheduleController.deleteLeave);

module.exports = router;
