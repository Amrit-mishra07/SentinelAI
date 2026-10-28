import { ScanDetailPage } from '../../../features/scans/[scanId]/ScanDetailPage';

export default async function ScanDetail({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  return <ScanDetailPage scanId={scanId} />;
}
