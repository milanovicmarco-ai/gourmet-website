import { Layout } from "@/components/Layout";

export default function ProductLoading() {
  return (
    <Layout navTheme="light">
      <section className="container-edit pt-28 md:pt-36 pb-20 md:pb-28">
        {/* Breadcrumb */}
        <div className="h-3 w-48 bg-muted rounded animate-pulse mb-10" />

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Imagen principal */}
          <div className="lg:col-span-6 space-y-3">
            <div className="aspect-square bg-muted rounded-3xl animate-pulse" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>

          {/* Detalle */}
          <div className="lg:col-span-6 space-y-6">
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            <div className="space-y-3">
              <div className="h-12 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-12 w-1/2 bg-muted rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-muted rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <div className="h-14 w-48 bg-muted rounded-full animate-pulse" />
              <div className="h-14 w-40 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
