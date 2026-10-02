import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  adminId: string;
  adminName: string;
  action: string;
  targetId: string;
  details?: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    adminId: { type: String, required: true },
    adminName: { type: String, required: true },
    action: { type: String, required: true },
    targetId: { type: String, default: '' },
    details: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  {
    collection: 'audit_logs',
  }
);

export const AuditLogModel: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
