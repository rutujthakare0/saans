import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  schoolStart: { type: String, default: '08:00' },
  schoolEnd: { type: String, default: '14:00' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  principalName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, unique: true, index: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('School', schoolSchema);
