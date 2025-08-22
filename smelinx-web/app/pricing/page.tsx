import Container from "@/components/Container";

export default function Pricing() {
  return (
    <div className="py-16">
      <Container>
        <h1 className="text-3xl font-bold text-center">Pricing</h1>
        <p className="text-center text-slate-600 mt-2">Start free. Self‑host or use our managed version later.</p>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold">Free (Self‑host)</h3>
            <p className="text-slate-600 mt-1">Free forever</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• Up to 10 APIs</li>
              <li>• Version tracking & statuses</li>
              <li>• Emails via SendGrid/Mailgun</li>
            </ul>
          </div>
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold">Managed (Coming soon)</h3>
            <p className="text-slate-600 mt-1">Hosted by us</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• One‑click setup</li>
              <li>• Custom domain & TLS</li>
              <li>• Priority support</li>
            </ul>
          </div>
        </div>
      </Container>
    </div>
  );
}
