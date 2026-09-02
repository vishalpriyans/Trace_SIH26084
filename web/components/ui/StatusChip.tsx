import { STATUS, type Status } from "@/lib/status";
import { Tag } from "./Tag";

/**
 * The six statuses, and only ever these six.
 *
 * Which wording appears depends on the surface. A planner reads "Needs
 * review"; the supervisor who sent that same entry reads "Sent", because they
 * are not told it is uncertain and are not asked to fix it. That is the
 * planner's job, not theirs, and the two labels are two lenses on one row
 * rather than two different states.
 */
export function StatusChip({
  status,
  surface = "web",
  className = "",
}: {
  status: Status;
  surface?: "web" | "field";
  className?: string;
}) {
  const s = STATUS[status];
  return (
    <Tag
      tone={s.tone}
      dot
      size={surface === "field" ? "md" : "sm"}
      title={s.meaning}
      className={className}
    >
      {surface === "field" ? s.field : s.web}
    </Tag>
  );
}
