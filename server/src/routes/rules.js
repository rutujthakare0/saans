import { Router } from 'express';
import StandingRule from '../models/StandingRule.js';

const router = Router();
const categories = ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'];
const actions = ['limit_outdoor', 'cancel_outdoor'];
router.get('/', async (req, res) => res.json(await StandingRule.find({ schoolId: req.school._id }).sort({ createdAt: -1 })));
router.post('/', async (req, res) => {
  const { minCategory, action = 'cancel_outdoor', expiresAt, principalWords } = req.body;
  const expires = new Date(`${String(expiresAt).slice(0, 10)}T23:59:59.999+05:30`);
  if (!categories.includes(minCategory) || !actions.includes(action) || !expiresAt || Number.isNaN(expires.getTime()) || expires < new Date()) return res.status(400).json({ error: 'Choose a valid category, action, and future expiry date.' });
  if (!principalWords?.trim()) return res.status(400).json({ error: 'Please include the instruction in your own words.' });
  const rule = await StandingRule.create({ schoolId: req.school._id, minCategory, action, expiresAt: expires, principalWords: principalWords.trim() });
  res.status(201).json(rule);
});
router.delete('/:id', async (req, res) => {
  const rule = await StandingRule.findOneAndUpdate({ _id: req.params.id, schoolId: req.school._id }, { active: false }, { new: true });
  if (!rule) return res.status(404).json({ error: 'Rule not found.' });
  res.json(rule);
});
export default router;
