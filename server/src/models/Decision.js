import mongoose from 'mongoose';

const windowSchema = new mongoose.Schema({ start: String, end: String, aqi: Number }, { _id: false });
const deliverySchema = new mongoose.Schema({
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
  channel: { type: String, enum: ['email', 'preview'], required: true },
  status: { type: String, enum: ['sent', 'failed', 'preview'], required: true },
  error: { type: String, default: null },
  sentAt: { type: Date, default: null }
}, { _id: false });
const decisionSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  date: { type: String, required: true },
  source: { type: String, enum: ['live', 'replay'], required: true },
  replayMode: { type: String, enum: ['severe', 'limit', 'clean'] },
  aqi: { type: Number, required: true },
  category: { type: String, required: true },
  action: { type: String, enum: ['normal', 'limit_outdoor', 'cancel_outdoor'], required: true },
  bestWindow: { type: windowSchema, default: null },
  reasons: [String],
  notice: { en: String, hi: String },
  wordingSource: { type: String, enum: ['bedrock', 'template'], default: 'template' },
  modelId: { type: String, default: null },
  fetchedAt: { type: Date, default: null },
  checkedAt: { type: Date, default: Date.now },
  dataLabel: { type: String, default: '' },
  hourly: [{ time: String, pm25: Number, pm10: Number }],
  deliveries: { type: [deliverySchema], default: [] },
  status: { type: String, enum: ['proposed', 'sent', 'no_action'], default: 'proposed' },
  approvedBy: { type: String, enum: ['principal', 'standing_rule', null], default: null },
  approvedAt: { type: Date, default: null },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'StandingRule', default: null },
  ruleWords: { type: String, default: null }
}, { timestamps: true });
decisionSchema.index({ schoolId: 1, date: 1, source: 1 }, { unique: true });

export default mongoose.model('Decision', decisionSchema);
