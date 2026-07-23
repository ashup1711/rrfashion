import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import QuickViewModal from '../common/QuickViewModal';
import CompareDrawer from '../common/CompareDrawer';
import MobileBottomNav from '../common/MobileBottomNav';
import WhatsAppButton from '../common/WhatsAppButton';
import MiniCart from '../common/MiniCart';
import AnnouncementBar from './AnnouncementBar';
import PWAInstallPrompt from '../common/PWAInstallPrompt';
import ExitIntentPopup from '../common/ExitIntentPopup';
import SaleCountdownBanner from '../common/SaleCountdownBanner';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      <AnnouncementBar />
      <SaleCountdownBanner />
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer />
      <QuickViewModal />
      <CompareDrawer />
      <MobileBottomNav />
      <WhatsAppButton />
      <MiniCart />
      <PWAInstallPrompt />
      <ExitIntentPopup />
    </div>
  );
};

export default Layout;
