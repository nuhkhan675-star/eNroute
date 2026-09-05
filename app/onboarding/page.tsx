import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurricula, getProgramCategories, getCountries } from "@/lib/db/reference";
import { getExistingOnboardingDraft, getProfileVersions } from "@/lib/db/onboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signup");

  const [curricula, categories, countries, existingDraft, profileVersions] = await Promise.all([
    getCurricula(),
    getProgramCategories(),
    getCountries(),
    getExistingOnboardingDraft(user.id),
    getProfileVersions(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <OnboardingWizard
        curricula={curricula}
        categories={categories}
        countries={countries}
        existingDraft={existingDraft}
        profileVersions={profileVersions}
      />
    </div>
  );
}
