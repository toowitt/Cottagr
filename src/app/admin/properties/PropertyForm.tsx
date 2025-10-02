'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { createProperty } from './actions';

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

type ServerAction = typeof createProperty;

type PropertyFormProps = {
  action: ServerAction;
  mode: 'create' | 'edit';
  initialValues?: {
    id?: number;
    name?: string | null;
    slug?: string | null;
    location?: string | null;
    beds?: number | null;
    baths?: number | null;
    nightlyRate?: number | null;
    cleaningFee?: number | null;
    minNights?: number | null;
    description?: string | null;
    photos?: string[] | null;
  };
};

export default function PropertyForm({ action, mode, initialValues }: PropertyFormProps) {
  const initialName = initialValues?.name ?? '';
  const initialSlug = initialValues?.slug ?? '';

  const generatedFromInitial = useMemo(() => slugify(initialName), [initialName]);

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug || generatedFromInitial);
  const [manual, setManual] = useState(() => {
    if (!initialSlug) {
      return false;
    }
    const generated = slugify(initialName);
    return initialSlug.trim() !== '' && initialSlug !== generated;
  });

  useEffect(() => {
    const generated = slugify(name);
    if (!manual || slug.trim() === '' || slug === generatedFromInitial) {
      setSlug(generated);
      setManual(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleSlugChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSlug(value);
    const generated = slugify(name);
    setManual(value.trim() !== '' && value !== generated);
  };

  const photosDefault = initialValues?.photos?.join(', ') ?? '';

  return (
    <form action={action}>
      <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={name}
            onChange={handleNameChange}
            required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Slug</label>
          <input
            type="text"
            name="slug"
            value={slug}
            onChange={handleSlugChange}
            required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            name="location"
            defaultValue={initialValues?.location ?? ''}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Beds</label>
          <input
            type="number"
            name="beds"
            defaultValue={initialValues?.beds ?? ''}
            min="0"
            step="1"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Baths</label>
          <input
            type="number"
            name="baths"
            defaultValue={initialValues?.baths ?? ''}
            min="0"
            step="1"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Nightly Rate (cents)</label>
          <input
            type="number"
            name="nightlyRate"
            defaultValue={initialValues?.nightlyRate ?? ''}
            required
            min="0"
            step="1"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Cleaning Fee (cents)</label>
          <input
            type="number"
            name="cleaningFee"
            defaultValue={initialValues?.cleaningFee ?? ''}
            required
            min="0"
            step="1"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Minimum Nights</label>
          <input
            type="number"
            name="minNights"
            defaultValue={initialValues?.minNights ?? 2}
            required
            min="1"
            step="1"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          name="description"
          defaultValue={initialValues?.description ?? ''}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Photos (comma-separated URLs)</label>
        <input
          type="text"
          name="photos"
          defaultValue={photosDefault}
          placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          {mode === 'edit' ? 'Update Property' : 'Create Property'}
        </button>

        {mode === 'edit' && (
          <Link
            href="/admin/properties"
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
