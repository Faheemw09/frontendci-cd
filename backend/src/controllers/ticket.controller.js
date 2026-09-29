const ticketService = require('../services/ticket.service');
const {
  createTicketSchema,
  updateTicketSchema,
  replyTicketSchema,
} = require('../validators/tickets');
const { asyncHandler } = require('../utils/helpers');

const list = asyncHandler(async (req, res) => {
  const result = await ticketService.listTickets({
    actor: req.user,
    status: req.query.status,
    category: req.query.category,
    clinicId: req.query.clinicId,
    slaBreachedOnly: req.query.slaBreached,
  });
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicket({
    actor: req.user,
    ticketId: req.params.id,
  });
  res.json({ ticket });
});

const create = asyncHandler(async (req, res) => {
  const body = createTicketSchema.parse(req.body);
  const ticket = await ticketService.createTicket({ actor: req.user, data: body });
  res.status(201).json({ ticket });
});

const update = asyncHandler(async (req, res) => {
  const body = updateTicketSchema.parse(req.body);
  const ticket = await ticketService.updateTicket({
    actor: req.user,
    ticketId: req.params.id,
    data: body,
  });
  res.json({ ticket });
});

const reply = asyncHandler(async (req, res) => {
  const body = replyTicketSchema.parse(req.body);
  const message = await ticketService.addReply({
    actor: req.user,
    ticketId: req.params.id,
    body: body.body,
  });
  res.status(201).json({ message });
});

module.exports = { list, getOne, create, update, reply };
