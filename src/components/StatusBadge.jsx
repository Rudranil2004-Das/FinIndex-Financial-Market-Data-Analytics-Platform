const TONES = {
  completed: "bg-up/15 text-up",
  completed_with_errors: "bg-warn/15 text-warn",
  failed: "bg-down/15 text-down",
  processing: "bg-accent/15 text-accent",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[status] || TONES.processing}`}>
      {status?.replaceAll("_", " ")}
    </span>
  );
}
