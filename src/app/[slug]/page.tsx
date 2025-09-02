
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AvailabilityCalendar from './AvailabilityCalendar';

// Helper to safely parse photos from JSON
function getPhotoUrls(photos: any): string[] {
  return Array.isArray(photos) ? (photos as string[]) : [];
}

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="w-full h-64 bg-gray-300 rounded-lg flex items-center justify-center mb-6">
            <span className="text-gray-600 text-lg">Property Image Placeholder</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4">{property.name}</h1>
          {property.location && (
            <p className="text-lg text-gray-400 mb-4">{property.location}</p>
          )}
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Property Details</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <span className="font-medium">Bedrooms:</span>
                <span>{property.beds || 'Not specified'}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="font-medium">Bathrooms:</span>
                <span>{property.baths || 'Not specified'}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="font-medium">Nightly Rate:</span>
                <span>${(property.nightlyRate / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="font-medium">Minimum Nights:</span>
                <span>{property.minNights}</span>
              </div>
              {property.cleaningFee > 0 && (
                <div className="flex items-center space-x-4">
                  <span className="font-medium">Cleaning Fee:</span>
                  <span>${(property.cleaningFee / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
            
            {property.description && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3">Description</h3>
                <p className="text-gray-300 leading-relaxed">{property.description}</p>
              </div>
            )}
          </div>

          {/* Availability Calendar */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Check Availability</h2>
            <AvailabilityCalendar propertyId={property.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
