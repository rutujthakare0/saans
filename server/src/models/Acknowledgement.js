import mongoose from 'mongoose';

const acknowledgementSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  decisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Decision', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
  acknowledgedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true });
acknowledgementSchema.index({ decisionId: 1, parentId: 1 }, { unique: true });

export default mongoose.model('Acknowledgement', acknowledgementSchema);
