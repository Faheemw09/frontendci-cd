const { Router } = require('express');
const ticketController = require('../controllers/ticket.controller');
const { platformScoped } = require('../middleware/rbac');

const router = Router();

const allTicketRoles = platformScoped(
  'patient',
  'clinic_admin',
  'staff',
  'super_admin'
);
const responders = platformScoped('clinic_admin', 'staff', 'super_admin');

router.get('/', ...allTicketRoles, ticketController.list);
router.post('/', ...allTicketRoles, ticketController.create);
router.get('/:id', ...allTicketRoles, ticketController.getOne);
router.patch('/:id', ...responders, ticketController.update);
router.post('/:id/replies', ...allTicketRoles, ticketController.reply);

module.exports = router;
