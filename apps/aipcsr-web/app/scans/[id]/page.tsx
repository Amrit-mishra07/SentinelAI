import ScanDetailPage from '@/features/scans/detail/page';

export default function Page({ params }: { params: { id: string } }) {
  return <ScanDetailPage params={params} />;
}
