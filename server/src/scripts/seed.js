import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import School from '../models/School.js';
import Parent from '../models/Parent.js';
import { defaultNotifyBy } from '../services/schoolSettings.js';

await mongoose.connect(config.mongoUri);
const passwordHash = await bcrypt.hash(config.demoPassword, 12);
const school = await School.findOneAndUpdate({ email: config.demoPrincipal.toLowerCase() }, {
  name: config.school.name, lat: config.school.lat, lng: config.school.lng,
  locationLabel: process.env.SCHOOL_LOCATION_LABEL || 'Delhi, India',
  schoolStart: config.school.schoolStart, schoolEnd: config.school.schoolEnd,
  checkTime: process.env.CHECK_TIME || '06:00', notifyBy: process.env.NOTIFY_BY || defaultNotifyBy(config.school.schoolStart),
  timezone: 'Asia/Kolkata', slug: 'demo-school', configured: true, principalName: 'Meera Sharma', email: config.demoPrincipal, passwordHash
}, { upsert: true, new: true, setDefaultsOnInsert: true });
const demoParentPassword = process.env.DEMO_PARENT_PASSWORD || 'familyair';
const demoParentHash = await bcrypt.hash(demoParentPassword, 12);
await Parent.updateMany({ schoolId: school._id, active: true, status: { $exists: false } }, { $set: { status: 'active', passwordHash: demoParentHash } });
for (const email of (process.env.DEMO_PARENT_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.warn(`Skipping invalid demo parent email: ${email}`); continue; }
  await Parent.findOneAndUpdate({ schoolId: school._id, email }, { schoolId: school._id, email, name: email.split('@')[0], language: 'both', status: 'active', active: true, passwordHash: demoParentHash, inviteTokenHash: null, inviteExpiresAt: null }, { upsert: true, new: true, setDefaultsOnInsert: true });
}
console.log(`Demo principal ready: ${school.email}; active parent contacts: ${await Parent.countDocuments({ schoolId: school._id, active: true })}${process.env.DEMO_PARENT_EMAILS ? `; parent demo password: ${demoParentPassword}` : ''}`);
await mongoose.disconnect();
