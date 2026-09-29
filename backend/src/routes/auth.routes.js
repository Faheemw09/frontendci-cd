const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { platformScoped } = require('../middleware/rbac');

const router = Router();

router.post('/login', authController.login);
router.post('/register/patient', authController.registerPatient);
router.post('/clinic-signup', authController.clinicSignup);
router.get('/me', ...platformScoped('super_admin', 'clinic_admin', 'staff', 'doctor', 'patient'), authController.me);

module.exports = router;
