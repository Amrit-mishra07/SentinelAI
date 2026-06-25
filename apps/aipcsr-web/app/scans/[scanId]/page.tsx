import { ScanDetailPage } from '../../../features/scans/[scanId]/ScanDetailPage';

export default function ScanDetail({ params }: { params: { scanId: string } }) {
  return <ScanDetailPage scanId={params.scanId} />;
}
