import LandingScreen from "@/components/landing/LandingScreen";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Nivesh Saathi",
    "url": "https://niveshsaathi.in",
    "applicationCategory": "FinanceApplication",
    "description": "Find India's Best Fixed Deposits in 30 Seconds. Compare 8+ banks, get AI-powered guidance, and secure the highest returns.",
    "publisher": {
      "@type": "Organization",
      "name": "Nivesh Saathi"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingScreen />
    </>
  );
}
