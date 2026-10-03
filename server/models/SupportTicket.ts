import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupportTicketReply {
  id: string;
  senderRole: 'admin' | 'owner';
  senderName: string;
  message: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  storeId: string;
  subject: string;
  message: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved';
  replies: ISupportTicketReply[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketReplySchema = new Schema<ISupportTicketReply>({
  id: { type: String, required: true },
  senderRole: { type: String, enum: ['admin', 'owner'], required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    storeId: { type: String, required: true, index: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
    replies: [SupportTicketReplySchema],
  },
  {
    timestamps: true,
    collection: 'support_tickets',
  }
);

SupportTicketSchema.index({ status: 1, priority: 1, updatedAt: -1 });

export const SupportTicketModel: Model<ISupportTicket> =
  (mongoose.models.SupportTicket as Model<ISupportTicket>) ||
  mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
