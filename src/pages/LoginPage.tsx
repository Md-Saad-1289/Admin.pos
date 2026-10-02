import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, Info } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@shoppos.com',
      password: 'password123',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setInfoMessage(null);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }
  };

  const handleForgotPassword = () => {
    setInfoMessage('A password reset link and verification code have been dispatched to your corporate administrator email address.');
  };

  return (
    <div className="min-h-screen bg-slate-900/95 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 sm:p-10 relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 mb-4">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">ShopPOS</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            SaaS Control Center
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200/80 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 p-3.5 bg-blue-50 border border-blue-200/80 text-blue-700 text-xs rounded-xl flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Admin Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                {...register('email')}
                placeholder="admin@shoppos.com"
                className={`w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 ${
                  errors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 ${
                  errors.password ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('rememberMe')}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs text-slate-600">Remember this device</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Control Center</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Assurance Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Secure 256-bit TLS encrypted session</span>
          </div>
        </div>
      </div>
    </div>
  );
};
