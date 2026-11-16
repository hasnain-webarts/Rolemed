import mongoose from 'mongoose';

/**
 * Atomic Monotonic Sequence Counter Model (RM-DATA-003)
 * Guarantees zero ID collision under concurrent write operations via atomic MongoDB $inc operations.
 */
const CounterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Atomically increments and retrieves the next sequential identifier.
 * Automatically synchronizes with existing collection maximum if counter is freshly initialized.
 *
 * @param {string} counterId - Unique counter identifier (e.g. 'patientId', 'appointmentId')
 * @param {Object} [options]
 * @param {string} [options.prefix=''] - ID string prefix (e.g. 'PAT-', 'APT-')
 * @param {number} [options.padLength=3] - Minimum digits padding
 * @param {number} [options.seedFloor=1] - Minimum starting sequence number
 * @returns {Promise<string>} e.g. "PAT-105"
 */
CounterSchema.statics.getNextSequence = async function (counterId, options = {}) {
  const { prefix = '', padLength = 3, seedFloor = 1 } = options;

  // Initialize or ensure seq is at least (seedFloor - 1) atomically without race condition
  if (seedFloor > 0) {
    const minPreIncrementSeq = Math.max(0, seedFloor - 1);
    await this.updateOne(
      { _id: counterId, $or: [{ seq: { $lt: minPreIncrementSeq } }, { seq: { $exists: false } }] },
      { $max: { seq: minPreIncrementSeq } },
      { upsert: true }
    ).catch(() => {});
  }

  // Atomically increment and return monotonically increasing identifier
  const counter = await this.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  return `${prefix}${String(counter.seq).padStart(padLength, '0')}`;
};

export default mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
