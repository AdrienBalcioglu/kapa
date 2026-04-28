import { AppForm } from '@/components/AppForm';

export default function CreatePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Creer votre app mobile
        </h1>
        <p className="text-gray-600">
          Remplissez le formulaire ci-dessous pour generer votre application iOS et Android.
        </p>
      </div>
      <AppForm />
    </div>
  );
}
