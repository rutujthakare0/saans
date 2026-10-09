import mongoose from 'mongoose';

const parentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  language: { type: String, enum: ['en', 'hi', 'both'], default: 'both' },
  active: { type: Boolean, default: true }
}, { timestamps: true });
parentSchema.index({ schoolId: 1, email: 1 }, { unique: true });

export default mongoose.model('Parent', parentSchema);
