import mongoose from 'mongoose';

const parentSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  language: { type: String, enum: ['en', 'hi', 'both'], default: 'both' },
  childName: { type: String, trim: true, default: '' },
  className: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['invited', 'active', 'deactivated'], default: 'invited' },
  active: { type: Boolean, default: false },
  passwordHash: { type: String, default: null },
  inviteTokenHash: { type: String, default: null },
  inviteExpiresAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true });
parentSchema.index({ inviteTokenHash: 1 }, { unique: true, partialFilterExpression: { inviteTokenHash: { $type: 'string' } } });

export default mongoose.model('Parent', parentSchema);
