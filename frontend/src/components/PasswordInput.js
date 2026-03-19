// ============================================
// components/PasswordInput.js - Reusable Password Input
// ============================================
// Features:
// - Password strength meter (weak/medium/strong)
// - Visibility toggle (eye icon)
// - Requirements checklist (12+ chars, 1 upper, 1 lower)
// - Color-coded strength indicator (red/yellow/green)

import { useState } from 'react';

export default function PasswordInput({ value, onChange, placeholder, showStrength = true, showRequirements = true, label, required = false }) {
  const [showPassword, setShowPassword] = useState(false);

  // Calculate password strength
  const calculateStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[!@#$%^&*]/.test(pwd)) strength++;
    return strength;
  };

  // Check requirements
  const checkRequirements = (pwd) => ({
    minLength: pwd.length >= 12,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
  });

  const strength = calculateStrength(value);
  const requirements = checkRequirements(value);
  const allMet = requirements.minLength && requirements.uppercase && requirements.lowercase;

  const getStrengthColor = () => {
    if (strength <= 1) return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (strength <= 3) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-green-400 bg-green-500/10 border-green-500/20';
  };

  const getStrengthLabel = () => {
    if (strength <= 1) return 'Weak';
    if (strength <= 3) return 'Medium';
    return 'Strong';
  };

  const getStrengthFill = () => {
    if (strength <= 1) return 'bg-red-400';
    if (strength <= 3) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-pink-400">*</span>}
        </label>
      )}

      {/* Password Input Field */}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          className="input-field pr-10"
          placeholder={placeholder || '••••••••'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {/* Visibility Toggle Button */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition text-lg"
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>

      {/* Password Strength Meter */}
      {showStrength && value.length > 0 && (
        <div className={`p-3 rounded-lg border ${getStrengthColor()}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Password Strength</span>
            <span className="text-xs font-bold">{getStrengthLabel()}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${getStrengthFill()} transition-all duration-300`}
              style={{ width: `${(strength / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Requirements Checklist */}
      {showRequirements && value.length > 0 && (
        <div className="space-y-1.5 p-3 rounded-lg bg-white/3 border border-white/5">
          <div className="flex items-center gap-2 text-xs">
            <span className={requirements.minLength ? '✅' : '❌'}>
              {requirements.minLength ? '✓' : 'ℹ'}
            </span>
            <span className={requirements.minLength ? 'text-green-400' : 'text-gray-500'}>
              Minimum 12 characters
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={requirements.uppercase ? '✅' : '❌'}>
              {requirements.uppercase ? '✓' : 'ℹ'}
            </span>
            <span className={requirements.uppercase ? 'text-green-400' : 'text-gray-500'}>
              At least 1 uppercase letter
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={requirements.lowercase ? '✅' : '❌'}>
              {requirements.lowercase ? '✓' : 'ℹ'}
            </span>
            <span className={requirements.lowercase ? 'text-green-400' : 'text-gray-500'}>
              At least 1 lowercase letter
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
