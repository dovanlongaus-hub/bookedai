# Wallet pass setup (Apple + Google)

The chess.bookedai.au order confirmation flow exposes "Add to Apple Wallet"
and "Add to Google Wallet" buttons. Both endpoints return `503` until the
operator configures credentials — see env vars in `.env.example`.

## Apple Wallet (`.pkpass`)

1. Sign in to <https://developer.apple.com/account> → Certificates, IDs &
   Profiles → **Identifiers** → register a **Pass Type ID** (e.g.
   `pass.au.bookedai.chess`).
2. Generate a Pass certificate against that ID. Download the `.cer` and
   import into Keychain, then export the cert + private key as
   `pass.p12` with a passphrase.
3. Split into PEM:

   ```bash
   openssl pkcs12 -in pass.p12 -clcerts -nokeys -out pass.pem
   openssl pkcs12 -in pass.p12 -nocerts        -out pass.key   # asks for passphrase
   ```

4. Download the **Apple WWDR (G4)** intermediate cert from Apple PKI and
   convert to PEM (`openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem`).
5. Place PNG assets at `backend/assets/wallet/chess/`:
   `icon.png` (29×29), `icon@2x.png` (58×58), `logo.png` (160×50),
   `logo@2x.png` (320×100).
6. Set `APPLE_WALLET_*` env vars (see `.env.example`). The endpoint
   shells out to `openssl smime -sign` to detach-sign `manifest.json`
   into PKCS#7 DER.

## Google Wallet

1. Enable the **Google Wallet API** in your Google Cloud project at
   <https://console.cloud.google.com>.
2. Create a service account, grant it the **Wallet Object Issuer** role,
   download the JSON key.
3. Set `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_PATH` to the file path
   (preferred) OR `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` to the raw JSON.
4. In <https://pay.google.com/business/console> → Wallet API → create an
   **Event Ticket Class** (e.g. `<issuer>.bookedai_chess_session`).
5. Set `GOOGLE_WALLET_ISSUER_ID` and `GOOGLE_WALLET_EVENT_CLASS_ID`.
   The endpoint signs an RS256 JWT and returns
   `https://pay.google.com/gp/v/save/<jwt>`.

## Test card flow

- Open `/api/v1/orders/<order_reference>/wallet/apple` on iOS Safari and
  tap the resulting `.pkpass` to add to Apple Wallet. Use a real Apple
  device — the simulator does not support pass install.
- Open the Google save URL on Android Chrome (signed in to a Google
  account with Wallet enabled). For a smoke test, `jwt.io` will decode
  the JWT payload so you can verify the session details before install.
