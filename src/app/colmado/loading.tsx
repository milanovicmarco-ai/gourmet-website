import { Layout } from "@/components/Layout";
import { HubSkeleton } from "@/components/HubSkeleton";

export default function ColmadoLoading() {
  return (
    <Layout navTheme="dark" heroFlush>
      <HubSkeleton />
    </Layout>
  );
}
