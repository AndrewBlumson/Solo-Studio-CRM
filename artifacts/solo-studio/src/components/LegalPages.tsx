import { useGetStudioLegalProfile, getGetStudioLegalProfileQueryKey } from '@workspace/api-client-react';
import { useEffect } from 'react';
import { Link } from 'wouter';

type LegalKind = 'cookies' | 'privacy' | 'terms';

const pageInfo: Record<LegalKind, { title: string; intro: string; updated: string }> = {
  cookies: { title: 'Cookie notice', intro: 'A clear account of how this website may use cookies and similar technologies.', updated: 'Cookie notice' },
  privacy: { title: 'Privacy notice', intro: 'How information may be handled when you visit or use Solo Studio.', updated: 'Privacy notice' },
  terms: { title: 'Terms of service', intro: 'The terms that may apply when using Solo Studio.', updated: 'Terms of service' },
};

function ProfileIdentity({ kind, profile }: { kind: LegalKind; profile: any }) {
  if (profile.isLoading) return <div className="legal-profile-note" aria-live="polite" data-testid="status-public-profile-loading">Loading the shared company profile…</div>;
  if (profile.isError) return <div className="legal-profile-note" role="alert" data-testid="status-public-profile-error">The shared company details are temporarily unavailable. Please check again later.</div>;
  const details = profile.data;
  const showAddress = kind !== 'cookies';
  const missing = !details?.isComplete;
  return <section className="legal-identity" aria-labelledby="legal-identity-title" data-testid="section-legal-identity">
    <div className="eyebrow">Who is responsible</div>
    <h2 id="legal-identity-title">Company details</h2>
    {missing && <p className="legal-incomplete" role="note" data-testid="notice-profile-incomplete">This Remix’s legal profile needs completing. Bracketed profile fields below are placeholders; <Link href="/sign-in" data-testid="link-legal-sign-in">sign in</Link> and complete the details in Settings before publication.</p>}
    <dl className="legal-identity-grid">
      <div><dt>Registered name</dt><dd data-testid="text-legal-registered-name">{details?.registeredName || '[Registered legal entity name]'}</dd></div>
      <div><dt>Trading name</dt><dd data-testid="text-legal-trading-name">{details?.tradingName || '[Trading name, if different]'}</dd></div>
      <div><dt>Country of registration</dt><dd data-testid="text-legal-country">{details?.country || '[Country of registration]'}</dd></div>
      {showAddress && <div><dt>Registered business address</dt><dd data-testid="text-legal-address">{details?.registeredAddress || '[Registered business address]'}</dd></div>}
      <div><dt>Privacy / legal contact</dt><dd data-testid="text-legal-email">{details?.privacyEmail || '[Privacy contact email]'}</dd></div>
      {kind !== 'cookies' && <div><dt>Website</dt><dd data-testid="text-legal-website">{details?.website || '[Website address]'}</dd></div>}
    </dl>
  </section>;
}

function LegalDisclaimer() {
  return <aside className="legal-disclaimer" role="note" data-testid="notice-legal-template">
    <strong>Customisable template · not legal advice</strong>
    <p>This page is a starting-point template, not legal advice. Review every bracketed placeholder and the practices described here with a qualified legal professional before publication. Remove any provision or cookie category that does not apply.</p>
  </aside>;
}

