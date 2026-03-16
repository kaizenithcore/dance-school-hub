import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Problems } from "@/components/landing/Problems";
import { Solution } from "@/components/landing/Solution";
import { DigitalTransformation } from "@/components/landing/DigitalTransformation";
import { StudentPortal } from "@/components/landing/StudentPortal";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { LaunchOffer } from "@/components/landing/LaunchOffer";
import { ROI } from "@/components/landing/ROI";
import { Results } from "@/components/landing/Results";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Index = () => (
  <div className="min-h-screen bg-background text-foreground">
    <LandingHeader />
    <Hero />
    <Problems />
    <div id="solution">
      <Solution />
    </div>
    <DigitalTransformation />
    <div id="student-portal">
      <StudentPortal />
    </div>
    <HowItWorks />
    <div id="features">
      <Features />
    </div>
    <div id="pricing">
      <Pricing />
    </div>
    <LaunchOffer />
    <ROI />
    <Results />
    <Testimonials />
    <div id="faq">
      <FAQ />
    </div>
    <CTA />
    <LandingFooter />
  </div>
);

export default Index;
