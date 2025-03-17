import Head from "next/head";
import styles from "../styles/Home.module.css";

import "bootstrap/dist/css/bootstrap.min.css";

import Form from "../components/form";

export default function Home() {
  return (
    <>
      <Head>
        <title>Mastodon Registraton</title>
        <meta name="description" content="Mastodon Registration" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <Form />
      </main>
    </>
  );
}
