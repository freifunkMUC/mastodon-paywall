import Head from "next/head";
import styles from "../styles/Home.module.css";

import Form from "../components/form";

export default function Home() {
  return (
    <>
      <Head>
        <title>Mastodon Registration</title>
        <meta
          name="description"
          content="Create a Mastodon account with a secure PayPal subscription."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.hero}>
            <div className={styles.brand}>
              <div className={styles.brandMark}>M</div>
              <div>
                <p className={styles.brandName}>Mastodon</p>
                <p className={styles.brandTag}>social.ffmuc.net</p>
              </div>
              <span className={styles.badge}>Community</span>
            </div>
            <h1 className={styles.title}>
              Create your account and join the conversation
            </h1>
            <p className={styles.subtitle}>
              Support the instance with a small subscription. Your account is
              created right after payment and you can cancel anytime.
            </p>
            <div className={styles.priceCard}>
              <p className={styles.priceLabel}>Subscription</p>
              <p className={styles.priceValue}>€5 / month</p>
              <p className={styles.priceNote}>
                Keeps Mastodon and community services running.
              </p>
            </div>
            <ul className={styles.highlights}>
              <li>
                <span>✓</span> Ad-free, community-run instance
              </li>
              <li>
                <span>✓</span> Secure PayPal checkout
              </li>
              <li>
                <span>✓</span> Instant account activation
              </li>
            </ul>
            <div className={styles.trust}>
              <div>
                <p className={styles.trustLabel}>Secure payments</p>
                <p className={styles.trustValue}>Processed by PayPal</p>
              </div>
              <div>
                <p className={styles.trustLabel}>Cancel anytime</p>
                <p className={styles.trustValue}>Manage in PayPal</p>
              </div>
            </div>
          </header>
          <section className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Get started</h2>
              <p className={styles.formSubtitle}>
                Fill in your details, then complete the €5/month PayPal
                subscription.
              </p>
            </div>
            <Form />
            <p className={styles.legal}>
              By continuing, you agree to the
              {" "}
              <a
                href="https://ffmuc.net/nutzungsbedingungen/"
                target="_blank"
                rel="noreferrer"
              >
                Terms of Service
              </a>
              {" "}
              and consent to account creation on ffmuc.social.
            </p>
            <div className={styles.linksGrid}>
              <a
                href="https://ffmuc.net/privacy/"
                target="_blank"
                rel="noreferrer"
              >
                Privacy Policy
              </a>
              <a
                href="https://ffmuc.net/impressum/"
                target="_blank"
                rel="noreferrer"
              >
                Imprint
              </a>
              <a
                href="https://ffmuc.net/wiki/ev:start"
                target="_blank"
                rel="noreferrer"
              >
                FAQ
              </a>
              <a
                href="https://spende.ffmuc.net/"
                target="_blank"
                rel="noreferrer"
              >
                Donations
              </a>
            </div>
          </section>
        </div>
        <div className={styles.glow} aria-hidden="true" />
      </main>
    </>
  );
}
