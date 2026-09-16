/* Iconos SVG inline estilo Lucide. Se renderizan con `currentColor`
   para adaptarse al tema claro/oscuro sin estilos extra. */

function svgProps(className) {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
}

export function IconPlus({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}

export function IconClose({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function IconSearch({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export function IconCalendar({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function IconPhone({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function IconMail({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export function IconMapPin({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconEdit({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M17 3a2.85 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export function IconTrash({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M3 6h18M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconChevronDown({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconSort({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
    </svg>
  );
}

export function IconArrowUp({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function IconArrowDown({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

export function IconCheck({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconWarning({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function IconBuilding({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}

export function IconInfo({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

export function IconUser({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconLogOut({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

export function IconSettings({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconBookOpen({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export function IconMoon({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function IconDatabase({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}

export function IconClipboard({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

export function IconPackage({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.3 7 12 12l8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

export function IconSave({ className = "" }) {
  return (
    <svg {...svgProps(className)}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}