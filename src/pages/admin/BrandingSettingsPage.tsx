import { PageContainer } from "@/components/layout/PageContainer";
import { BrandingSettingsPanel } from "@/components/branding/BrandingSettingsPanel";

export default function BrandingSettingsPage() {
  return (
    <PageContainer title="Branding" description="Personaliza tu academia en segundos">
      <BrandingSettingsPanel />
    </PageContainer>
  );
}
