import { redirect } from "next/navigation";

/** There is no marketing page. Entry is a works gate: the first question is
 *  who is arriving, and everything else follows from the answer. */
export default function Home() {
  redirect("/signin");
}
