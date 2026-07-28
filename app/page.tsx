import { Faq } from "@/features/landing/components/faq"
import { FeatureShowcase } from "@/features/landing/components/feature-showcase"
import { HeroSection } from "@/features/landing/components/hero-section"
import { InteractiveDemo } from "@/features/landing/components/interactive-demo"
import { MarketingFooter } from "@/features/landing/components/marketing-footer"
import { MarketingNav } from "@/features/landing/components/marketing-nav"
import { Pricing } from "@/features/landing/components/pricing"
import { SocialProof } from "@/features/landing/components/social-proof"
import { VisualPipeline } from "@/features/landing/components/visual-pipeline"
import { getCurrentUser } from "@/lib/auth/current-user"

export default async function Home() {
  const user = await getCurrentUser()
  const isAuthenticated = Boolean(user)

  return (
    <div className="flex min-h-svh flex-col">
      <MarketingNav isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <HeroSection isAuthenticated={isAuthenticated} />
        <VisualPipeline />
        <FeatureShowcase />
        <InteractiveDemo />
        <SocialProof />
        <Pricing isAuthenticated={isAuthenticated} />
        <Faq />
      </main>
      <MarketingFooter />
    </div>
  )
}
