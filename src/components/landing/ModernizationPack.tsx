import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { commercialCatalog, formatAnnualFinancingLabel, formatEuro, getInterestFreeInstallment } from "@/lib/commercialCatalog";
import { SharedDemoCta } from "@/components/landing/SharedDemoCta";

interface ModernizationBundleCatalog {
  label?: string;
  description?: string;
  renewalPolicy?: string;
  pricing?: { note?: string };
  launchOffer?: {
    note?: string;
    discountPercent?: number;
  };
}

interface CreativeServicesCatalog {
  provider?: string;
}

interface IntegratedWebsiteCatalog {
  label?: string;
  shortDescription?: string;
  bundlePriceEur?: number;
  pricingByPlanEur?: {
    pro?: number;
  };
}

interface ModernizationServiceCatalog {
  pricingByPlanEur?: {
    pro?: number;
  };
}

interface CreativeServicesExtendedCatalog {
  services?: {
    identityReview?: {
      pricingEur?: number;
    };
  };
}

interface ExamSuitBenefitsCatalog {
  associatedSchoolsBenefits?: {
    benefits?: string[];
  };
}

const bundleCatalog = (commercialCatalog.bundles as Record<string, ModernizationBundleCatalog> | undefined)?.modernizationProBundle;
const creativeServices = (commercialCatalog as unknown as { creativeServices?: CreativeServicesExtendedCatalog & CreativeServicesCatalog }).creativeServices;
const integratedWebsite = (commercialCatalog.professionalServices as Record<string, IntegratedWebsiteCatalog> | undefined)?.integratedWebsite;
const modernizationService = (commercialCatalog.professionalServices as Record<string, ModernizationServiceCatalog> | undefined)?.modernizationPack;
const proAnnualTotal = commercialCatalog.plans.pro.billing.annualTotalEur;
const oneTimePackPayment = integratedWebsite?.bundlePriceEur ?? integratedWebsite?.pricingByPlanEur?.pro ?? 0;
const firstYearTotal = proAnnualTotal + oneTimePackPayment;
const separateServicesTotal =
  proAnnualTotal
  + (modernizationService?.pricingByPlanEur?.pro ?? 0)
  + (integratedWebsite?.pricingByPlanEur?.pro ?? 0)
  + (creativeServices?.services?.identityReview?.pricingEur ?? 0);
const savingsVsSeparate = Math.max(0, separateServicesTotal - firstYearTotal);
const foundersDiscountPercent = bundleCatalog?.launchOffer?.discountPercent ?? 0;
const foundersFirstYearTotal = foundersDiscountPercent > 0
  ? Math.round(firstYearTotal * (1 - foundersDiscountPercent / 100))
  : null;

const associatedBenefits = ((commercialCatalog.examSuit as unknown as ExamSuitBenefitsCatalog | undefined)
  ?.associatedSchoolsBenefits
  ?.benefits) ?? [];
const associatedBenefitMatch = associatedBenefits
  .map((benefit) => benefit.match(/(\d+)\s*%/))
  .find((match) => match?.[1]);
const associatedDiscountPercent = associatedBenefitMatch?.[1] ? Number(associatedBenefitMatch[1]) : 0;
const associatedProAnnualTotal = associatedDiscountPercent > 0
  ? Math.round(proAnnualTotal * (1 - associatedDiscountPercent / 100))
  : null;
const associatedFirstYearTotal = associatedProAnnualTotal !== null
  ? oneTimePackPayment + associatedProAnnualTotal
  : null;
const PRO_ANNUAL_CTA_HREF = "/auth/register?plan=pro&billing=annual&focus=integrated-web&trial=14d&source=modernization_pack";
const customDomainAnnual = commercialCatalog.subscriptionAddons.customDomain.monthlyPriceEur * 12;
const prioritySupportAnnual = commercialCatalog.subscriptionAddons.prioritySupport.monthlyPriceEur * 12;
const proAnnualFinancingLabel = formatAnnualFinancingLabel(proAnnualTotal);
const customDomainFinancing6 = getInterestFreeInstallment(customDomainAnnual, 6);
const prioritySupportFinancing6 = getInterestFreeInstallment(prioritySupportAnnual, 6);

const bundleIncludes = [
  { label: "Nexa Pro anual", desc: "Sistema de gestión + captación para operar y crecer sin fricción" },
  { label: "Implementación completa", desc: "Activación, configuración y puesta en marcha con acompañamiento" },
  {
    label: integratedWebsite?.label || "Web optimizada",
    desc: "Sin coste inicial dentro del pack anual",
  },
  { label: "Revisión de identidad visual", desc: `Por ${creativeServices?.provider || "Weydi"}: análisis y mejora de tu imagen de marca` },
];

const advantages = [
  "Todo listo en semanas, no meses",
  "Incluye software anual + web integrada + modernización",
  "Un solo interlocutor para todo el proceso",
  "Descuento de lanzamiento aplicado al pack anual",
];

