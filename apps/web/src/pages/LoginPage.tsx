import React from 'react';
import { LoginBrandPanel } from '../components/auth/LoginBrandPanel';
import { LoginForm } from '../components/auth/LoginForm';

export interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  return (
    <div className="h-screen h-[100dvh] w-screen w-[100dvw] bg-[#F4F6F8] flex items-center justify-center p-3 sm:p-4 lg:p-6 select-none overflow-hidden fixed inset-0">
      {/* Main Centered 2-Panel Auth Card with Fixed Viewport Fitting (Zero Page Scroll) */}
      <div className="w-full max-w-[1360px] max-h-[94vh] lg:max-h-[90vh] bg-white rounded-2xl shadow-elevated border border-slate-200/90 overflow-hidden flex flex-col lg:flex-row my-auto">
        {/* Left Visual Identity Panel (54% Width) */}
        <LoginBrandPanel />

        {/* Right Authentication Panel (46% Width) */}
        <LoginForm onSuccess={onLoginSuccess} />
      </div>
    </div>
  );
};
