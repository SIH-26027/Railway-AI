import type { Metadata } from 'next';
import './globals.css';
import { PlanningProvider } from '../context/PlanningContext';
import { LanguageProvider } from '../context/LanguageContext';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';

export const metadata: Metadata = {
  title: 'Railway AI Automatic Block Planning System – COA Dashboard',
  description: 'Control Office Application (COA) for centralized AI-assisted maintenance block scheduling, conflict analysis and operational optimization.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <LanguageProvider>
          <PlanningProvider>
            <div className="flex h-screen overflow-hidden">
              {/* Left Sidebar */}
              <Sidebar />

              {/* Main Operational Canvas */}
              <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <Header />
                <main className="flex-1 bg-slate-50">
                  {children}
                </main>
              </div>
            </div>
          </PlanningProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
