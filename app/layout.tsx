import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TARUSHIRU Journal',
  description: 'A private life-career journal app with AI analysis for self-reflection, asset tracking, and career planning.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23102a43' rx='20'/><path d='M50 15C30 15 15 30 15 50C15 70 30 85 50 85C70 85 85 70 85 50C85 35 75 20 60 15' fill='none' stroke='white' stroke-width='8' stroke-linecap='round' opacity='0.9'/><text x='50' y='55' font-family='sans-serif' font-size='40' font-weight='bold' fill='white' text-anchor='middle'>T</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
