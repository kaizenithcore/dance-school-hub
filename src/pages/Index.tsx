import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Problems } from "@/components/landing/Problems";
import { Solution } from "@/components/landing/Solution";
import { ModernizationPack } from "@/components/landing/ModernizationPack";
import { DigitalTransformation } from "@/components/landing/DigitalTransformation";
import { StudentPortal } from "@/components/landing/StudentPortal";
import { WebService } from "@/components/landing/WebService";
import { WeydiCreativeServices } from "@/components/landing/WeydiCreativeServices";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { DecisionCompare } from "@/components/landing/DecisionCompare";
import { Pricing } from "@/components/landing/Pricing";
import { LaunchOffer } from "@/components/landing/LaunchOffer";
import { ROI } from "@/components/landing/ROI";
import { Results } from "@/components/landing/Results";
import { Credibility } from "@/components/landing/Credibility";
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
    <div id="modernization">
      <ModernizationPack />
    </div>
    <DigitalTransformation />
    <div id="student-portal">
      <StudentPortal />
    </div>
    <div id="web-service">
      <WebService />
    </div>
    <WeydiCreativeServices />
    <HowItWorks />
    <div id="features">
      <Features />
    </div>
    <WhatYouGet />
    <DecisionCompare />
    <div id="pricing">
      <Pricing />
    </div>
    <LaunchOffer />
    <ROI />
    <Results />
    <Credibility />
    <div id="faq">
      <FAQ />
    </div>
    <CTA />
    <LandingFooter />
  </div>
);

export default Index;
