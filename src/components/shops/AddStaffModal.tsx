import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';

const addStaffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['Manager', 'Cashier']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type AddStaffFormData = z.infer<typeof addStaffSchema>;

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  onStaffAdded: () => void;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  isOpen,
  onClose,
  shopId,
  shopName,
  onStaffAdded,
}) => {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddStaffFormData>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'Cashier',
      password: 'staff123',
    },
  });

  const onSubmit = async (data: AddStaffFormData) => {
    setError(null);
    try {
      const res = await api.addStaff(shopId, data);
      if (res.success) {
        reset();
        onStaffAdded();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add staff member');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Staff Member to ${shopName}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g. Asaduzzaman Nur"
            className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden ${
              errors.name ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          {errors.name && (
            <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
          <input
            type="email"
            {...register('email')}
            placeholder="e.g. asad@greenmart.com"
            className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden ${
              errors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
            }`}
          />
          {errors.email && (
            <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
            <select
              {...register('role')}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
            >
              <option value="Cashier">Cashier</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Password
            </label>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden ${
                errors.password ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {errors.password && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>
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
            {isSubmitting ? 'Adding...' : 'Add Staff Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
