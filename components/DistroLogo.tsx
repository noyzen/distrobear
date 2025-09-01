import React from 'react';

// --- SVG Icon Components ---
// Using a 24x24 viewBox for consistency and currentColor for styling.

const UbuntuLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="6" r="2.5" />
    <path d="M5.5 16.5 A 7 7 0 0 1 18.5 16.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M8 20 A 4 4 0 0 1 16 20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

const FedoraLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm5 12h-3v4h-2v-4h-3v-2h3V8a3 3 0 013-3h2v2h-2a1 1 0 00-1 1v3h3z"/>
  </svg>
);

const DebianLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 2A10 10 0 0 0 5.17 19.3c.6-1.5 1-3.2 1.1-5.3H9v2H7.2c-.1 1.6-.4 3.2-1 4.5A8 8 0 0 1 12 4a8 8 0 0 1 7.1 4.4c-.4-2.8-2.6-5-5.1-5s-4.7 2.2-5.1 5c.4 2.8 2.6 5 5.1 5s4.7-2.2 5.1-5c.4 2.8 2.6 5 5.1 5a5.1 5.1 0 0 0 4.2-2.2A10 10 0 0 0 12 2z"/>
  </svg>
);

const ArchLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 2L3.5 18h3L12 7l5.5 11h3L12 2z"/>
  </svg>
);

const CentOSLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 2l-10 4v10l10 4 10-4V6L12 2zm0 2.24L19.76 8 12 11.76 4.24 8 12 4.24zM3 7.43V17.1L11 21v-9.67L3 7.43zm18 0L13 11.33V21l8-3.9V7.43z" />
  </svg>
);

const AlmaLinuxLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const RockyLinuxLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M4 19h16L12 5zM8 19l4-7 4 7h-8z"/>
  </svg>
);

const OpenSUSELogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-2 5a2 2 0 110 4 2 2 0 010-4zm4 4c-2 0-3 2-3 2s1 2 3 2 3-2 3-2-1-2-3-2zM6 15c2-2 4-2 6 0 2 2 2 4 0 6s-4 2-6 0-2-4 0-6z"/>
  </svg>
);

const AlpineLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M4 19h16L12 5zM8.2 19l3.8-7 3.8 7h-7.6z"/>
  </svg>
);

const RedHatLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M18.8 11.6C18.8 8.4 16.4 5.2 12 5.2c-2.3 0-4.3 1-5.8 2.5L12 16.4l6.8-4.8z"/>
    <path d="M4 12c0 4.4 3.6 8 8 8s8-3.6 8-8h-3c0 2.8-2.2 5-5 5s-5-2.2-5-5H4z"/>
  </svg>
);

const AmazonLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 4a8 8 0 00-8 8c0 2.2.9 4.2 2.3 5.7L12 11l5.7 6.7C19.1 16.2 20 14.2 20 12a8 8 0 00-8-8z"/>
    <path d="M15.5 18c-1.1.7-2.4 1-3.5 1s-2.4-.3-3.5-1c-.4-.3-.9-.1-1.1.3l-.5.9c-.2.4 0 .9.4 1.1C8.8 20.5 10.4 21 12 21s3.2-.5 4.8-1.7c.4-.2.5-.7.4-1.1l-.5-.9c-.2-.4-.7-.5-1.1-.3z"/>
  </svg>
);

const WolfiLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 2L2 9l3 11h14l3-11L12 2zm0 2.5l5.5 4.5-1.5 5H8l-1.5-5L12 4.5z"/>
  </svg>
);

const UblueLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M2 12c0 5.5 4.5 10 10 10s10-4.5 10-10c0-1.8-.5-3.5-1.3-5-2.2 2.2-5.3 3.5-8.7 3.5s-6.5-1.3-8.7-3.5C2.5 8.5 2 10.2 2 12z"/>
  </svg>
);

const GenericLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);


// --- Data Mapping ---

const distroMap: { key: string, name: string, LogoComponent: React.FC<React.SVGProps<SVGSVGElement>>, color: string }[] = [
  { key: 'ubuntu', name: 'Ubuntu', LogoComponent: UbuntuLogo, color: '#E95420' },
  { key: 'fedora', name: 'Fedora', LogoComponent: FedoraLogo, color: '#294172' },
  { key: 'debian', name: 'Debian', LogoComponent: DebianLogo, color: '#A80030' },
  { key: 'arch', name: 'Arch Linux', LogoComponent: ArchLogo, color: '#1793D1' },
  { key: 'centos', name: 'CentOS', LogoComponent: CentOSLogo, color: '#214097' },
  { key: 'almalinux', name: 'AlmaLinux', LogoComponent: AlmaLinuxLogo, color: '#00AEEF' },
  { key: 'rockylinux', name: 'Rocky Linux', LogoComponent: RockyLinuxLogo, color: '#10B981' },
  { key: 'opensuse', name: 'openSUSE', LogoComponent: OpenSUSELogo, color: '#73BA25' },
  { key: 'alpine', name: 'Alpine', LogoComponent: AlpineLogo, color: '#0D5983' },
  { key: 'redhat', name: 'Red Hat', LogoComponent: RedHatLogo, color: '#EE0000' },
  { key: 'rhel', name: 'Red Hat', LogoComponent: RedHatLogo, color: '#EE0000' },
  { key: 'ubi', name: 'Red Hat', LogoComponent: RedHatLogo, color: '#EE0000' },
  { key: 'amazon', name: 'Amazon Linux', LogoComponent: AmazonLogo, color: '#FF9900' },
  { key: 'wolfi', name: 'Wolfi', LogoComponent: WolfiLogo, color: '#4F46E5' },
  { key: 'bazzite', name: 'Bazzite', LogoComponent: ArchLogo, color: '#1793D1' },
  { key: 'bluefin', name: 'Bluefin', LogoComponent: UblueLogo, color: '#3B82F6' },
  { key: 'ublue', name: 'Ublue', LogoComponent: UblueLogo, color: '#3B82F6' },
];

const genericDistro = { key: 'unknown', name: 'Generic Distro', LogoComponent: GenericLogo, color: '#9CA3AF' };


// --- Helper Function ---

const getDistroInfo = (imageName: string) => {
  if (!imageName) return genericDistro;
  const lowerImageName = imageName.toLowerCase();
  const found = distroMap.find(distro => lowerImageName.includes(distro.key));
  return found || genericDistro;
};


// --- Main Component ---

const DistroLogo: React.FC<{ imageName: string; className?: string }> = ({ imageName, className }) => {
  const { name, LogoComponent, color } = getDistroInfo(imageName);
  
  return (
    <LogoComponent
      className={className}
      style={{ color }}
      aria-label={name}
      fill="currentColor"
    >
      <title>{name}</title>
    </LogoComponent>
  );
};

export default DistroLogo;
