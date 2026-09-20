import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { isSignupDisabled } from "@/lib/signup";

// Rendered per request, not at build time: DISABLE_SIGNUP is read from the
// container environment and must not be frozen into a prerendered page.
export const dynamic = "force-dynamic";

export default function SignupPage() {
  if (isSignupDisabled()) redirect("/login");
  return <SignupForm />;
}
