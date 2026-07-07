import { Metadata } from 'next';
import { DashboardPage } from '../../features/dashboard/DashboardPage';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View real-time security metrics, recent scans, and AI patch activity across your repositories.',
};

export default function Dashboard() {
  return <DashboardPage />;
}
