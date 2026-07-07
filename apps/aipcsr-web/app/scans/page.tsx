import { Metadata } from 'next';
import { ScansPage } from '../../features/scans/ScansPage';

export const metadata: Metadata = {
  title: 'Scans',
  description: 'View and manage security scans across your codebase.',
};

export default function Scans() {
  return <ScansPage />;
}
