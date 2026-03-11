import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Problems } from "@/components/landing/Problems";
import { Solution } from "@/components/landing/Solution";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Guides } from "@/components/landing/Guides";
import { Pricing } from "@/components/landing/Pricing";
import { Credibility } from "@/components/landing/Credibility";
import { ROI } from "@/components/landing/ROI";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Index = () => (
  <div className="min-h-screen bg-background text-foreground">
    <LandingHeader />
    <Hero />
    <Problems />
    <Solution />
    <HowItWorks />
    <div id="features">
      <Features />
    </div>
    <Guides />
    <div id="credibility">
      <Credibility />
    </div>
    <div id="pricing">
      <Pricing />
    </div>
    <ROI />
    <div id="faq">
      <FAQ />
    </div>
    <CTA />
    <LandingFooter />
  </div>
);

export default Index;
