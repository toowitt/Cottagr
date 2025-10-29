
import { notFound } from "next/navigation";
import MarketingSection from "@/components/marketing/MarketingSection";
import SupportFooter from "@/components/SupportFooter";
import { prisma } from "@/lib/prisma";
import AvailabilityCalendar from "./AvailabilityCalendar";

interface PropertyPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = await prisma.property.findUnique({
    where: { slug },
  });

  if (!property) {
    notFound();
  }

  const nightlyRate = property.nightlyRate ? `$${(property.nightlyRate / 100).toFixed(2)}` : "Not specified";
  const cleaningFee =
    property.cleaningFee && property.cleaningFee > 0 ? `$${(property.cleaningFee / 100).toFixed(2)}` : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingSection withDivider={false} containerClassName="max-w-5xl">
        <div className="space-y-6 text-center">
          <div className="mx-auto h-48 w-full max-w-3xl rounded-3xl border border-border/50 bg-gradient-to-br from-slate-200 via-slate-100 to-white shadow-soft">
            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
              Property imagery coming soon
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{property.name}</h1>
            {property.location ? (
              <p className="text-base text-muted-foreground">{property.location}</p>
            ) : null}
          </div>
        </div>
      </MarketingSection>

      <MarketingSection containerClassName="max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          <section className="space-y-6 rounded-3xl border border-border/60 bg-surface p-6 shadow-soft">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Property details</h2>
              <p className="text-sm text-muted-foreground">
                The essentials owners and guests usually ask before they pack a bag.
              </p>
            </div>

            <dl className="grid gap-4 text-sm text-foreground sm:grid-cols-2">
              <PropertyFact label="Bedrooms" value={property.beds ?? "Not specified"} />
              <PropertyFact label="Bathrooms" value={property.baths ?? "Not specified"} />
              <PropertyFact label="Nightly rate" value={nightlyRate} />
              <PropertyFact label="Minimum nights" value={property.minNights ?? "Not specified"} />
              <PropertyFact label="Cleaning fee" value={cleaningFee ?? "Included"} />
            </dl>

            {property.description ? (
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-foreground">Description</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{property.description}</p>
              </div>
            ) : null}
          </section>

          <section className="space-y-4 rounded-3xl border border-border/60 bg-surface p-6 shadow-soft">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Check availability</h2>
              <p className="text-sm text-muted-foreground">
                Explore open nights, pending requests, and confirmed bookings in real time.
              </p>
            </div>
            <AvailabilityCalendar propertyId={property.id} />
          </section>
        </div>
      </MarketingSection>

      <SupportFooter className="bg-background text-foreground" />
    </div>
  );
}

function PropertyFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface-elevated/80 px-4 py-3 shadow-soft">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
