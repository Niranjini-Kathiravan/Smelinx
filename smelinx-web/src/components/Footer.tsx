import Container from "./Container";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0b1020]">
      <Container className="py-12 text-sm text-white/70 grid gap-8 md:grid-cols-4">
        {/* Brand blurb */}
        <div>
          <div className="font-semibold text-white text-lg">Smelinx</div>
          <p className="mt-3 max-w-xs">
            Open-source API lifecycle management. Register APIs, track versions, and automate
            deprecation notices—self-hosted or in your cloud.
          </p>
        </div>

        {/* Product */}
        <div>
          <div className="text-white font-semibold">Product</div>
          <ul className="mt-3 space-y-2">
            <li><a href="#features" className="hover:text-white">Features</a></li>
            <li><a href="#how-it-works" className="hover:text-white">How it works</a></li>
            <li><a href="#open-source" className="hover:text-white">Open source</a></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <div className="text-white font-semibold">Resources</div>
          <ul className="mt-3 space-y-2">
            <li>
              <a href="https://github.com/Niranjini-Kathiravan/Smelinx" target="_blank" className="hover:text-white">
                GitHub
              </a>
            </li>
            <li><a href="#" className="hover:text-white">Docs (soon)</a></li>
          </ul>
        </div>

        {/* Account — NEW */}
        <div>
          <div className="text-white font-semibold">Account</div>
          <ul className="mt-3 space-y-2">
            <li>
              <a href="/signup" className="hover:text-white">
                Sign up
              </a>
            </li>
            <li>
              <a href="/login" className="hover:text-white">
                Log in
              </a>
            </li>
          </ul>

          {/* Contact */}
          <div className="mt-6">
            <div className="text-white font-semibold">Contact</div>
            <ul className="mt-3 space-y-2">
              <li><a href="#contact" className="hover:text-white">smelinx.contact@gmail.com</a></li>
            </ul>
          </div>
        </div>
      </Container>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Smelinx
      </div>
    </footer>
  );
}
