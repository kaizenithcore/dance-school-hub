import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { ValuePillars } from "@/components/landing/ValuePillars";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { Results } from "@/components/landing/Results";
import { DecisionCompare } from "@/components/landing/DecisionCompare";
import { Pricing } from "@/components/landing/Pricing";
import { ExamSuit } from "@/components/landing/ExamSuit";
import { WebService } from "@/components/landing/WebService";
import { Credibility } from "@/components/landing/Credibility";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Index = () => (
  <div className="min-h-screen bg-background text-foreground">
    <LandingHeader />
    <Hero />
    <ValuePillars />
    <ProductShowcase />
    <Results />
    <DecisionCompare />
    <div id="pricing">
      <Pricing />
    </div>
    <div id="examsuit">
      <ExamSuit />
    </div>
    <div id="web-service">
      <WebService />
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
