import { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Content Manager',
  description: 'Database content management system',
};

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex">
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      <Toaster />
    </div>
  );
} 