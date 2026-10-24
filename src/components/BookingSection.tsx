import React, { useState, useRef, useEffect } from 'react';
// Minimal inline SVGs (no decorative icon library)
const IconUser = () => (
  <svg className="w-4 h-4 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconPhone = () => (
  <svg className="w-4 h-4 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const IconWrench = () => (
  <svg className="w-4 h-4 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
  </svg>
);
const IconMapPin = () => (
  <svg className="w-4 h-4 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconHome = () => (
  <svg className="w-4 h-4 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const IconCalendar = () => (
  <svg className="w-4 h-4 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IconClock = () => (
  <svg className="w-4 h-4 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconRotate = () => (
  <svg className="w-4 h-4 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
const IconStar = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4 text-gold"} fill="currentColor" stroke="#192A56" strokeWidth="1" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </svg>
);
import { 
  BookingFormData, 
  BookingFormErrors, 
  BookingRecord, 
  BookingStatus, 
  ChiralaNeighborhood, 
  ServiceCategory, 
  TimeSlot 
} from '../types';
import { bookingService } from '../services/bookingService';
import { customerService } from '../services/customerService';

interface BookingSectionProps {
  formData: BookingFormData;
  setFormData: React.Dispatch<React.SetStateAction<BookingFormData>>;
  onOpenPrivacyPolicy?: () => void;
}

const NEIGHBORHOODS: ChiralaNeighborhood[] = [
  'Paparajuthota',
  'Perala',
  'Kothapeta',
  'Srinivas Colony',
];

const TIME_SLOTS: TimeSlot[] = [
  'Morning (8:00 AM – 12:00 PM)',
  'Afternoon (12:00 PM – 4:00 PM)',
  'Evening (4:00 PM – 7:30 PM)',
];

const STATUS_ORDER: BookingStatus[] = ['New', 'Contacted', 'Assigned', 'Completed'];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Basic / Standard expectation',
  2: 'Fair attention needed',
  3: 'Standard domestic service',
  4: 'High priority inspection',
  5: 'Top priority & prompt craftsman resolution',
};

const ERROR_FIELD_IDS: Partial<Record<keyof BookingFormErrors, string>> = {
  fullName: 'fullName',
  phoneNumber: 'phoneNumber',
  serviceCategory: 'serviceCategory',
  neighborhood: 'neighborhood',
  address: 'address',
  description: 'description',
  preferredDate: 'preferredDate',
  timeSlot: 'timeSlot',
  serviceRating: 'serviceRating-1',
  consent: 'consentAgreed',
};

const formatIsoToDisplay = (iso: string): string => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return iso;
};

const formatDisplayToIso = (display: string): string => {
  if (!display) return '';
  const parts = display.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (d && m && y && y.length === 4) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return '';
};

const isValidIndianMobile = (phone: string): boolean => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(?:\+91|91|0)?[6-9]\d{9}$/.test(cleaned);
};

export interface ProblemOption {
  key: string;
  label: string;
  category: ServiceCategory;
  defaultText: string;
}

export const COMMON_PROBLEMS: ProblemOption[] = [
  {
    key: 'Electrical',
    label: 'Electrical',
    category: 'Electrical Repairs',
    defaultText: 'Electrical problem',
  },
  {
    key: 'Fan not working',
    label: 'Fan not working',
    category: 'Electrical Repairs',
    defaultText: 'Fan is not working',
  },
  {
    key: 'Switch or socket problem',
    label: 'Switch or socket problem',
    category: 'Electrical Repairs',
    defaultText: 'Switch or socket is not working',
  },
  {
    key: 'Plumbing',
    label: 'Plumbing',
    category: 'Plumbing Repairs',
    defaultText: 'Plumbing problem',
  },
  {
    key: 'Water leakage',
    label: 'Water leakage',
    category: 'Plumbing Repairs',
    defaultText: 'Water leakage problem',
  },
  {
    key: 'Tap repair',
    label: 'Tap repair',
    category: 'Plumbing Repairs',
    defaultText: 'Tap repair required',
  },
];

export const KNOWN_DEFAULT_DESCRIPTIONS = [
  'Electrical problem',
  'Plumbing problem',
  'Fan is not working',
  'Switch or socket is not working',
  'Water leakage problem',
  'Tap repair required',
];

