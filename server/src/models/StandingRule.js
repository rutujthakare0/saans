import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  minCategory: { type: String, enum: ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'], required: true },
  action: { type: String, enum: ['limit_outdoor', 'cancel_outdoor'], default: 'cancel_outdoor' },
  principalWords: { type: String, required: true, maxlength: 500 },
  expiresAt: { type: Date, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('StandingRule', ruleSchema);
