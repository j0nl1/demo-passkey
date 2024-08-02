use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::{JsError, JsValue};

use p256::ecdsa::signature::Verifier;
use p256::ecdsa::{DerSignature, VerifyingKey};
use p256::elliptic_curve::PublicKey;
use sha2::{Digest, Sha256};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Verification {
    pub pub_key: Vec<u8>,
    pub authenticator_data: Vec<u8>,
    pub signature: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectedClientData {
    /// This member contains the value [`ClientDataType::Create`] when creating new credentials, and
    /// [`ClientDataType::Get`] when getting an assertion from an existing credential. The purpose
    /// of this member is to prevent certain types of signature confusion attacks (where an attacker
    ///  substitutes one legitimate signature for another).
    #[serde(rename = "type")]
    pub ty: String,

    /// This member contains the base64url encoding of the challenge provided by the Relying Party.
    /// See the [Cryptographic Challenges] security consideration.
    ///
    /// [Cryptographic Challenges]: https://w3c.github.io/webauthn/#sctn-cryptographic-challenges
    pub challenge: String,

    /// This member contains the fully qualified origin of the requester, as provided to the
    /// authenticator by the client, in the syntax defined by [RFC6454].
    ///
    /// [RFC6454]: https://www.rfc-editor.org/rfc/rfc6454
    pub origin: String,

    /// This OPTIONAL member contains the inverse of the sameOriginWithAncestors argument value that
    /// was passed into the internal method
    pub cross_origin: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RPConfig {
    pub origin: String,
    pub cross_origin: bool,
}

#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
    wasm_log::init(wasm_log::Config::new(log::Level::Debug));
}

#[wasm_bindgen(js_name = "verify")]
pub fn verify(hash: JsValue, rp_config: JsValue, verfication: JsValue) -> Result<bool, JsError> {
    let Verification {
        pub_key: pb_key_bytes,
        authenticator_data,
        signature,
    } = serde_wasm_bindgen::from_value(verfication)?;

    let RPConfig {
        origin,
        cross_origin,
    } = serde_wasm_bindgen::from_value(rp_config)?;

    let challenge: Vec<u8> = serde_wasm_bindgen::from_value(hash)?;

    let pub_key =
        PublicKey::from_sec1_bytes(&pb_key_bytes).map_err(|e| JsError::new(&e.to_string()))?;

    let verifier = VerifyingKey::from(&pub_key);

    let signature =
        DerSignature::from_bytes(&signature).map_err(|e| JsError::new(&e.to_string()))?;

    let client_data = CollectedClientData {
        ty: "webauthn.get".to_string(),
        challenge: URL_SAFE_NO_PAD.encode(Sha256::digest(&challenge).as_slice()),
        origin,
        cross_origin: Some(cross_origin),
    };

    let client_data: Vec<u8> =
        serde_json::to_vec(&client_data).map_err(|e| JsError::new(&e.to_string()))?;

    let signed_data = [
        authenticator_data.as_slice(),
        Sha256::digest(&client_data).as_ref(),
    ]
    .concat();

    Ok(verifier.verify(&signed_data, &signature).is_ok())
}
