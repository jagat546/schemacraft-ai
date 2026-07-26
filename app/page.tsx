import { FeatureShowcase } from "@/features/landing/components/feature-showcase"
import { HeroSection } from "@/features/landing/components/hero-section"
import { MarketingFooter } from "@/features/landing/components/marketing-footer"
import { MarketingNav } from "@/features/landing/components/marketing-nav"
import { getCurrentUser } from "@/lib/auth/current-user"

export default async function Home() {
  const user = await getCurrentUser()
  const isAuthenticated = Boolean(user)

  return (
    <div className="flex min-h-svh flex-col">
      <MarketingNav isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <HeroSection isAuthenticated={isAuthenticated} />
        <FeatureShowcase />
      </main>
      <MarketingFooter />
    </div>
  )
}
