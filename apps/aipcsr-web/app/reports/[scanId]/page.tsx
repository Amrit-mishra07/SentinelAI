import { ReportPage } from '../../../features/reports/[scanId]/ReportPage';

export default async function Report({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  return <ReportPage scanId={scanId} />;
}
