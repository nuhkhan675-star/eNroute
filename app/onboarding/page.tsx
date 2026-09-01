import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurricula, getProgramCategories } from "@/lib/db/reference";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const [curricula, categories] = await Promise.all([getCurricula(), getProgramCategories()]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <OnboardingWizard curricula={curricula} categories={categories} />
    </div>
  );
}
