const { prisma } = require('../config/db');
const { httpError } = require('../utils/httpError');

function serialize(issue) {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    severity: issue.severity,
    status: issue.status,
    createdById: issue.createdById,
    createdBy: issue.createdBy || undefined,
    resolvedAt: issue.resolvedAt,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

async function listIssues({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  const rows = await prisma.platformIssue.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
  return rows.map(serialize);
}

async function createIssue({ actor, data }) {
  const issue = await prisma.platformIssue.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category || 'general',
      severity: data.severity || 'medium',
      status: 'open',
      createdById: actor.id,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
  return serialize(issue);
}

async function updateIssue({ issueId, data }) {
  const existing = await prisma.platformIssue.findUnique({ where: { id: issueId } });
  if (!existing) throw httpError(404, 'Platform issue not found');

  const nextStatus = data.status ?? existing.status;
  const issue = await prisma.platformIssue.update({
    where: { id: issueId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.severity !== undefined && { severity: data.severity }),
      ...(data.status !== undefined && { status: data.status }),
      ...((nextStatus === 'resolved' || nextStatus === 'closed') && {
        resolvedAt: existing.resolvedAt || new Date(),
      }),
      ...((nextStatus === 'open' || nextStatus === 'investigating') && {
        resolvedAt: null,
      }),
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
  return serialize(issue);
}

module.exports = { listIssues, createIssue, updateIssue };
