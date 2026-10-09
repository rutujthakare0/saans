import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import School from '../models/School.js';

await mongoose.connect(config.mongoUri);
const passwordHash = await bcrypt.hash(config.demoPassword, 12);
const school = await School.findOneAndUpdate({ email: config.demoPrincipal.toLowerCase() }, {
  name: config.school.name, lat: config.school.lat, lng: config.school.lng,
  schoolStart: config.school.schoolStart, schoolEnd: config.school.schoolEnd,
  timezone: 'Asia/Kolkata', principalName: 'Demo Principal', email: config.demoPrincipal, passwordHash
}, { upsert: true, new: true, setDefaultsOnInsert: true });
console.log(`Demo principal ready: ${school.email}`);
await mongoose.disconnect();
