import ReportDetailPage from '@/features/reports/detail/page';

export default function Page({ params }: { params: { scanId: string } }) {
  return <ReportDetailPage params={params} />;
}
