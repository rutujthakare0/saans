import { Router } from 'express';
import Parent from '../models/Parent.js';

const router = Router();
const mask = email => {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain || ''}`;
};
router.get('/', async (req, res) => {
  const parents = await Parent.find({ schoolId: req.school._id }).sort({ email: 1 });
  res.json({ count: parents.filter(parent => parent.active).length, parents: parents.map(parent => ({ _id: parent._id, name: parent.name, email: mask(parent.email), language: parent.language, active: parent.active })) });
});
export default router;
