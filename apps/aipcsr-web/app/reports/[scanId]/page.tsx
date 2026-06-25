import { ReportPage } from '../../../features/reports/[scanId]/ReportPage';

export default function Report({ params }: { params: { scanId: string } }) {
  return <ReportPage scanId={params.scanId} />;
}
