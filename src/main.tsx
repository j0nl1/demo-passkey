import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { convertAsn1toRaw, createWebauthnCredential, requestWebauthnSignature } from "./webauthn";
import { verify } from "wasm-passkey";
import "../public/index.css";

const App = () => {
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 400 }}>
      <button onClick={() => createCredential().catch((e) => setError(e.message))} type="button">
        Create Credential
      </button>
      {error && <div>{error}</div>}
      <button onClick={requestAndVerify} type="button">
        Verify
      </button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const createCredential = async () => {
  const { publicKey } = await createWebauthnCredential("grug");
  localStorage.setItem("pubKey", JSON.stringify(publicKey));
};

const requestAndVerify = async () => {
  const pbKey = new Uint8Array(Object.values(JSON.parse(localStorage.getItem("pubKey") as string)));
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const response = await requestWebauthnSignature(challenge);

  const authenticatorData = new Uint8Array(response.authenticatorData);
  const clientDataJSON = new Uint8Array(response.clientDataJSON);
  const signature = new Uint8Array(response.signature);

  try {
    // Verify in browser
    const digestClientJSON = new Uint8Array(await crypto.subtle.digest("SHA-256", response.clientDataJSON));

    const signedData = new Uint8Array(authenticatorData.length + digestClientJSON.length);
    signedData.set(authenticatorData);
    signedData.set(digestClientJSON, authenticatorData.length);

    const key = await crypto.subtle.importKey("raw", pbKey, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);

    const verified = await crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-256" } }, key, convertAsn1toRaw(signature), signedData);

    console.log("Verification from browser: ", verified);
  } catch (err) {
    console.log(err);
  }

  try {
    // Verify in WASM
    const { origin, crossOrigin } = JSON.parse(new TextDecoder().decode(clientDataJSON));
    const verified = verify(
      challenge,
      {
        origin,
        cross_origin: crossOrigin,
      },
      {
        pub_key: pbKey,
        signature: signature,
        authenticator_data: authenticatorData,
      }
    );
    console.log("Verification from wasm: ", verified);
  } catch (err) {
    console.log(err);
  }
};