function LegalSections({ kind, profile }: { kind: LegalKind; profile: any }) {
  const registeredName = profile?.registeredName || '[Registered legal entity name]';
  const tradingName = profile?.tradingName || profile?.registeredName || '[Trading name, if different]';
  const privacyEmail = profile?.privacyEmail || '[Privacy contact email]';
  if (kind === 'cookies') return <>
    <section><h2>1. What cookies are</h2><p>Cookies and similar technologies are small files or identifiers stored on or accessed from a device. They may help a site remember a session or a preference. This notice should be checked against the technologies actually used by this website.</p></section>
    <section><h2>2. Essential cookies</h2><p><strong>[List each strictly necessary cookie, its purpose, provider and lifetime.]</strong> Essential cookies may be used only where needed for functions such as account access, security or remembering a privacy choice. Replace this text with the actual essential cookies in use, or state that none are used.</p></section>
    <section><h2>3. Optional analytics cookies</h2><p><strong>[Name any analytics provider and cookies, what they measure, recipients, lifetime and how consent can be changed.]</strong> Do not imply analytics are in use unless confirmed. If no analytics cookies are used, remove this optional category.</p></section>
    <section><h2>4. Advertising and other optional technologies</h2><p><strong>[Name any advertising, personalisation, embedded content or other optional technologies and explain their purpose and providers.]</strong> Add how visitors can consent, refuse or change their choice under the rules that apply in <strong>[relevant country or jurisdiction]</strong>. Remove categories that are not used.</p></section>
    <section><h2>5. Managing your choices</h2><p>[Explain the actual consent controls, device/browser settings, and how a visitor can later change or withdraw optional consent. Describe the effect of blocking essential cookies accurately.]</p></section>
    <section><h2>6. Contact and changes</h2><p>For questions, use the privacy / legal contact shown above. Confirm it is monitored before publication. We may update this notice to reflect changes to our practices. See <Link href="/privacy" data-testid="link-cookies-privacy">Privacy</Link> and <Link href="/terms" data-testid="link-cookies-terms">Terms</Link>.</p></section>
  </>;
  if (kind === 'privacy') return <>
    <section><h2>1. About this notice</h2><p>This template describes possible information handling by <strong>{registeredName}</strong>{profile?.tradingName ? <> trading as <strong>{tradingName}</strong></> : ''} (“we”, “us”). Complete and verify it against actual practices and applicable privacy law before publication.</p></section>
    <section><h2>2. Information we may collect</h2><ul><li><strong>Identity and contact:</strong> [Specify account name, email address and other contact details actually collected.]</li><li><strong>Studio and client information:</strong> [Describe records people choose to enter, such as client, project, proposal, task, invoice or expense details.]</li><li><strong>Communications and files:</strong> [List messages, attachments, imports or other content received, if any.]</li><li><strong>Technical and usage data:</strong> [List logs, device/browser details and usage events actually collected; identify optional analytics if used.]</li></ul><p>Do not include categories that are not collected.</p></section>
    <section><h2>3. Why information is used</h2><p>[Describe the specific purposes that apply, such as providing requested workspace features, account administration, responding to enquiries, protecting service integrity, and meeting legal obligations. State the applicable legal basis where required, and do not claim a purpose or legal basis without confirming it.]</p></section>
    <section><h2>4. Recipients and service providers</h2><p>Information may be available to providers only where they support a stated purpose. Complete this list with every relevant provider, role, data shared and location/transfer details; do not publish it until verified:</p><ul><li><strong>[Provider — hosting or storage]:</strong> [Information processed, purpose, region and privacy notice link.]</li><li><strong>[Provider — account authentication]:</strong> [Information processed, purpose, region and privacy notice link.]</li><li><strong>[Provider — email, analytics, payments or other service, if used]:</strong> [Information processed and why.]</li></ul><p>[Explain any other disclosures, such as at the user’s direction, to professional advisers, or where legally required. Remove unused provider categories.]</p></section>
    <section><h2>5. Storage and security</h2><p>Information is stored for <strong>[describe actual storage locations and retention periods or criteria for each category]</strong>. We use <strong>[describe verified technical and organisational security measures]</strong>. No security measure can be described as absolute. Add any relevant international transfer safeguards: <strong>[details or “not applicable”, after review]</strong>.</p></section>
    <section><h2>6. Your privacy rights</h2><p>Depending on where you live, you may have rights to request access, correction, deletion, restriction, portability, object to certain processing, or withdraw consent. You may also complain to <strong>[applicable supervisory authority]</strong>. Contact <strong>{privacyEmail}</strong> to make a request. Explain any identity checks, response periods, exceptions, and local rights that apply: <strong>[jurisdiction-specific details]</strong>.</p></section>
    <section><h2>7. Cookies</h2><p>Cookies and similar technologies may support essential site functions and, if enabled, optional analytics or advertising. State the actual categories, consent controls, providers and lifetimes in the <Link href="/cookies" data-testid="link-privacy-cookies">Cookie notice</Link>. Remove categories not used.</p></section>
    <section><h2>8. Children and minors</h2><p>[State the actual minimum age and whether the service is directed to children. Explain what steps are taken if information from a child below that age is identified, consistent with applicable law.]</p></section>
    <section><h2>9. Changes to this notice</h2><p>We may update this notice when practices or requirements change. Describe how material changes will be communicated and when they take effect: <strong>[notice method and timing]</strong>. The last reviewed date is <strong>[DD/MM/YYYY]</strong>.</p></section>
    <section><h2>10. Applicable law and jurisdiction</h2><p>This notice and data-protection obligations should be reviewed under <strong>[applicable privacy law, country and jurisdiction]</strong>. Do not publish this section without jurisdiction-specific review.</p></section>
  </>;
  return <>
    <section><h2>1. Acceptance</h2><p>By accessing or using <strong>{tradingName}</strong>, you agree to these terms. If you use the service for an organisation, you confirm you are authorised to accept on its behalf. If you do not agree, do not use the service.</p></section>
    <section><h2>2. Service scope</h2><p><strong>{tradingName}</strong> provides <strong>[describe the services and features currently offered, plus any material limits]</strong>. Describe anything the service does not provide and any outputs that are informational only: <strong>[service boundaries]</strong>.</p></section>
    <section><h2>3. Accounts</h2><p>You must provide accurate account information, protect your sign-in credentials and remain responsible for activity through your account. Notify us at <strong>[support contact]</strong> if you suspect unauthorised access. State applicable minimum-age and account eligibility requirements: <strong>[requirements]</strong>.</p></section>
    <section><h2>4. Acceptable use</h2><p>You may not use the service unlawfully, interfere with its operation or security, access another person’s account or data without authority, distribute malicious code, scrape or reverse engineer except where law permits, or infringe others’ rights. Add any service-specific restrictions: <strong>[additional rules]</strong>.</p></section>
    <section><h2>5. Your data and content</h2><p>You retain rights in content you submit. You allow us to host, process and display it only as reasonably needed to provide and maintain the service, subject to the <Link href="/privacy" data-testid="link-terms-privacy">Privacy notice</Link>. You are responsible for having rights to submit the content and for maintaining copies where appropriate. Describe export and deletion handling: <strong>[verified process and timing]</strong>.</p></section>
    <section><h2>6. Fees and payment</h2><p><strong>[If paid plans apply: state prices, billing period, taxes, renewal, payment method, cancellation and refund terms, plus any payment provider.]</strong> If all access is free or payment is not applicable, say so clearly. Remove payment terms that do not apply.</p></section>
    <section><h2>7. Availability and changes to the service</h2><p>The service may change, be interrupted or become unavailable. Describe any support, maintenance or availability commitments actually offered: <strong>[service availability commitment or no guarantee, as applicable]</strong>. Do not promise an uptime level unless one is offered.</p></section>
    <section><h2>8. Intellectual property</h2><p>Identify the owner of <strong>{tradingName}</strong>’s brand, software and design: <strong>[rights holder and any licence terms]</strong>. These terms do not transfer ownership of your content or grant rights beyond those stated here. Identify any third-party components or content requiring notice: <strong>[details]</strong>.</p></section>
    <section><h2>9. Liability</h2><p>Set out the limitations and exclusions that are legally permitted for the relevant users and location: <strong>[reviewed liability allocation, exclusions, any cap and exceptions]</strong>. Nothing in this section excludes or limits liability where applicable law does not permit it. This clause requires jurisdiction-specific legal review; do not publish assumed protections.</p></section>
    <section><h2>10. Suspension and termination</h2><p>You may stop using the service and close your account using <strong>[verified account closure process]</strong>. We may suspend or end access only on the grounds and with the notice or process described here: <strong>[grounds, process and any cure period]</strong>. Explain what happens to user content and how long it is retained after closure: <strong>[verified deletion and retention details]</strong>.</p></section>
    <section><h2>11. Changes to these terms</h2><p>We may revise these terms. Explain how material changes will be notified, when they take effect, and what continued use means: <strong>[notice method and timing]</strong>. The effective date is <strong>[DD/MM/YYYY]</strong>.</p></section>
    <section><h2>12. Governing law and jurisdiction</h2><p>These terms are governed by the laws of <strong>[country / state / jurisdiction]</strong>, and disputes will be handled by <strong>[courts or dispute forum and venue]</strong>, subject to mandatory consumer protections and applicable law. Obtain local legal review before completing these fields.</p></section>
    <section><h2>13. Contact</h2><p>Questions about these terms: <strong>{privacyEmail}</strong>. See our <Link href="/privacy" data-testid="link-terms-privacy-footer">Privacy</Link> and <Link href="/cookies" data-testid="link-terms-cookies">Cookie notice</Link>.</p></section>
  </>;
}

