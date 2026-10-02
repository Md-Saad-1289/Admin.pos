import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlatformSetting extends Document {
  platformName: string;
  supportEmail: string;
  currency: string;
  currencySymbol: string;
  defaultTrialDays: number;
  maintenanceMode: boolean;
  bkashMerchantNumber: string;
  nagadMerchantNumber: string;
  bankName: string;
  bankBranch: string;
  bankAccountName: string;
  bankAccountNumber: string;
  updatedAt: Date;
}

const PlatformSettingSchema = new Schema<IPlatformSetting>(
  {
    platformName: { type: String, default: 'ShopPOS' },
    supportEmail: { type: String, default: 'support@shoppos.com' },
    currency: { type: String, default: 'BDT' },
    currencySymbol: { type: String, default: '৳' },
    defaultTrialDays: { type: Number, default: 14 },
    maintenanceMode: { type: Boolean, default: false },
    bkashMerchantNumber: { type: String, default: '01811-998877' },
    nagadMerchantNumber: { type: String, default: '01711-223344' },
    bankName: { type: String, default: 'City Bank PLC' },
    bankBranch: { type: String, default: 'Dhanmondi Branch' },
    bankAccountName: { type: String, default: 'ShopPOS Bangladesh Ltd.' },
    bankAccountNumber: { type: String, default: '1102938475001' },
  },
  {
    timestamps: true,
    collection: 'platform_settings',
  }
);

export const PlatformSettingModel: Model<IPlatformSetting> =
  (mongoose.models.PlatformSetting as Model<IPlatformSetting>) ||
  mongoose.model<IPlatformSetting>('PlatformSetting', PlatformSettingSchema);
