const adminStats = require('../services/adminStats.service');
const platformIssue = require('../services/platformIssue.service');
const { asyncHandler } = require('../utils/helpers');
const { z } = require('zod');

const createIssueSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(3),
  category: z.string().max(100).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const updateIssueSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(3).optional(),
  category: z.string().max(100).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
});

const stats = asyncHandler(async (req, res) => {
  const data = await adminStats.getPlatformStats();
  res.json({ stats: data });
});

const listIssues = asyncHandler(async (req, res) => {
  const issues = await platformIssue.listIssues({ status: req.query.status });
  res.json({ issues });
});

const createIssue = asyncHandler(async (req, res) => {
  const body = createIssueSchema.parse(req.body);
  const issue = await platformIssue.createIssue({ actor: req.user, data: body });
  res.status(201).json({ issue });
});

const updateIssue = asyncHandler(async (req, res) => {
  const body = updateIssueSchema.parse(req.body);
  const issue = await platformIssue.updateIssue({
    issueId: req.params.id,
    data: body,
  });
  res.json({ issue });
});

module.exports = { stats, listIssues, createIssue, updateIssue };
