import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import School from '../models/School.js';
import Parent from '../models/Parent.js';

await mongoose.connect(config.mongoUri);
const passwordHash = await bcrypt.hash(config.demoPassword, 12);
const school = await School.findOneAndUpdate({ email: config.demoPrincipal.toLowerCase() }, {
  name: config.school.name, lat: config.school.lat, lng: config.school.lng,
  schoolStart: config.school.schoolStart, schoolEnd: config.school.schoolEnd,
  timezone: 'Asia/Kolkata', slug: 'demo-school', principalName: 'Meera Sharma', email: config.demoPrincipal, passwordHash
}, { upsert: true, new: true, setDefaultsOnInsert: true });
for (const email of (process.env.DEMO_PARENT_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.warn(`Skipping invalid demo parent email: ${email}`); continue; }
  await Parent.findOneAndUpdate({ schoolId: school._id, email }, { schoolId: school._id, email, name: email.split('@')[0], language: 'both', active: true }, { upsert: true, new: true, setDefaultsOnInsert: true });
}
console.log(`Demo principal ready: ${school.email}; active parent contacts: ${await Parent.countDocuments({ schoolId: school._id, active: true })}`);
await mongoose.disconnect();
