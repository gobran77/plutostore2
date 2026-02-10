import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <MobileSidebar />
      <main className="md:mr-64 min-h-screen transition-all duration-300 flex-1 pt-16 md:pt-0">
        {children}
      </main>
      {/* Footer */}
      <footer className="md:mr-64 py-4 px-4 md:px-6 border-t border-border bg-card/50 text-center">
        <p className="text-sm text-muted-foreground">
          تصميم بواسطة <span className="font-semibold text-foreground">جبران الانسي</span>
          <span className="mx-2">|</span>
          <a 
            href="https://wa.me/201030638992" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            +201030638992
          </a>
        </p>
      </footer>
    </div>
  );
};