export function ModernizationPack() {
  const [includeCustomDomain, setIncludeCustomDomain] = useState(false);
  const [includePrioritySupport, setIncludePrioritySupport] = useState(false);

  const selectedAddonsAnnual =
    (includeCustomDomain ? customDomainAnnual : 0)
    + (includePrioritySupport ? prioritySupportAnnual : 0);

  const estimatedFirstYearTotal = firstYearTotal + selectedAddonsAnnual;
  const foundersEstimatedFirstYearTotal = foundersFirstYearTotal !== null
    ? foundersFirstYearTotal + selectedAddonsAnnual
    : null;
  const associatedEstimatedFirstYearTotal = associatedFirstYearTotal !== null
    ? associatedFirstYearTotal + selectedAddonsAnnual
    : null;

  return (
    <section id="modernization-bundle" className="py-20 sm:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border-2 border-primary/30 bg-card max-w-5xl mx-auto"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20" />

          {/* Badge */}
          <div className="relative flex justify-center -mt-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg">
              <Sparkles className="h-4 w-4" />
              Oferta recomendada
            </span>
          </div>

          <div className="relative p-8 sm:p-12">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-4">
                <Package className="h-6 w-6 text-primary" />
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                  Todo tu sistema + tu web optimizada desde el inicio
                </h2>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {bundleCatalog?.description || "Empiezas con sistema + captación funcionando desde el primer mes."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* What's included */}
              <div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-5">
                  Qué incluye el pack
                </h3>
                <ul className="space-y-4">
                  {bundleIncludes.map((item) => (
                    <li key={item.label} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing & CTA */}
              <div className="flex flex-col justify-center">
                <div className="rounded-2xl border border-primary/20 bg-background p-6 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Pack estrella primer año</p>
                  <div className="space-y-3 text-left rounded-lg border border-border bg-card/70 p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Pago único del pack</p>
                      <p className="text-2xl font-bold text-foreground">{formatEuro(oneTimePackPayment)}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">+ Plan Pro anual financiado: {proAnnualFinancingLabel}</p>
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground">Primer año estimado</p>
                      <p className="text-xl font-bold text-primary">{formatEuro(estimatedFirstYearTotal)}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-border bg-card/70 p-4 text-left">
                    <p className="text-xs font-semibold text-foreground">Añadir add-ons (facturación anual)</p>
                    <label className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={includeCustomDomain}
                          onChange={(event) => setIncludeCustomDomain(event.target.checked)}
                        />
                        Dominio personalizado
                      </span>
                      <span className="font-medium text-foreground">+{formatEuro(customDomainFinancing6)}/mes x 6</span>
                    </label>
                    <label className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={includePrioritySupport}
                          onChange={(event) => setIncludePrioritySupport(event.target.checked)}
                        />
                        Soporte prioritario
                      </span>
                      <span className="font-medium text-foreground">+{formatEuro(prioritySupportFinancing6)}/mes x 6</span>
                    </label>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Incremento financiado seleccionado (6 cuotas): <span className="font-semibold text-foreground">{formatEuro(getInterestFreeInstallment(selectedAddonsAnnual, 6))}/mes</span>
                    </p>
                  </div>

                  {foundersEstimatedFirstYearTotal !== null && (
                    <div className="mt-3 rounded-lg border border-success/30 bg-success/10 p-3 text-left">
                      <p className="text-xs font-semibold text-success">FOUNDERS ({foundersDiscountPercent}% dto.)</p>
                      <p className="text-sm text-muted-foreground">Primer año con descuento</p>
                      <p className="text-lg font-bold text-foreground">{formatEuro(foundersEstimatedFirstYearTotal)}</p>
                      <p className="text-xs text-success">Ahorra {formatEuro(estimatedFirstYearTotal - foundersEstimatedFirstYearTotal)}</p>
                    </div>
                  )}

                  {associatedEstimatedFirstYearTotal !== null && (
                    <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-left">
                      <p className="text-xs font-semibold text-primary">Asociadas Certifier ({associatedDiscountPercent}% en Pro anual)</p>
                      <p className="text-sm text-muted-foreground">Primer año con descuento asociado</p>
                      <p className="text-lg font-bold text-foreground">{formatEuro(associatedEstimatedFirstYearTotal)}</p>
                      <p className="text-xs text-success">Ahorra {formatEuro(estimatedFirstYearTotal - associatedEstimatedFirstYearTotal)}</p>
                    </div>
                  )}

                  {savingsVsSeparate > 0 && (
                    <p className="mt-3 text-xs text-success font-medium">
                      Ahorra {formatEuro(savingsVsSeparate)} frente a contratar servicios por separado
                    </p>
                  )}
                  {bundleCatalog?.renewalPolicy && (
                    <p className="mt-2 text-xs text-muted-foreground">{bundleCatalog.renewalPolicy}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {bundleCatalog?.launchOffer?.note || bundleCatalog?.pricing?.note || "Pack comercial recomendado"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Con solo 10-15 alumnos al mes puedes cubrir el coste de este pack y crecer con menos fricción.
                  </p>
                </div>

                <ul className="mt-5 space-y-2">
                  {advantages.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-success shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>

                <p className="mt-4 text-xs text-muted-foreground text-center">
                  Empiezas con sistema + captación funcionando desde el primer mes.
                </p>

                <div className="mt-6 flex flex-col gap-2">
                  <Button size="lg" className="h-12 rounded-xl text-base font-semibold shadow-md hover:shadow-lg" asChild>
                    <Link to={PRO_ANNUAL_CTA_HREF}>
                      Activar con cuota mensual
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <SharedDemoCta
                    section="modernization_pack"
                    subject="Consulta Pack Modernizacion Pro"
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
