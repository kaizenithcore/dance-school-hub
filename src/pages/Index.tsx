import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { ValuePillars } from "@/components/landing/ValuePillars";
import { Results } from "@/components/landing/Results";
import { DecisionCompare } from "@/components/landing/DecisionCompare";
import { Pricing } from "@/components/landing/Pricing";
import { WebService } from "@/components/landing/WebService";
import { WeydiCreativeServices } from "@/components/landing/WeydiCreativeServices";
import { Credibility } from "@/components/landing/Credibility";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Index = () => (
  <div className="min-h-screen bg-background text-foreground">
    <LandingHeader />
    <Hero />
    <ValuePillars />
    <Results />
    <DecisionCompare />
    <div id="pricing">
      <Pricing />
    </div>
    <div id="web-service">
      <WebService />
    </div>
    <div id="branding-service">
      <WeydiCreativeServices />
    </div>
    <Credibility />
    <div id="faq">
      <FAQ />
    </div>
    <CTA />
    <LandingFooter />
  </div>
);

export default Index;
