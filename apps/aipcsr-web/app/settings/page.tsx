import { SettingsPage } from '../../features/settings/SettingsPage';

export default async function Settings({ searchParams }: { searchParams: Promise<{ github?: string }> }) {
  const { github } = await searchParams;
  const callbackStatus = github && ['connected', 'failed', 'denied'].includes(github) ? github : undefined;
  return <SettingsPage callbackStatus={callbackStatus} />;
}
