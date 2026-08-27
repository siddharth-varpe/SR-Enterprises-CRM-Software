import React from 'react';
import { UsersRound, ShoppingCart, FileText, Wrench, Droplets } from 'lucide-react';
import roPurifierBg from '../../assets/ro-purifier-bg.jpg';

export const LoginBrandPanel: React.FC = () => {
  return (
    <div className="relative w-full lg:w-[54%] bg-[#4323A0] text-white flex flex-col justify-between p-5 sm:p-7 lg:p-8 overflow-hidden select-none">
      {/* High-Fidelity 3D RO Purification Background Visual Scene */}
      <div className="absolute inset-0 z-0">
        <img
          src={roPurifierBg}
          alt="SR Enterprises RO Purification Management System"
          className="w-full h-full object-cover object-center"
        />
        {/* Soft Purple Gradient Overlays for Luxury Contrast & Typographic Clarity */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#3B1A99]/90 via-[#4F2DBF]/65 to-[#3B1A99]/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#260E6B]/95 via-transparent to-black/35 pointer-events-none" />
      </div>

      {/* Top Left Branding Header */}
      <div className="relative z-10 flex items-center gap-3">
        {/* Red Water Droplet Brand Badge */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-[#C1121F] flex items-center justify-center text-white shadow-xs">
            <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
          </div>
        </div>

        {/* Brand Text Hierarchy */}
        <div>
          <span className="block text-xs sm:text-sm lg:text-base font-black tracking-wider text-white uppercase leading-tight">
            SR ENTERPRISES
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-4 sm:w-5 h-px bg-white/60" />
            <span className="text-[9px] sm:text-[10px] font-bold text-white/90 tracking-widest uppercase">CRM</span>
            <div className="w-4 sm:w-5 h-px bg-white/60" />
          </div>
        </div>
      </div>

      {/* Center Left Marketing Message */}
      <div className="relative z-10 max-w-sm my-auto py-4 sm:py-6">
        <span className="block text-xs sm:text-sm font-medium text-white/90">Welcome to</span>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mt-1 leading-tight drop-shadow-sm">
          SR Enterprises CRM
        </h1>
        <p className="text-xs sm:text-sm text-white/90 font-normal mt-2.5 leading-relaxed drop-shadow-xs">
          A smart CRM to manage your RO business customers, sales, invoices, services, payments and
          more — all in one place.
        </p>
      </div>

      {/* Bottom Feature Bar (4 Horizontally Arranged Items with Vertical Separators) */}
      <div className="relative z-10 pt-3 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-3 items-start backdrop-blur-xs">
        {/* Feature 1: Manage Customers */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="mb-1 p-1 rounded-lg bg-white/15 text-white w-fit shadow-xs">
            <UsersRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <h2 className="text-[11px] sm:text-xs font-bold text-white leading-tight">Manage Customers</h2>
          <p className="text-[9px] sm:text-[10px] text-white/80 mt-0.5 leading-snug">
            All customer information in one place
          </p>
        </div>

        {/* Feature 2: Track Sales */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left sm:border-l sm:border-white/20 sm:pl-2.5">
          <div className="mb-1 p-1 rounded-lg bg-white/15 text-white w-fit shadow-xs">
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <h2 className="text-[11px] sm:text-xs font-bold text-white leading-tight">Track Sales</h2>
          <p className="text-[9px] sm:text-[10px] text-white/80 mt-0.5 leading-snug">
            Create &amp; manage sales easily
          </p>
        </div>

        {/* Feature 3: Invoices */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left sm:border-l sm:border-white/20 sm:pl-2.5">
          <div className="mb-1 p-1 rounded-lg bg-white/15 text-white w-fit shadow-xs">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <h2 className="text-[11px] sm:text-xs font-bold text-white leading-tight">Invoices</h2>
          <p className="text-[9px] sm:text-[10px] text-white/80 mt-0.5 leading-snug">
            Professional invoices in seconds
          </p>
        </div>

        {/* Feature 4: Services */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left sm:border-l sm:border-white/20 sm:pl-2.5">
          <div className="mb-1 p-1 rounded-lg bg-white/15 text-white w-fit shadow-xs">
            <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <h2 className="text-[11px] sm:text-xs font-bold text-white leading-tight">Services</h2>
          <p className="text-[9px] sm:text-[10px] text-white/80 mt-0.5 leading-snug">
            Track RO services &amp; history
          </p>
        </div>
      </div>
    </div>
  );
};
