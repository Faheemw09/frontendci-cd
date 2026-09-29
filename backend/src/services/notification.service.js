const { prisma } = require('../config/db');

/**
 * Stub notification sender — logs + writes notifications_log.
 * Replace provider call body later (WhatsApp/SMS/email).
 */
async function sendNotification({
  userId,
  clinicId = null,
  type,
  title,
  body,
  channel = 'in_app',
  payload = null,
}) {
  const entry = {
    userId,
    clinicId,
    type,
    channel,
    title,
    body,
    payload,
    at: new Date().toISOString(),
  };

  // Stub: real WhatsApp/SMS provider goes here later
  // eslint-disable-next-line no-console
  console.log('[sendNotification:stub]', JSON.stringify(entry));

  const log = await prisma.notificationLog.create({
    data: {
      userId,
      clinicId,
      type,
      channel,
      title,
      body,
      payload: payload || undefined,
      status: 'sent',
      sentAt: new Date(),
    },
  });

  return { stubbed: true, notificationLogId: log.id };
}

module.exports = { sendNotification };
