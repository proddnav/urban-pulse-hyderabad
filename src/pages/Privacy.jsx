export default function Privacy() {
  return (
    <div className="min-h-screen bg-background px-6 py-12 max-w-2xl mx-auto">
      <h1 className="font-headline text-3xl font-extrabold mb-6">Privacy Policy</h1>
      <p className="text-on-surface-variant text-sm mb-4">Last updated: March 20, 2026</p>

      <div className="space-y-6 text-on-surface text-sm leading-relaxed">
        <section>
          <h2 className="font-headline font-bold text-lg mb-2">1. Information We Collect</h2>
          <p>The Urban Pulse collects the following information to provide transit services:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1 text-on-surface-variant">
            <li><strong>Location Data:</strong> We access your device location to show nearby bus stops, metro stations, and provide route directions. Location is processed on-device and not stored on our servers.</li>
            <li><strong>Account Information:</strong> If you sign in, we store your name, email, and profile photo from Google, or your phone number.</li>
            <li><strong>Usage Data:</strong> We collect anonymized app usage statistics to improve our services.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-headline font-bold text-lg mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc ml-6 space-y-1 text-on-surface-variant">
            <li>To provide real-time transit information and route planning</li>
            <li>To show nearby bus stops and metro stations</li>
            <li>To manage your transit passes and wallet</li>
            <li>To display and manage community events</li>
            <li>To improve our services</li>
          </ul>
        </section>

        <section>
          <h2 className="font-headline font-bold text-lg mb-2">3. Data Storage</h2>
          <p className="text-on-surface-variant">Transit route data is processed and stored locally on your device. Account data is stored securely using Google Firebase. We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="font-headline font-bold text-lg mb-2">4. Third-Party Services</h2>
          <p className="text-on-surface-variant">We use Google Firebase for authentication and data storage. Please refer to Google's Privacy Policy for details on how they handle data.</p>
        </section>

        <section>
          <h2 className="font-headline font-bold text-lg mb-2">5. Your Rights</h2>
          <p className="text-on-surface-variant">You can delete your account and all associated data at any time from the app settings. You can deny location permissions and still use basic route search features.</p>
        </section>

        <section>
          <h2 className="font-headline font-bold text-lg mb-2">6. Contact</h2>
          <p className="text-on-surface-variant">For privacy concerns, contact us at privacy@urbanpulse.app</p>
        </section>

        <section>
          <h2 className="font-headline font-bold text-lg mb-2">7. Data Source</h2>
          <p className="text-on-surface-variant">Transit data is sourced from Telangana State Road Transport Corporation (TGSRTC) via Open Data Telangana. Metro data is sourced from Hyderabad Metro Rail Limited (L&T Metro).</p>
        </section>
      </div>
    </div>
  )
}
