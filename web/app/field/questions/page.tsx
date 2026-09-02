import { CheckCircle } from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/Control";
import { getMyQuestions } from "@/lib/data";
import { AnswerInline } from "@/components/field/AnswerInline";
import { dayTime } from "@/lib/format";

export const metadata = { title: "Questions for you - TRACE" };

/**
 * S8. Should almost always be empty, and the design should make that feel
 * normal rather than broken.
 *
 * Asking a supervisor a question is the only planner action allowed to
 * interrupt them. There are four permitted notifications in the whole product
 * and this is one of them; a field app that buzzes gets muted, and a muted app
 * is dead.
 *
 * "Not sure" is a first class answer. It closes the loop honestly instead of
 * pushing the supervisor to guess, and a guess entered as fact is worse for
 * the schedule than an admitted unknown.
 */
export default async function QuestionsPage() {
  const questions = await getMyQuestions();
  const open = questions.filter((q) => !q.answer);
  const answered = questions.filter((q) => q.answer);

  return (
    <div className="px-4 py-4">
      <h1 className="mb-1 px-1 text-[length:var(--text-figure)] leading-tight text-ink">
        Questions for you
      </h1>
      <p className="mb-4 px-1 text-[length:var(--text-body)] text-ink-mid">
        The planner only asks when nobody else can answer.
      </p>

      {open.length === 0 && (
        <Card className="px-5 py-10 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--radius-pill)] bg-ok-wash">
            <CheckCircle size={26} weight="fill" className="text-ok" aria-hidden />
          </div>
          <p className="mt-4 text-[length:var(--text-title)] text-ink">Nothing to answer</p>
          <p className="mx-auto mt-2 max-w-[36ch] text-[length:var(--text-body)] text-ink-mid">
            This screen is usually empty. That is the intended state, not a fault.
          </p>
        </Card>
      )}

      <ul className="flex flex-col gap-3">
        {[...open, ...answered].map((q) => (
          <li key={q.id}>
            <Card className="p-4">
              <div className="text-[length:var(--text-body)] text-ink-mid">
                About {q.activityDescription}
              </div>
              <h2 className="mt-2 text-[length:var(--text-lead)] leading-snug text-ink">
                {q.question}
              </h2>
              <p className="mt-2 text-[length:var(--text-body)] text-ink-meta">
                You said: &ldquo;{q.originalPhrase}&rdquo;
              </p>

              {q.answer ? (
                <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-control)] border border-ok/40 bg-ok-wash px-3 py-3">
                  <CheckCircle size={20} weight="fill" className="text-ok" aria-hidden />
                  <span className="text-[length:var(--text-title)] text-ink">
                    You answered {q.answer}
                  </span>
                  <span className="ml-auto font-mono text-[length:var(--text-data)] text-ink-meta tnum">
                    {dayTime(q.answeredAt)}
                  </span>
                </div>
              ) : q.options ? (
                <AnswerInline options={q.options} />
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
