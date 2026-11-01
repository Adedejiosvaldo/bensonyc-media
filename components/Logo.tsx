import Image from 'next/image';

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <Image src="/logo.png" alt="MFM Benson Youth Church" width={size} height={size} className={`rounded-full ${className}`} priority />;
}
