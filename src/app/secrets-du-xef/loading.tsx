import { Layout } from "@/components/Layout";
import { HubSkeleton } from "@/components/HubSkeleton";

export default function SecretsLoading() {
  return (
    <Layout navTheme="dark" heroFlush>
      <HubSkeleton />
    </Layout>
  );
}
