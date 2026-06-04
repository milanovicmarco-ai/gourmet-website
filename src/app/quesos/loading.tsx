import { Layout } from "@/components/Layout";
import { HubSkeleton } from "@/components/HubSkeleton";

export default function QuesosLoading() {
  return (
    <Layout navTheme="dark" heroFlush>
      <HubSkeleton />
    </Layout>
  );
}
