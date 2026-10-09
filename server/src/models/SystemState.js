import mongoose from 'mongoose';

const systemStateSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'main' },
  lastDailyRunAt: { type: Date, default: null },
  dailySummary: { processed: Number, succeeded: Number, failures: [String], emailsSent: Number, previews: Number }
}, { timestamps: true });

export default mongoose.model('SystemState', systemStateSchema);
