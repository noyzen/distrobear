import React from 'react';

// This data should ideally come from a more robust source, but for this component, it's co-located.
// The icon property uses Unicode Private Use Area characters, assuming the custom font is mapped to these.
const distroMap = [
  { key: 'ubuntu', name: 'Ubuntu', icon: '\u{e900}', color: '#E95420' },
  { key: 'fedora', name: 'Fedora', icon: '\u{e901}', color: '#294172' },
  { key: 'debian', name: 'Debian', icon: '\u{e902}', color: '#A80030' },
  { key: 'arch', name: 'Arch Linux', icon: '\u{e903}', color: '#1793D1' },
  { key: 'centos', name: 'CentOS', icon: '\u{e904}', color: '#214097' },
  { key: 'almalinux', name: 'AlmaLinux', icon: '\u{e905}', color: '#00AEEF' },
  { key: 'rockylinux', name: 'Rocky Linux', icon: '\u{e906}', color: '#10B981' },
  { key: 'opensuse', name: 'openSUSE', icon: '\u{e907}', color: '#73BA25' },
  { key: 'alpine', name: 'Alpine', icon: '\u{e908}', color: '#0D5983' },
  { key: 'redhat', name: 'Red Hat', icon: '\u{e909}', color: '#EE0000' },
  { key: 'rhel', name: 'Red Hat', icon: '\u{e909}', color: '#EE0000' },
  { key: 'ubi', name: 'Red Hat', icon: '\u{e909}', color: '#EE0000' },
  { key: 'amazon', name: 'Amazon Linux', icon: '\u{e90a}', color: '#FF9900' },
  { key: 'wolfi', name: 'Wolfi', icon: '\u{e90b}', color: '#4F46E5' },
  { key: 'bazzite', name: 'Bazzite', icon: '\u{e903}', color: '#1793D1' }, // Arch based, reuse icon
  { key: 'bluefin', name: 'Bluefin', icon: '\u{e90c}', color: '#3B82F6' },
  { key: 'ublue', name: 'Ublue', icon: '\u{e90c}', color: '#3B82F6' },
];

const genericDistro = { key: 'unknown', name: 'Generic Distro', icon: '\u{e90d}', color: '#9CA3AF' };

const getDistroInfo = (imageName: string) => {
  if (!imageName) return genericDistro;
  const lowerImageName = imageName.toLowerCase();
  const found = distroMap.find(distro => lowerImageName.includes(distro.key));
  return found || genericDistro;
};

const DistroLogo: React.FC<{ imageName: string; className?: string }> = ({ imageName, className }) => {
  const distro = getDistroInfo(imageName);
  return (
    <span
      className={`font-['DistroLogos'] ${className}`}
      style={{ color: distro.color }}
      aria-label={distro.name}
      title={distro.name}
    >
      {distro.icon}
    </span>
  );
};

export default DistroLogo;
