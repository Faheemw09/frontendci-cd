const { z } = require('zod');

const ticketCategories = [
  'slot_cancelled',
  'no_show_dispute',
  'refund_request',
  'general_complaint',
  'billing',
  'other',
];

const createTicketSchema = z.object({
  subject: z.string().min(3).max(255),
  description: z.string().min(3),
  category: z.enum(ticketCategories).optional(),
  clinicId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  linkedAppointmentId: z.string().uuid().optional(),
  /** @deprecated use linkedAppointmentId */
  appointmentId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().optional(),
});

const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.enum(ticketCategories).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

const replyTicketSchema = z.object({
  body: z.string().min(1).max(5000),
});

module.exports = {
  createTicketSchema,
  updateTicketSchema,
  replyTicketSchema,
  ticketCategories,
};
