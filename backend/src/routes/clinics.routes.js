const { Router } = require('express');
const clinicController = require('../controllers/clinic.controller');
const clinicUserController = require('../controllers/clinicUser.controller');
const { platformScoped } = require('../middleware/rbac');

const router = Router();

router.use(...platformScoped('super_admin'));

router.get('/', clinicController.list);
router.post('/', clinicController.create);
router.get('/:id', clinicController.getOne);
router.patch('/:id', clinicController.update);
router.post('/:id/approve', clinicController.approve);
router.post('/:id/suspend', clinicController.suspend);
router.post('/:id/admins', clinicUserController.bootstrapAdmin);

module.exports = router;
