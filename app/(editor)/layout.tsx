import { Navbar } from '@/components/Navbar';
import { HoverTips } from '@/components/HoverTips';

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <HoverTips />
      <div className="pt-10">{children}</div>
    </div>
  );
}
