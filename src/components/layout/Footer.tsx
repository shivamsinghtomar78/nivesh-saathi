import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-cream border-t border-ink/10 w-full pt-12 pb-8">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10 mb-12">
          {/* Brand */}
          <div className="space-y-3">
            <span className="font-bold text-saffron text-2xl font-heading">
              Nivesh Saathi
            </span>
            <p className="max-w-xs text-ink-muted text-sm">
              Your trusted bank manager, now on your phone.
            </p>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
                Important Links
              </h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li>
                  <Link
                    href="#"
                    className="hover:text-saffron transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-saffron transition-colors"
                  >
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-saffron transition-colors"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-saffron transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-ink uppercase tracking-wider">
                Languages
              </h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li>English</li>
                <li>हिंदी</li>
                <li>மராठী</li>
                <li>ગુજરાતી</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Disclaimer + Copyright */}
        <div className="pt-8 border-t border-outline/30 text-center space-y-3">
          <p className="text-[10px] text-ink-muted uppercase tracking-widest leading-relaxed">
            DISCLAIMER: Nivesh Saathi is an aggregator platform. Deposits are held
            with respective banks which are insured by DICGC (RBI&apos;s
            wholly-owned subsidiary) up to ₹5 Lakhs per individual per bank.
          </p>
          <p className="text-ink-muted text-sm font-heading">
            © 2024 Nivesh Saathi. Regulated by the Government of India.
          </p>
        </div>
      </div>
    </footer>
  );
}