export const BookingSection: React.FC<BookingSectionProps> = ({ 
  formData, 
  setFormData,
  onOpenPrivacyPolicy,
}) => {
  const [errors, setErrors] = useState<BookingFormErrors>({});
  const [consentAgreed, setConsentAgreed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [simulateFailureToggle] = useState(false);

  const [selectedProblemKey, setSelectedProblemKey] = useState<string>(() => {
    if (formData.description) {
      const match = COMMON_PROBLEMS.find((p) => formData.description.startsWith(p.defaultText));
      if (match) return match.key;
    }
    if (formData.serviceCategory === 'Electrical Repairs') return 'Electrical';
    if (formData.serviceCategory === 'Plumbing Repairs') return 'Plumbing';
    return '';
  });
  const [isDescriptionUserEdited, setIsDescriptionUserEdited] = useState<boolean>(false);

  // Sync selected problem key if formData changes externally (e.g. Services component)
  useEffect(() => {
    if (formData.description) {
      const match = COMMON_PROBLEMS.find((p) => formData.description.startsWith(p.defaultText));
      if (match) {
        setSelectedProblemKey(match.key);
      } else if (formData.serviceCategory === 'Electrical Repairs' && !selectedProblemKey) {
        setSelectedProblemKey('Electrical');
      } else if (formData.serviceCategory === 'Plumbing Repairs' && !selectedProblemKey) {
        setSelectedProblemKey('Plumbing');
      }
    } else if (formData.serviceCategory === 'Electrical Repairs' && !selectedProblemKey) {
      setSelectedProblemKey('Electrical');
    } else if (formData.serviceCategory === 'Plumbing Repairs' && !selectedProblemKey) {
      setSelectedProblemKey('Plumbing');
    }
  }, [formData.serviceCategory, formData.description]);

  const handleCategoryChange = (category: ServiceCategory | '') => {
    if (!category) {
      setFormData((prev) => ({
        ...prev,
        serviceCategory: '',
      }));
      setSelectedProblemKey('');
      return;
    }

    const defaultDesc = 
      category === 'Electrical Repairs' 
        ? 'Electrical problem' 
        : 'Plumbing problem';
    const defaultProblemKey = 
      category === 'Electrical Repairs' 
        ? 'Electrical' 
        : 'Plumbing';

    setSelectedProblemKey(defaultProblemKey);

    setFormData((prev) => {
      let nextDesc = prev.description;
      const isKnownDefault = [
        '',
        ...KNOWN_DEFAULT_DESCRIPTIONS,
      ].includes(prev.description.trim());

      // If not manually edited or matching a known default, auto populate with category default
      if (isKnownDefault || !isDescriptionUserEdited) {
        nextDesc = defaultDesc;
      }

      return {
        ...prev,
        serviceCategory: category,
        description: nextDesc,
      };
    });

    if (errors.serviceCategory) {
      setErrors((prev) => ({ ...prev, serviceCategory: undefined }));
    }
    if (errors.description) {
      setErrors((prev) => ({ ...prev, description: undefined }));
    }
  };

  const handleProblemSelect = (problemKey: string) => {
    setSelectedProblemKey(problemKey);
    const prob = COMMON_PROBLEMS.find((p) => p.key === problemKey);
    if (!prob) {
      return;
    }

    const nextCategory = prob.category;

    setFormData((prev) => {
      const prevDesc = prev.description;
      const prevDefault = COMMON_PROBLEMS.find((p) => p.key === selectedProblemKey)?.defaultText;

      let nextDesc = prob.defaultText;

      // If user previously added extra details to previous default, preserve their appended notes
      if (prevDefault && prevDesc.startsWith(prevDefault)) {
        const extraText = prevDesc.slice(prevDefault.length);
        nextDesc = prob.defaultText + extraText;
      } else if (isDescriptionUserEdited && prevDesc.trim() && !KNOWN_DEFAULT_DESCRIPTIONS.includes(prevDesc.trim())) {
        // User wrote custom text - do not overwrite unexpectedly
        nextDesc = prevDesc;
      }

      return {
        ...prev,
        serviceCategory: nextCategory,
        description: nextDesc,
      };
    });

    if (errors.serviceCategory) {
      setErrors((prev) => ({ ...prev, serviceCategory: undefined }));
    }
    if (errors.description) {
      setErrors((prev) => ({ ...prev, description: undefined }));
    }
  };

  const hiddenDatePickerRef = useRef<HTMLInputElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const validate = (): BookingFormErrors => {
    const newErrors: BookingFormErrors = {};

    // 1. Full Name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Please enter your full name.';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    }

    // 2. Phone Number
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Please enter a 10-digit Indian mobile number.';
    } else if (!isValidIndianMobile(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9 (e.g. 9491242781 or +91 94912 42781).';
    }

    // 3. Service Category
    if (!formData.serviceCategory) {
      newErrors.serviceCategory = 'Please choose a repair category.';
    }

    // 4. Neighborhood
    if (!formData.neighborhood) {
      newErrors.neighborhood = 'Please select your locality in Chirala.';
    }

    // 5. House / Street Address / Landmark
    if (!formData.address.trim()) {
      newErrors.address = 'Please provide your house number, street or nearby landmark.';
    } else if (formData.address.trim().length < 3) {
      newErrors.address = 'Please provide a more specific address detail (min 3 characters).';
    }

    // 6. Problem Description
    if (!formData.description.trim()) {
      newErrors.description = 'Please describe the problem needing repair.';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Please describe the problem in at least 10 characters.';
    }

    // 7. Preferred Date (dd/mm/yyyy)
    const trimmedDate = formData.preferredDate.trim();
    if (!trimmedDate) {
      newErrors.preferredDate = 'Please select or enter preferred date in dd/mm/yyyy format.';
    } else {
      const parts = trimmedDate.split('/');
      if (parts.length !== 3 || parts[2].length !== 4) {
        newErrors.preferredDate = 'Use dd/mm/yyyy format (e.g., 20/10/2026).';
      } else {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (
          isNaN(day) || 
          isNaN(month) || 
          isNaN(year) || 
          month < 1 || 
          month > 12 || 
          day < 1 || 
          day > 31 || 
          year < 2026
        ) {
          newErrors.preferredDate = 'Please enter a valid calendar date in dd/mm/yyyy format.';
        } else {
          const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const parsedDate = new Date(iso);
          if (isNaN(parsedDate.getTime())) {
            newErrors.preferredDate = 'Please enter a valid calendar date.';
          } else if (iso < todayStr) {
            newErrors.preferredDate = 'Date cannot be in the past. Please choose today or a future date.';
          }
        }
      }
    }

    // 8. Time Slot
    if (!formData.timeSlot) {
      newErrors.timeSlot = 'Please select a preferred time slot.';
    }

    // 9. Service Rating
    if (!formData.serviceRating || formData.serviceRating < 1 || formData.serviceRating > 5) {
      newErrors.serviceRating = 'Please select a service priority from 1 to 5 stars.';
    }

    // 10. Required Privacy Consent
    if (!consentAgreed) {
      newErrors.consent = 'Please agree to share your contact details for technician coordination to proceed.';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorKey = Object.keys(validationErrors)[0] as keyof BookingFormErrors;
      const firstFieldId = ERROR_FIELD_IDS[firstErrorKey];
      window.setTimeout(() => {
        if (firstFieldId) {
          document.getElementById(firstFieldId)?.focus();
        } else {
          errorSummaryRef.current?.focus();
        }
      }, 0);
      return;
    }

    setIsSubmitting(true);
    try {
      bookingService.setSimulateFailure(simulateFailureToggle);
      const currentCust = customerService.getCurrentCustomer();
      const bookingPayload: BookingFormData = {
        ...formData,
        customerId: currentCust ? currentCust.id : undefined,
      };
      const created = await bookingService.createBooking(
        bookingPayload,
        currentCust?.id,
        currentCust?.displayId
      );
      setActiveBooking(created);
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
      }, 7000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while creating booking.';
      const technicalFailure = /row-level security|permission denied|jwt|fetch|network/i.test(msg);
      setSubmissionError(
        technicalFailure
          ? 'We could not save this request just now. Please try again, or call +91 94912 42781 and the Chirala desk will take the details by phone.'
          : msg
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setActiveBooking(null);
    setShowToast(false);
    setSubmissionError(null);
    setFormData({
      fullName: '',
      phoneNumber: '',
      serviceCategory: '',
      neighborhood: '',
      address: '',
      description: '',
      preferredDate: '',
      timeSlot: '',
      serviceRating: 0,
    });
    setConsentAgreed(false);
    setSelectedProblemKey('');
    setIsDescriptionUserEdited(false);
    setErrors({});
  };

  const handleOpenCalendar = () => {
    if (hiddenDatePickerRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          hiddenDatePickerRef.current.showPicker();
        } catch {
          hiddenDatePickerRef.current.focus();
        }
      } else {
        hiddenDatePickerRef.current.focus();
      }
    }
  };

  const handleCalendarPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    if (isoVal) {
      const displayVal = formatIsoToDisplay(isoVal);
      setFormData((prev) => ({ ...prev, preferredDate: displayVal }));
      if (errors.preferredDate) {
        setErrors((prev) => ({ ...prev, preferredDate: undefined }));
      }
    }
  };

  const handleDateTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d/]/g, '');
    if (!val.includes('/') && val.length > 2) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    if (val.split('/').length === 2 && val.split('/')[1].length > 2) {
      const parts = val.split('/');
      val = parts[0] + '/' + parts[1].slice(0, 2) + '/' + parts[1].slice(2);
    }
    if (val.length > 10) val = val.slice(0, 10);

    setFormData((prev) => ({ ...prev, preferredDate: val }));
    if (errors.preferredDate) {
      setErrors((prev) => ({ ...prev, preferredDate: undefined }));
    }
  };

  const handleTransitionStatus = (nextStatus: BookingStatus) => {
    if (!activeBooking) return;
    const updated = bookingService.updateBookingStatus(
      activeBooking.id,
      nextStatus,
      `Tester transitioned status to ${nextStatus}`
    );
    if (updated) {
      setActiveBooking(updated);
    }
  };

  const errorEntries = Object.entries(errors).filter(([, message]) => Boolean(message)) as [
    keyof BookingFormErrors,
    string,
  ][];

  const stepCompletion = [
    {
      label: 'Your details',
      complete: formData.fullName.trim().length >= 2 && isValidIndianMobile(formData.phoneNumber),
    },
    {
      label: 'The repair',
      complete: Boolean(
        formData.serviceCategory &&
          formData.neighborhood &&
          formData.address.trim().length >= 3 &&
          formData.description.trim().length >= 10
      ),
    },
    {
      label: 'Visit preference',
      complete: Boolean(formData.preferredDate.trim() && formData.timeSlot && formData.serviceRating > 0),
    },
  ];

  const summaryRows = [
    { label: 'Category', value: formData.serviceCategory || 'Not selected' },
    { label: 'Locality', value: formData.neighborhood || 'Not selected' },
    {
      label: 'Preferred visit',
      value:
        [formData.preferredDate.trim(), formData.timeSlot].filter(Boolean).join(' · ') || 'Not selected',
    },
    {
      label: 'Priority',
      value: formData.serviceRating > 0 ? `${formData.serviceRating} of 5 stars` : 'Not selected',
    },
  ];

  return (
    <section id="booking" className="py-16 md:py-20 bg-white border-b border-slate-200 relative">
      
      {/* Toast Notification */}
      {showToast && activeBooking && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white text-navy p-4 rounded-xl border border-slate-200 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300 shadow-xl"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-navy mt-0.5">
            <IconCheck />
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-sm font-bold text-navy">Service Request Received</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Ref #{activeBooking.id}: Our Chirala local coordinator will contact {activeBooking.fullName} shortly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="text-slate-500 hover:text-navy p-1 rounded-md text-xs cursor-pointer"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8 pb-6 border-b border-slate-200">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 mb-2">
              <IconMapPin />
              Chirala local dispatch
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy mb-2">
              Book a service in Chirala
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Tell us what needs fixing. Our local desk calls to coordinate the visit with an
              approved technician on your preferred date.
            </p>
          </div>
          <div className="text-xs text-slate-600 shrink-0">
            <p className="font-bold text-navy">Prefer to book by phone?</p>
            <a
              href="tel:+919491242781"
              className="mt-0.5 inline-block text-sm font-bold text-navy underline decoration-gold decoration-2 underline-offset-2 hover:decoration-navy transition-colors"
            >
              +91 94912 42781
            </a>
            <p className="mt-1">Daily, 8:00 AM &ndash; 7:30 PM</p>
          </div>
        </div>

        {/* Form or Confirmation Card */}
        <div className="bg-white border border-slate-200 p-5 sm:p-8">
          
          {activeBooking ? (
            /* Confirmation State with Visual Status Tracker */
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 text-left">
              
              {/* Banner */}
              <div 
                className="p-5 border-l-4 border-gold bg-slate-50 text-navy flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-navy text-gold border border-navy flex items-center justify-center shrink-0 shadow-xs">
                  <IconCheck />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span 
                      className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-gold text-navy"
                    >
                      Status: {activeBooking.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Booking Reference: <strong className="text-navy font-bold">{activeBooking.id}</strong>
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-navy">
                    Request Confirmed for {activeBooking.fullName}!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    We will call you on <strong className="text-navy">{activeBooking.phoneNumber}</strong> to confirm technician dispatch for {activeBooking.neighborhood}.
                  </p>
                </div>
              </div>

              {/* Visual Status Tracker */}
              <div className="border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
                    Booking Progress Tracker
                  </h4>
                  <span className="text-xs text-slate-500 font-semibold">
                    Current Step: {activeBooking.status}
                  </span>
                </div>

                {/* Progress Pipeline */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                  {STATUS_ORDER.map((step, idx) => {
                    const currentIdx = STATUS_ORDER.indexOf(activeBooking.status as BookingStatus);
                    const isCompleted = currentIdx >= idx && activeBooking.status !== 'Cancelled';
                    const isCurrent = activeBooking.status === step;
                    
                    return (
                      <div key={step} className="flex flex-col items-center">
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors ${
                            isCurrent
                              ? 'bg-gold text-navy ring-2 ring-gold-active font-black'
                              : isCompleted
                              ? 'bg-navy text-white'
                              : 'bg-white border-2 border-slate-500 text-slate-500'
                          }`}
                        >
                          {isCompleted ? '✓' : idx + 1}
                        </div>
                        <span className={`text-[11px] ${isCurrent ? 'text-navy font-black underline decoration-gold decoration-2 underline-offset-2' : 'text-slate-500'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Simulated status transitions, kept out of the primary flow */}
                <details className="mt-4 pt-3 border-t border-slate-200">
                  <summary className="cursor-pointer list-none text-[11px] font-semibold text-slate-500 hover:text-navy">
                    Demo: simulate booking status changes
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {STATUS_ORDER.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleTransitionStatus(s)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                          activeBooking.status === s
                            ? 'bg-gold text-navy border-gold'
                            : 'bg-white text-navy border-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        Set {s}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleTransitionStatus('Cancelled')}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                        activeBooking.status === 'Cancelled'
                          ? 'bg-red-900 text-white border-2 border-red-400'
                          : 'bg-white text-red-800 border-red-300 hover:bg-red-50'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </details>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-slate-200 pt-6">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Customer Name
                  </span>
                  <span className="font-bold text-navy flex items-center gap-2">
                    <IconUser />
                    {activeBooking.fullName}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Contact Mobile
                  </span>
                  <span className="font-bold text-navy flex items-center gap-2">
                    <IconPhone />
                    {activeBooking.phoneNumber}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Service Category
                  </span>
                  <span className="font-bold text-navy flex items-center gap-2">
                    <IconWrench />
                    {activeBooking.serviceCategory}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Chirala Locality
                  </span>
                  <span className="font-bold text-navy flex items-center gap-2">
                    <IconMapPin />
                    {activeBooking.neighborhood}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Specific House / Street Address / Landmark
                  </span>
                  <span className="font-medium text-slate-700 flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200">
                    <IconHome />
                    {activeBooking.address}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Preferred Date (DD/MM/YYYY)
                  </span>
                  <span className="font-bold text-navy flex items-center gap-2">
                    <IconCalendar />
                    {activeBooking.preferredDate}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Preferred Time Slot
                  </span>
                  <span className="font-bold text-navy flex items-center gap-2">
                    <IconClock />
                    {activeBooking.timeSlot}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Service Priority
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex text-gold">
                      {[...Array(5)].map((_, i) => (
                        <IconStar key={i} 
                          className={`w-4 h-4 ${i < activeBooking.serviceRating ? 'fill-gold text-gold' : 'text-slate-500/40'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-navy">
                      {activeBooking.serviceRating} / 5 stars &bull; {RATING_DESCRIPTIONS[activeBooking.serviceRating]}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Problem Summary
                  </span>
                  <p className="font-medium text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm leading-relaxed">
                    {activeBooking.description}
                  </p>
                </div>
              </div>

              {/* Session Notice */}
              <div className="p-4 border-l-2 border-navy bg-slate-50 text-slate-700 text-xs leading-relaxed flex items-start gap-3">
                <span className="text-xs font-bold text-navy">[i]</span>
                <div>
                  <strong className="font-bold text-navy">Booking Confirmed:</strong> Your service request has been logged in the active system (Ref: #{activeBooking.id}). Our Chirala dispatcher coordinates directly with local technicians to confirm your arrival window.
                </div>
              </div>

              {/* Direct Call & Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <a
                  href="tel:+919491242781"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-navy text-white border border-slate-200 hover:border-gold text-sm font-bold transition-colors min-h-[44px]"
                >
                  <IconPhone />
                  <span>Call Support: +91 94912 42781</span>
                </a>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gold text-navy text-sm font-bold hover:bg-gold-hover border border-navy shadow-sm transition-colors cursor-pointer min-h-[44px]"
                >
                  <IconRotate />
                  <span>Submit Another Request</span>
                </button>
              </div>

            </div>
          ) : (
            /* Active Booking Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-6 text-left">

              {/* Step overview */}
              <ol className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-5">
                {stepCompletion.map((step, index) => (
                  <li key={step.label} className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.complete
                          ? 'bg-navy text-white'
                          : 'border border-slate-400 bg-white text-slate-500'
                      }`}
                      aria-hidden="true"
                    >
                      {step.complete ? '✓' : index + 1}
                    </span>
                    <span
                      className={`text-[11px] sm:text-xs font-semibold leading-tight ${
                        step.complete ? 'text-navy' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                      <span className="sr-only">{step.complete ? ' completed' : ' not completed'}</span>
                    </span>
                  </li>
                ))}
              </ol>

              {/* Submission Error Banner */}
              {submissionError && (
                <div 
                  role="alert"
                  className="p-4 rounded-xl bg-red-50 border-2 border-red-700 text-red-900 text-sm flex items-start gap-3 animate-in fade-in"
                >
                  <span className="text-xs font-bold text-red-800">[!]</span>
                  <div className="flex-1">
                    <p className="font-bold">Booking Submission Failed</p>
                    <p className="text-xs mt-0.5">{submissionError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmissionError(null)}
                    className="text-xs font-bold text-red-900 hover:underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Validation summary */}
              {errorEntries.length > 0 && (
                <div
                  ref={errorSummaryRef}
                  tabIndex={-1}
                  role="alert"
                  aria-labelledby="booking-error-heading"
                  className="border-l-4 border-red-800 bg-red-50 px-4 py-4 text-left"
                >
                  <h3 id="booking-error-heading" className="text-sm font-bold text-red-900">
                    Check {errorEntries.length} {errorEntries.length === 1 ? 'field' : 'fields'} before submitting
                  </h3>
                  <ul className="mt-2 space-y-1 text-xs text-red-900">
                    {errorEntries.map(([key, message]) => {
                      const fieldId = ERROR_FIELD_IDS[key];
                      return (
                        <li key={key}>
                          {fieldId ? (
                            <a
                              href={`#${fieldId}`}
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(fieldId)?.focus();
                              }}
                              className="underline underline-offset-2 hover:no-underline"
                            >
                              {message}
                            </a>
                          ) : (
                            message
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Step 1: Customer Personal Details */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-start gap-3 mb-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-gold" aria-hidden="true">
                    1
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-navy">Your contact details</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Used to confirm the visit and coordinate with the technician.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Customer Full Name */}
                <div>
                  <label 
                    htmlFor="fullName" 
                    className="block text-sm font-bold text-navy mb-2"
                  >
                    Customer Full Name <span className="text-red-900" aria-hidden="true">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    placeholder="e.g. Ramesh Varma"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                    }}
                    aria-invalid={errors.fullName ? 'true' : 'false'}
                    aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                    className={`w-full px-4 py-3 rounded-lg border bg-white text-navy placeholder:text-navy/70 text-sm transition-colors focus:outline-none min-h-[44px] ${
                      errors.fullName 
                        ? 'border-red-700 focus:border-red-800 focus:ring-1 focus:ring-red-700 !bg-red-50'
                        : 'border-slate-500 focus:border-navy focus:ring-1 focus:ring-navy'
                    }`}
                    required
                  />
                  {errors.fullName && (
                    <p id="fullName-error" className="mt-1.5 text-xs text-red-900 font-semibold">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* 2. Customer Phone Number */}
                <div>
                  <label 
                    htmlFor="phoneNumber" 
                    className="block text-sm font-bold text-navy mb-2"
                  >
                    Customer Mobile Number <span className="text-red-900" aria-hidden="true">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    autoComplete="tel"
                    placeholder="e.g. 9491242781 or +91 94912 42781"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, phoneNumber: e.target.value });
                      if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: undefined });
                    }}
                    aria-invalid={errors.phoneNumber ? 'true' : 'false'}
                    aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : 'phoneNumber-hint'}
                    className={`w-full px-4 py-3 rounded-lg border bg-white text-navy placeholder:text-navy/70 text-sm transition-colors focus:outline-none min-h-[44px] ${
                      errors.phoneNumber 
                        ? 'border-red-700 focus:border-red-800 focus:ring-1 focus:ring-red-700 !bg-red-50'
                        : 'border-slate-500 focus:border-navy focus:ring-1 focus:ring-navy'
                    }`}
                    required
                  />
                  <p id="phoneNumber-hint" className="mt-1 text-[11px] text-slate-500">
                    10-digit Indian mobile number for technician dispatch and coordination.
                  </p>
                  {errors.phoneNumber && (
                    <p id="phoneNumber-error" className="mt-1.5 text-xs text-red-900 font-semibold">
                      {errors.phoneNumber}
                    </p>
                  )}
                </div>

                </div>
              </div>

              {/* Step 2: Service, Locality & Problem */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-start gap-3 mb-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-gold" aria-hidden="true">
                    2
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-navy">The repair</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pick the trade and locality, then describe what you have noticed.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 3. Service Category */}
                <div>
                  <label 
                    htmlFor="serviceCategory" 
                    className="block text-sm font-bold text-navy mb-2"
                  >
                    Service Category <span className="text-red-900" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="serviceCategory"
                    name="serviceCategory"
                    value={formData.serviceCategory}
                    onChange={(e) => {
                      handleCategoryChange(e.target.value as ServiceCategory);
                    }}
                    aria-invalid={errors.serviceCategory ? 'true' : 'false'}
                    aria-describedby={errors.serviceCategory ? 'serviceCategory-error' : undefined}
                    className={`w-full px-4 py-3 rounded-lg border bg-white text-navy placeholder:text-navy/70 text-sm transition-colors focus:outline-none min-h-[44px] ${
                      errors.serviceCategory 
                        ? 'border-red-700 focus:border-red-800 focus:ring-1 focus:ring-red-700 !bg-red-50'
                        : 'border-slate-500 focus:border-navy focus:ring-1 focus:ring-navy'
                    }`}
                    required
                  >
                    <option value="">-- Choose Category --</option>
                    <option value="Electrical Repairs">Electrical Repairs</option>
                    <option value="Plumbing Repairs">Plumbing Repairs</option>
                  </select>
                  {errors.serviceCategory && (
                    <p id="serviceCategory-error" className="mt-1.5 text-xs text-red-900 font-semibold">
                      {errors.serviceCategory}
                    </p>
                  )}
                </div>

                {/* 4. Chirala Neighborhood (Strict 4 Localities) */}
                <div>
                  <label 
                    htmlFor="neighborhood" 
                    className="block text-sm font-bold text-navy mb-2"
                  >
                    Neighborhood in Chirala <span className="text-red-900" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="neighborhood"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => {
                      setFormData({ ...formData, neighborhood: e.target.value as ChiralaNeighborhood });
                      if (errors.neighborhood) setErrors({ ...errors, neighborhood: undefined });
                    }}
                    aria-invalid={errors.neighborhood ? 'true' : 'false'}
                    aria-describedby={errors.neighborhood ? 'neighborhood-error' : undefined}
                    className={`w-full px-4 py-3 rounded-lg border bg-white text-navy placeholder:text-navy/70 text-sm transition-colors focus:outline-none min-h-[44px] ${
                      errors.neighborhood 
                        ? 'border-red-700 focus:border-red-800 focus:ring-1 focus:ring-red-700 !bg-red-50'
                        : 'border-slate-500 focus:border-navy focus:ring-1 focus:ring-navy'
                    }`}
                    required
                  >
                    <option value="">-- Select Locality in Chirala --</option>
                    {NEIGHBORHOODS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  {errors.neighborhood && (
                    <p id="neighborhood-error" className="mt-1.5 text-xs text-red-900 font-semibold">
                      {errors.neighborhood}
                    </p>
                  )}
                </div>

              </div>

              {/* Problem Type Selector & Quick Selection Chips */}
              <div className="border-t border-slate-200 pt-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label 
                    htmlFor="problemType" 
                    className="block text-xs font-bold uppercase tracking-wider text-navy"
                  >
                    Problem Type / Common Issue
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Selecting an issue automatically pre-fills the description
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <select
                    id="problemType"
                    name="problemType"
                    value={selectedProblemKey}
                    onChange={(e) => handleProblemSelect(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-500 bg-white text-navy text-sm transition-colors focus:outline-none focus:border-navy min-h-[42px]"
                  >
                    <option value="">Choose problem type</option>
                    {(!formData.serviceCategory || formData.serviceCategory === 'Electrical Repairs') && (
                      <optgroup label="Electrical Repairs">
                        <option value="Electrical">Electrical problem</option>
                        <option value="Fan not working">Fan not working</option>
                        <option value="Switch or socket problem">Switch or socket problem</option>
                      </optgroup>
                    )}
                    {(!formData.serviceCategory || formData.serviceCategory === 'Plumbing Repairs') && (
                      <optgroup label="Plumbing Repairs">
                        <option value="Plumbing">Plumbing problem</option>
                        <option value="Water leakage">Water leakage</option>
                        <option value="Tap repair">Tap repair</option>
                      </optgroup>
                    )}
                  </select>

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_PROBLEMS
                      .filter((p) => !formData.serviceCategory || p.category === formData.serviceCategory)
                      .map((prob) => (
                        <button
                          key={prob.key}
                          type="button"
                          onClick={() => handleProblemSelect(prob.key)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                            selectedProblemKey === prob.key
                              ? 'bg-gold text-navy border-2 border-navy shadow-xs'
                              : 'bg-white text-navy border-slate-500 hover:border-navy hover:bg-slate-50'
                          }`}
                        >
                          {prob.label}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {/* 5. House / Street Address / Landmark */}
              <div>
                <label 
                  htmlFor="address" 
                  className="block text-sm font-bold text-navy mb-2"
                >
                  House / Street Address / Landmark <span className="text-red-900" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  placeholder="e.g. H.No 5-82/1, Beside Ramalayam Temple, 2nd Cross Road"
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({ ...formData, address: e.target.value });
                    if (errors.address) setErrors({ ...errors, address: undefined });
                  }}
                  aria-invalid={errors.address ? 'true' : 'false'}
                  aria-describedby={errors.address ? 'address-error' : undefined}
                  className={`w-full px-4 py-3 rounded-lg border bg-white text-navy placeholder:text-navy/70 text-sm transition-colors focus:outline-none min-h-[44px] ${
                    errors.address 
                      ? 'border-red-700 focus:border-red-800 focus:ring-1 focus:ring-red-700 !bg-red-50'
                      : 'border-slate-500 focus:border-navy focus:ring-1 focus:ring-navy'
                  }`}
                  required
                />
                {errors.address && (
                  <p id="address-error" className="mt-1.5 text-xs text-red-900 font-semibold">
                    {errors.address}
                  </p>
                )}
              </div>

              {/* 6. Description of Problem */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label 
                    htmlFor="description" 
                    className="block text-sm font-bold text-navy"
                  >
                    Description of the Problem <span className="text-red-900" aria-hidden="true">*</span>
                  </label>
                  {selectedProblemKey && (
                    <span className="text-[11px] font-semibold text-navy">
                      Auto-populated: &quot;{COMMON_PROBLEMS.find(p => p.key === selectedProblemKey)?.defaultText}&quot; (editable)
                    </span>
                  )}
                </div>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, description: val });
                    setIsDescriptionUserEdited(val.trim() !== '');
                    if (errors.description) setErrors({ ...errors, description: undefined });
                  }}
                  aria-invalid={errors.description ? 'true' : 'false'}
                  aria-describedby={errors.description ? 'description-error' : 'description-hint'}
                  placeholder="Describe the problem (e.g. leaking kitchen tap or a humming ceiling fan)..."
                  className={`w-full px-4 py-3 rounded-lg border bg-white text-navy placeholder:text-navy/70 text-sm transition-colors focus:outline-none ${
                    errors.description 
                      ? 'border-red-700 focus:border-red-800 focus:ring-1 focus:ring-red-700 !bg-red-50'
                      : 'border-slate-500 focus:border-navy focus:ring-1 focus:ring-navy'
                  }`}
                  required
                />
                <div className="flex justify-between items-center mt-1.5">
                  <span id="description-hint" className="text-xs text-slate-500">
                    Minimum 10 characters required. You can edit and add details anytime.
                  </span>
                  <span className={`text-xs font-semibold ${formData.description.length >= 10 ? 'text-navy' : 'text-slate-500'}`}>
                    {formData.description.length} characters
                  </span>
                </div>
                {errors.description && (
                  <p id="description-error" className="mt-1 text-xs text-red-900 font-semibold">
                    {errors.description}
                  </p>
                )}
              </div>

              </div>

              {/* Step 3: Preferred Date, Time & Priority */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-start gap-3 mb-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-gold" aria-hidden="true">
                    3
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-navy">Visit preference</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose when you would like the technician to visit, then confirm your consent.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 7. Preferred Date (dd/mm/yyyy display + custom picker) */}
                <div>
                  <label 
                    htmlFor="preferredDate" 
                    className="block text-sm font-bold text-navy mb-2"
                  >
                    Preferred Date (dd/mm/yyyy) <span className="text-red-900" aria-hidden="true">*</span>
                  </label>
                  
                  <div className="relative">
                    <input
                      type="text"
                      id="preferredDate"
                      name="preferredDate"
                      placeholder="dd/mm/yyyy"
                      maxLength={10}
                      value={formData.preferredDate}
                      onChange={handleDateTextChange}
                      aria-invalid={errors.preferredDate ? 'true' : 'false'}
                      aria-describedby={errors.preferredDate ? 'preferredDate-error' : 'preferredDate-hint'}
                      className={`w-full pl-4 pr-12 py-3 rounded-lg border bg-white text-navy placeholder:text-navy/70 text-sm transition-colors focus:outline-none min-h-[44px] tracking-wide font-medium ${
                        errors.preferredDate 
                          ? 'border-red-700 focus:border-red-800 focus:ring-1 focus:ring-red-700 !bg-red-50'
                          : 'border-slate-500 focus:border-navy focus:ring-1 focus:ring-navy'
                      }`}
                      required
                    />

                    <button
                      type="button"
                      onClick={handleOpenCalendar}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-navy hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy cursor-pointer"
                      title="Open calendar picker"
                      aria-label="Open calendar date picker"
                    >
                      <IconCalendar />
                    </button>

                    <input
                      type="date"
                      ref={hiddenDatePickerRef}
                      min={todayStr}
                      value={formatDisplayToIso(formData.preferredDate)}
                      onChange={handleCalendarPickerChange}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="opacity-0 pointer-events-none absolute bottom-0 left-0 w-0 h-0"
                    />
                  </div>

                  <p id="preferredDate-hint" className="mt-1 text-[11px] text-slate-500">
                    Format: dd/mm/yyyy. Click calendar icon or type directly.
                  </p>

                  {errors.preferredDate && (
                    <p id="preferredDate-error" className="mt-1.5 text-xs text-red-900 font-semibold">
                      {errors.preferredDate}
                    </p>
                  )}
                </div>

                {/* 8. Preferred Time Slot */}
                <div>
                  <label 
                    htmlFor="timeSlot" 
                    className="block text-sm font-bold text-navy mb-2"
                  >
                    Preferred Time Slot <span className="text-red-900" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="timeSlot"
                    name="timeSlot"
                    value={formData.timeSlot}
                    onChange={(e) => {
                      setFormData({ ...formData, timeSlot: e.target.value as TimeSlot });
                      if (errors.timeSlot) setErrors({ ...errors, timeSlot: undefined });
                    }}
                    aria-invalid={errors.timeSlot ? 'true' : 'false'}
                    aria-describedby={errors.timeSlot ? 'timeSlot-error' : undefined}
                    className={`w-full px-4 py-3 rounded-lg border bg-white text-navy placeholder:text-navy/70 text-sm transition-colors focus:outline-none min-h-[44px] ${
                      errors.timeSlot 
                        ? 'border-red-700 focus:border-red-800 focus:ring-1 focus:ring-red-700 !bg-red-50'
                        : 'border-slate-500 focus:border-navy focus:ring-1 focus:ring-navy'
                    }`}
                    required
                  >
                    <option value="">-- Choose Time Window --</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  {errors.timeSlot && (
                    <p id="timeSlot-error" className="mt-1.5 text-xs text-red-900 font-semibold">
                      {errors.timeSlot}
                    </p>
                  )}
                </div>

              </div>

              {/* Request summary */}
              {(formData.serviceCategory ||
                formData.neighborhood ||
                formData.preferredDate ||
                formData.timeSlot ||
                formData.serviceRating > 0) && (
              <div className="border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Your request at a glance
                </h4>
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                  {summaryRows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4 border-b border-slate-200 py-1.5">
                      <dt className="text-slate-600">{row.label}</dt>
                      <dd className="font-semibold text-navy text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {formData.description.trim() && (
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                    <span className="font-semibold text-navy">Problem:</span> {formData.description}
                  </p>
                )}
                <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
                  Next: the Chirala desk calls to confirm the technician and arrival window. The
                  technician quotes the repair on site before starting any work.
                </p>
              </div>
              )}

              {/* 9. Interactive 1-to-5 Star Service Rating / Priority */}
              <div className="border-t border-slate-200 pt-5">
                <p id="serviceRating-label" className="block text-sm font-bold text-navy mb-1">
                  Service priority <span className="text-red-900" aria-hidden="true">*</span>
                </p>
                <p id="serviceRating-hint" className="text-xs text-slate-500 mb-3">
                  How urgent is this repair? 1 is standard, 5 is top priority.
                </p>

                <div
                  role="group"
                  aria-labelledby="serviceRating-label"
                  aria-describedby={errors.serviceRating ? 'serviceRating-error' : 'serviceRating-hint'}
                  className="flex flex-wrap items-center gap-2"
                >
                  <div 
                    className="flex items-center gap-1.5 cursor-pointer"
                    onMouseLeave={() => setHoverRating(null)}
                  >
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isFilled = (hoverRating !== null ? hoverRating : formData.serviceRating) >= starVal;
                      return (
                        <button
                          key={starVal}
                          id={`serviceRating-${starVal}`}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, serviceRating: starVal });
                            if (errors.serviceRating) setErrors({ ...errors, serviceRating: undefined });
                          }}
                          onMouseEnter={() => setHoverRating(starVal)}
                          className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy rounded-lg transition-colors hover:bg-slate-100 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          aria-label={`Select ${starVal} out of 5 stars`}
                          aria-pressed={formData.serviceRating === starVal}
                        >
                          <IconStar className={`w-6 h-6 transition-colors ${
                              isFilled ? 'fill-gold text-gold' : 'text-navy/25'
                            }`} 
                          />
                        </button>
                      );
                    })}
                  </div>

                  {formData.serviceRating > 0 ? (
                    <span className="text-xs font-bold text-navy ml-2">
                      {formData.serviceRating} / 5 stars &bull;{' '}
                      <span className="text-navy font-semibold">
                        {RATING_DESCRIPTIONS[formData.serviceRating] || 'Standard'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-500 ml-2">
                      Select a priority from 1 to 5
                    </span>
                  )}
                </div>

                {errors.serviceRating && (
                  <p id="serviceRating-error" className="mt-1.5 text-xs text-red-900 font-semibold">
                    {errors.serviceRating}
                  </p>
                )}
              </div>

              {/* 10. Required Privacy & Technician Coordination Consent */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consentAgreed"
                    name="consentAgreed"
                    checked={consentAgreed}
                    onChange={(e) => {
                      setConsentAgreed(e.target.checked);
                      if (errors.consent) setErrors((prev) => ({ ...prev, consent: undefined }));
                    }}
                    aria-invalid={errors.consent ? 'true' : 'false'}
                    aria-describedby={errors.consent ? 'consent-error' : undefined}
                    className="mt-0.5 w-4 h-4 rounded accent-gold text-navy focus:ring-navy border-slate-500 cursor-pointer shrink-0"
                    required
                  />
                  <label htmlFor="consentAgreed" className="text-xs text-navy leading-relaxed cursor-pointer select-none">
                    <span className="font-bold text-navy">Required Consent: </span>
                    I agree to let Nivaro share my contact details and domestic address with an approved local technician in Chirala solely for service coordination and repair dispatch, in accordance with the{' '}
                    <button
                      type="button"
                      onClick={onOpenPrivacyPolicy}
                      className="text-navy font-bold underline decoration-gold decoration-2 hover:text-navy/80 inline cursor-pointer p-0 bg-transparent border-none"
                    >
                      Privacy Policy
                    </button>.
                  </label>
                </div>
                {errors.consent && (
                  <p id="consent-error" className="mt-2 text-xs text-red-900 font-semibold pl-7">
                    {errors.consent}
                  </p>
                )}
              </div>

              </div>

              {/* Form Footer with Submit */}
              <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Direct dispatch in Paparajuthota, Perala, Kothapeta &amp; Srinivas Colony.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-gold text-navy font-bold text-sm sm:text-base hover:bg-gold-hover border border-navy transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer min-h-[48px] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>Dispatching request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Booking Request</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </section>
  );
};
