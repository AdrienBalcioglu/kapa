import Link from 'next/link';
import { Button } from '@/components/ui';

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Transformez votre site web en app mobile
            <span className="text-blue-600"> en 5 minutes</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Pas besoin de Xcode, pas besoin de Mac, pas besoin de coder.
            Entrez votre URL et recevez votre .ipa et .apk buildés dans le cloud.
          </p>
          <Link href="/create">
            <Button size="lg" className="text-lg px-8 py-4">
              Creer mon app maintenant
            </Button>
          </Link>
        </div>

        {/* Demo Image Placeholder */}
        <div className="mt-16 bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p>Apercu de votre app</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Comment ca marche ?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
            title="1. Entrez votre URL"
            description="Collez simplement l'URL de votre site web. Nous supportons tous les sites HTTPS."
          />
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            }
            title="2. Personnalisez"
            description="Choisissez votre icone, couleur de splash screen, et activez les notifications push."
          />
          <FeatureCard
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            }
            title="3. Telechargez"
            description="Recevez votre .ipa (iOS) et .apk (Android) prets a publier sur les stores."
          />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-blue-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Pourquoi choisir App Builder ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <BenefitCard title="No-Code" description="Aucune connaissance technique requise" />
            <BenefitCard title="Cloud Build" description="Pas besoin de Mac ou Xcode" />
            <BenefitCard title="iOS + Android" description="Les deux plateformes en un clic" />
            <BenefitCard title="5 minutes" description="Du site web a l'app mobile" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Pret a creer votre app ?
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Commencez gratuitement, pas de carte de credit requise.
        </p>
        <Link href="/create">
          <Button size="lg" className="text-lg px-8 py-4">
            Commencer maintenant
          </Button>
        </Link>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function BenefitCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-blue-500 p-6 rounded-xl text-center">
      <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
      <p className="text-blue-100">{description}</p>
    </div>
  );
}
