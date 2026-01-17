
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 no-print shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-[#005fb0] p-2.5 rounded-xl shadow-md">
              <i className="fa-solid fa-passport text-white text-xl"></i>
            </div>
            <h1 className="text-2xl font-black text-slate-900 hidden sm:block tracking-tight">
              VisaCraft
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
