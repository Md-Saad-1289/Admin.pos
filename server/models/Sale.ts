import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISale extends Document {
  storeId: string;
  invoiceNumber: string;
  totalAmount: number;
  itemsCount: number;
  customerName: string;
  paymentMethod: string;
  createdAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    storeId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    itemsCount: { type: Number, default: 1 },
    customerName: { type: String, default: 'Walk-in Customer' },
    paymentMethod: { type: String, default: 'Cash' },
  },
  {
    timestamps: true,
    collection: 'sales',
  }
);

export const SaleModel: Model<ISale> =
  (mongoose.models.Sale as Model<ISale>) || mongoose.model<ISale>('Sale', SaleSchema);
