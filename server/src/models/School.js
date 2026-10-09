import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  locationLabel: { type: String, default: 'Delhi, India', trim: true, maxlength: 120 },
  schoolStart: { type: String, default: '08:00' },
  schoolEnd: { type: String, default: '14:00' },
  checkTime: { type: String, default: '06:00' },
  notifyBy: { type: String, default: '07:00' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  configured: { type: Boolean, default: false },
  lastCheckDate: { type: String, default: null },
  principalName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, unique: true, index: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

// Legacy school documents can predate the slug field. Generate a stable fallback
// before validation so editing their settings does not fail on `required`.
schoolSchema.pre('validate', function generateMissingSlug() {
  if (this.slug || !this.name) return;
  const base = this.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'school';
  this.slug = `${base}-${this._id.toString().slice(-6)}`;
});

export default mongoose.model('School', schoolSchema);
