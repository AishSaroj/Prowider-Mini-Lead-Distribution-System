import { RequestServiceForm } from "@/components/RequestServiceForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default function RequestServicePage() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        title="Request a service"
        description="Submit your enquiry and we will assign it to the right providers automatically. Duplicate phone numbers for the same service are blocked at the database level."
      />
      <RequestServiceForm />
    </div>
  );
}
