import { Navbar } from '@/components/Navbar';

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="pt-10">{children}</div>
    </div>
  );
}
