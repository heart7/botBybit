/**
 * Placeholder tab screens for features delivered in later build steps:
 * Home (§4.2), Scan (Step 6), Records (Step 9). The Pets and Account tabs are real.
 */
import { ComingSoon } from '@/components/ComingSoon';

export function HomeScreen() {
  return (
    <ComingSoon
      title="Home"
      message="Your pet's daily summary, health score, and quick scan will appear here. For now, open the Pets tab."
    />
  );
}

export function ScanScreen() {
  return (
    <ComingSoon
      title="New Scan"
      message="Photo + symptom triage arrives in a later step. AI output will be guidance, never a diagnosis."
    />
  );
}

export function RecordsScreen() {
  return (
    <ComingSoon
      title="Records"
      message="Reminders, health records, and AI reports will live here in a later step."
    />
  );
}
