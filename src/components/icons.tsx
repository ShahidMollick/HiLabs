type P = { className?: string };

const base = (className = "size-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const HomeIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z" /></svg>
);
export const PeopleIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2" /></svg>
);
export const PhoneIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.3 6.3l1.4-2.2L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" /></svg>
);
export const TaskIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
export const ChatIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 5h16v11H9l-5 4z" /></svg>
);
export const SearchIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const BellIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5h4" /></svg>
);
export const HelpIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.3M12 17h.01" /></svg>
);
export const ChevronIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="m9 6 6 6-6 6" /></svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const ClockIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const SparkIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3.5c.6 4.4 4.1 7.9 8.5 8.5-4.4.6-7.9 4.1-8.5 8.5-.6-4.4-4.1-7.9-8.5-8.5 4.4-.6 7.9-4.1 8.5-8.5z" /></svg>
);
export const MenuIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const MicOffIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M9 5a3 3 0 0 1 6 0v6M15 13.5A3 3 0 0 1 9 11V9M5 11a7 7 0 0 0 11.6 5.3M19 11a7 7 0 0 1-.6 2.8M12 18v3M4 4l16 16" /></svg>
);
export const MicIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const EndCallIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 14.5c5-4.7 13-4.7 18 0l-2.2 2.6-3.6-1.4V13a12 12 0 0 0-6.4 0v2.7l-3.6 1.4z" /></svg>
);
export const UndoIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const PauseIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M9 5v14M15 5v14" /></svg>
);
export const PlayIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M7 5v14l11-7z" /></svg>
);
export const KeypadIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="6" cy="5" r="1.2" /><circle cx="12" cy="5" r="1.2" /><circle cx="18" cy="5" r="1.2" /><circle cx="6" cy="11" r="1.2" /><circle cx="12" cy="11" r="1.2" /><circle cx="18" cy="11" r="1.2" /><circle cx="6" cy="17" r="1.2" /><circle cx="12" cy="17" r="1.2" /><circle cx="18" cy="17" r="1.2" /><circle cx="12" cy="22" r="1.2" /></svg>
);
export const PersonAddIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.6 0 3 .4 4.1 1.2M18 13v6M15 16h6" /></svg>
);
export const CaptionsIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 10.5a2 2 0 1 0 0 3M16.5 10.5a2 2 0 1 0 0 3" /></svg>
);
export const CollapseIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M9 4v5H4M15 20v-5h5M4 9l5-5M20 15l-5 5" /></svg>
);
export const AlertIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 17h.01" /></svg>
);
export const ArrowRightIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const PillIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="8" width="18" height="8" rx="4" /><path d="M12 8v8" /></svg>
);
export const ActivityIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 12h4l2-5 4 10 2-5h6" /></svg>
);
export const CalendarIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const HeartIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" /></svg>
);
export const WalkIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="13" cy="4.5" r="1.8" /><path d="m9 21 2.5-6 2.5 2v4M8 12l2.5-4.5 4 1.5 2 3M11.5 15l-.8-4.5" /></svg>
);
export const TargetIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></svg>
);
export const ListChecksIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="m3.5 6.5 1.5 1.5 3-3M3.5 13.5 5 15l3-3M11 7h9.5M11 14h9.5M11 19.5h9.5" /></svg>
);
export const NoteIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 3h8.5L19 7.5V21H6z" /><path d="M14 3v5h5M9 12h7M9 15.5h7M9 19h4" /></svg>
);
export const EyeIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const QuoteIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M5 18c2.5-1.2 3.5-3.4 3.5-6V7H4.5v5H8M15 18c2.5-1.2 3.5-3.4 3.5-6V7h-4v5H18" /></svg>
);
export const ClipboardIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="5" y="4.5" width="14" height="16.5" rx="2.5" /><path d="M9 4.5V3h6v1.5M8.5 11l2 2 4-4M8.5 16.5h7" /></svg>
);
export const HistoryIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4h4" /><path d="M12 8v4.5l3 1.8" /></svg>
);
export const DatabaseIcon = ({ className }: P) => (
  <svg {...base(className)}><ellipse cx="12" cy="6" rx="7" ry="2.8" /><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" /></svg>
);
export const EarIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M7 9a5 5 0 0 1 10 0c0 3.5-3.5 4-3.5 7.5a3 3 0 0 1-5.5 1.6M10 9.5a2 2 0 0 1 4 0" /></svg>
);
export const ChevronDownIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="m6 9 6 6 6-6" /></svg>
);
export const PlusIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 5v14M5 12h14" /></svg>
);
export const MinusIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M5 12h14" /></svg>
);
export const ShieldIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z" /></svg>
);
export const LanguagesIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M3.5 5.5h9M8 3.5v2M5 5.5c.8 3.2 3 5.8 6 7M11 5.5c-.8 3.2-3 5.8-6 7M12.5 20.5l4-9.5 4 9.5M14 17h5" /></svg>
);
export const SpinnerIcon = ({ className }: P) => (
  <svg className={`${className ?? "size-5"} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.5" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
);
