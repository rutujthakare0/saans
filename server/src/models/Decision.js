import mongoose from 'mongoose';

const windowSchema = new mongoose.Schema({ start: String, end: String, aqi: Number }, { _id: false });
const decisionSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  date: { type: String, required: true },
  source: { type: String, enum: ['live', 'replay'], required: true },
  replayMode: { type: String, enum: ['bad', 'clean'] },
  aqi: { type: Number, required: true },
  category: { type: String, required: true },
  action: { type: String, enum: ['normal', 'limit_outdoor', 'cancel_outdoor'], required: true },
  bestWindow: { type: windowSchema, default: null },
  reasons: [String],
  notice: { en: { type: String, required: true }, hi: { type: String, required: true } },
  hourly: [{ time: String, pm25: Number, pm10: Number }],
  status: { type: String, enum: ['proposed', 'sent'], default: 'proposed' },
  approvedBy: { type: String, enum: ['principal', 'standing_rule', null], default: null },
  approvedAt: { type: Date, default: null },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'StandingRule', default: null }
}, { timestamps: true });
decisionSchema.index({ schoolId: 1, date: 1, source: 1 }, { unique: true });

export default mongoose.model('Decision', decisionSchema);
