import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';

const addShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters'),
  branch: z.string(),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  ownerEmail: z.string().email('Please enter a valid email address'),
  phone: z.string().min(6, 'Please enter a valid phone number'),
  address: z.string(),
  storeType: z.string(),
  planId: z.string(),
});

type AddShopFormData = z.infer<typeof addShopSchema>;

interface AddShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShopAdded: () => void;
}

export const AddShopModal: React.FC<AddShopModalProps> = ({ isOpen, onClose, onShopAdded }) => {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddShopFormData>({
    resolver: zodResolver(addShopSchema),
    defaultValues: {
      name: '',
      branch: 'Main Branch',
      ownerName: '',
      ownerEmail: '',
      phone: '',
      address: '',
      storeType: 'Grocery',
      planId: 'plan_pro',
    },
  });

  const onSubmit = async (data: AddShopFormData) => {
    setError(null);
    try {
      const res = await api.createShop(data);
      if (res.success) {
        reset();
        onShopAdded();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create shop');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Shop" maxWidth="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shop Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Green Mart"
              className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden ${
                errors.name ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name</label>
            <input
              type="text"
              {...register('branch')}
              placeholder="e.g. Dhanmondi Branch"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Owner Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('ownerName')}
              placeholder="e.g. Rahim Khan"
              className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden ${
                errors.ownerName ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {errors.ownerName && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.ownerName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Owner Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              {...register('ownerEmail')}
              placeholder="e.g. rahim@greenmart.com"
              className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden ${
                errors.ownerEmail ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {errors.ownerEmail && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.ownerEmail.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              {...register('phone')}
              placeholder="+880 1712-345678"
              className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden ${
                errors.phone ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {errors.phone && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Store Type</label>
            <select
              {...register('storeType')}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
            >
              <option value="Grocery">Grocery</option>
              <option value="Fashion">Fashion</option>
              <option value="Electronics">Electronics</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Restaurant">Restaurant</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Address</label>
          <input
            type="text"
            {...register('address')}
            placeholder="e.g. Shop #14, Road 7, Dhanmondi, Dhaka"
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Initial Subscription Plan
          </label>
          <select
            {...register('planId')}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
          >
            <option value="plan_basic">Basic (৳499 / month)</option>
            <option value="plan_pro">Pro (৳999 / month - Recommended)</option>
            <option value="plan_enterprise">Enterprise (৳1,999 / month)</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? 'Creating...' : 'Register Shop'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
