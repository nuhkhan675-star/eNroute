import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurricula, getProgramCategories } from "@/lib/db/reference";
import { getExistingOnboardingDraft } from "@/lib/db/onboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const [curricula, categories, existingDraft] = await Promise.all([
    getCurricula(),
    getProgramCategories(),
    getExistingOnboardingDraft(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <OnboardingWizard curricula={curricula} categories={categories} existingDraft={existingDraft} />
    </div>
  );
}
