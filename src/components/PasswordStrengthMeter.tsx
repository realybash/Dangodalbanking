
import React from 'react';

interface Props {
  password: string;
}

export const PasswordStrengthMeter: React.FC<Props> = ({ password }) => {
  const getStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length > 6) strength++;
    if (pwd.length > 10) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const strength = getStrength(password);
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  return (
    <div className="w-full flex flex-col gap-1 mt-1">
      <div className="flex gap-1 h-1.5 w-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`flex-1 rounded-full ${i < strength ? colors[Math.min(strength - 1, 4)] : 'bg-zinc-800'}`} />
        ))}
      </div>
      {password.length > 0 && (
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
          {labels[Math.min(strength - 1, 4)]}
        </span>
      )}
    </div>
  );
};
