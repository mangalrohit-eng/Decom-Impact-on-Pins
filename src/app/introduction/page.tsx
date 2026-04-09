import { redirect } from "next/navigation";

/** Product overview is consolidated into the home page. */
export default function IntroductionRedirectPage() {
  redirect("/");
}
