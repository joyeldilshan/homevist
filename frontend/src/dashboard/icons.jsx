/**
 * Dashboard line icons. 24px grid, 1.7 stroke, currentColor, always
 * aria-hidden: every icon sits next to a visible or screen-reader label.
 * Replaces the emoji the dashboards used for navigation and metadata.
 */
const P = ({ children, size = 20, className = "" }) => (
  <svg className={`db-ico ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const I = {
  home:     (p) => <P {...p}><path d="M4 11.2 12 4.5l8 6.7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></P>,
  calendar: (p) => <P {...p}><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></P>,
  list:     (p) => <P {...p}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></P>,
  file:     (p) => <P {...p}><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5Z" /><path d="M14 3.5V8h4M9 13h6M9 16.5h6" /></P>,
  repeat:   (p) => <P {...p}><path d="M17 3.5 20 6.5l-3 3" /><path d="M4 12V9.5a3 3 0 0 1 3-3h13" /><path d="M7 20.5 4 17.5l3-3" /><path d="M20 12v2.5a3 3 0 0 1-3 3H4" /></P>,
  user:     (p) => <P {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></P>,
  users:    (p) => <P {...p}><circle cx="9" cy="8.5" r="3.4" /><path d="M2.8 20c1-3.2 3.3-5 6.2-5s5.2 1.8 6.2 5" /><path d="M15.5 5.3a3.4 3.4 0 0 1 0 6.4M17.8 15.2c1.7.7 2.9 2.3 3.4 4.8" /></P>,
  chart:    (p) => <P {...p}><path d="M4 20h16" /><path d="M7 16v-5M12 16V7M17 16v-8" /></P>,
  grid:     (p) => <P {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></P>,
  target:   (p) => <P {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r=".8" /></P>,
  flask:    (p) => <P {...p}><path d="M9.5 3.5h5M10.5 3.5v5.2L5.4 18a1.7 1.7 0 0 0 1.5 2.5h10.2a1.7 1.7 0 0 0 1.5-2.5l-5.1-9.3V3.5" /><path d="M7.6 14.5h8.8" /></P>,
  tube:     (p) => <P {...p}><path d="M9.5 3.5h5M10.5 3.5v14a1.5 1.5 0 0 0 3 0v-14" /><path d="M10.5 12h3" /></P>,
  inbox:    (p) => <P {...p}><path d="M4 13.5 6.5 5h11L20 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" /><path d="M4 13.5h4.5l1 2h5l1-2H20" /></P>,
  check:    (p) => <P {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></P>,
  mail:     (p) => <P {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></P>,
  logout:   (p) => <P {...p}><path d="M14 4.5h4.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H14" /><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15" /></P>,
  menu:     (p) => <P {...p}><path d="M4 7h16M4 12h16M4 17h16" /></P>,
  more:     (p) => <P {...p}><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></P>,
  x:        (p) => <P {...p}><path d="M6 6l12 12M18 6 6 18" /></P>,
  plus:     (p) => <P {...p}><path d="M12 5v14M5 12h14" /></P>,
  chevron:  (p) => <P {...p}><path d="m9 6 6 6-6 6" /></P>,
  collapse: (p) => <P {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9 4.5v15M15 10l-2 2 2 2" /></P>,
  upload:   (p) => <P {...p}><path d="M12 15V4.5M7.5 9 12 4.5 16.5 9" /><path d="M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15" /></P>,
  download: (p) => <P {...p}><path d="M12 4.5V15M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 15v3.5a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V15" /></P>,
  pin:      (p) => <P {...p}><path d="M12 20.5s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" /><circle cx="12" cy="10.5" r="2.2" /></P>,
  clock:    (p) => <P {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></P>,
  phone:    (p) => <P {...p}><path d="M6.5 4h3l1.5 4-2 1.2a10 10 0 0 0 5.8 5.8l1.2-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 5 5.6 1.5 1.5 0 0 1 6.5 4Z" /></P>,
  alert:    (p) => <P {...p}><path d="M12 4 21 19.5H3Z" /><path d="M12 10v4.5M12 17.2v.3" /></P>,
  refresh:  (p) => <P {...p}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4h-4" /></P>,
  pound:    (p) => <P {...p}><path d="M16 6.5a3.5 3.5 0 0 0-6.5 1.8V17a3 3 0 0 1-2 2.5H17" /><path d="M7 12.5h7" /></P>,
  tag:      (p) => <P {...p}><path d="M4 4h7l9 9-7 7-9-9Z" /><circle cx="8" cy="8" r="1.3" /></P>,
  pulse:    (p) => <P {...p}><path d="M3 12h4l2-5 4 10 2-5h6" /></P>,
};
