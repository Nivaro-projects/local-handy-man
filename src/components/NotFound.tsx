import React from 'react';

interface NotFoundProps {
  onGoHome?: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onGoHome }) => {
  const handleHomeClick = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF3E7] flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-lg w-full bg-[#FAF3E7] rounded-xl border border-[#E0CEAF] p-8 sm:p-12">
        
        {/* Official Nivaro Wordmark on Dark Backing */}
        <div className="h-14 px-5 py-2.5 rounded-2xl bg-black border border-[#4A4A4A]/30 shadow-sm flex items-center justify-center mx-auto mb-6 w-fit">
          <img
            src="/brand/nivaro-logo.png"
            alt="Nivaro"
            className="h-9 w-auto object-contain"
            width={1024}
            height={342}
          />
        </div>

        {/* 404 Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FAF3E7] text-[#2E2E2E] text-xs font-bold mb-4 border border-[#E27D60]/50">
          <span>Page Not Found</span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2E2E2E] mb-3 tracking-tight">
          404 &ndash; Page Not Found
        </h1>

        {/* Description */}
        <p className="text-sm text-[#4A4A4A] mb-8 leading-relaxed max-w-md mx-auto">
          The link you followed does not exist or may have been moved. Return to the main page to schedule electrical or plumbing service in Chirala.
        </p>

        {/* Back Button */}
        <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
          <button
            type="button"
            onClick={handleHomeClick}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#E27D60] hover:bg-[#D26B4E] text-white font-bold text-sm transition-colors cursor-pointer min-h-[44px]"
          >
            <span>Back to Homepage</span>
          </button>
          
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#FAF3E7] hover:bg-[#FAF3E7] text-[#2E2E2E] border border-[#E0CEAF] font-semibold text-sm transition-colors min-h-[44px]"
          >
            <span>Go Back</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E0CEAF] text-xs text-[#4A4A4A]">
          Nivaro &bull; Home Services, Made Simple &bull; Chirala, AP
        </div>

      </div>
    </div>
  );
};