export function LegalPage({ kind }: { kind: LegalKind }) {
  const info = pageInfo[kind];
  const profile = useGetStudioLegalProfile({ query: { queryKey: getGetStudioLegalProfileQueryKey(), retry: 1 } });
  useEffect(()=>{document.title=`${info.title} · Solo Studio`},[info.title]);
  return <main className="legal-shell">
    <header className="legal-header">
      <Link href="/" className="marketing-brand" data-testid="link-legal-home"><img src={`${import.meta.env.BASE_URL.replace(/\/$/,'')}/solo-studio-mark.png`} alt=""/>Solo Studio</Link>
      <Link href="/" className="legal-back" data-testid="link-legal-back">Back to Solo Studio</Link>
    </header>
    <article className="legal-document">
      <div className="eyebrow">Solo Studio · {info.updated}</div>
      <h1 data-testid={`heading-legal-${kind}`}>{info.title}</h1>
      <p className="legal-intro">{info.intro}</p>
      <LegalDisclaimer/>
      <ProfileIdentity kind={kind} profile={profile}/>
      <LegalSections kind={kind} profile={profile.data}/>
      <footer className="legal-footer">
        <span>Solo Studio · Last reviewed: [DD/MM/YYYY]</span>
        <nav aria-label="Legal pages"><Link href="/privacy" data-testid="link-legal-footer-privacy">Privacy</Link><Link href="/cookies" data-testid="link-legal-footer-cookies">Cookies</Link><Link href="/terms" data-testid="link-legal-footer-terms">Terms</Link><Link href="/" data-testid="link-legal-footer-home">Home</Link></nav>
      </footer>
    </article>
  </main>;
}
