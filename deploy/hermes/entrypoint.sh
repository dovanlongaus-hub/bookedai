#!/bin/sh

set -eu

required_vars="
HERMES_ALGOLIA_APPLICATION_ID
HERMES_ALGOLIA_SEARCH_API_KEY
HERMES_ALGOLIA_WRITE_API_KEY
HERMES_GOOGLE_WORKSPACE_DOMAIN
HERMES_GOOGLE_WORKSPACE_DOCS_FOLDER
HERMES_GOOGLE_WORKSPACE_DRAFTS_FOLDER
HERMES_GOOGLE_WORKSPACE_SHORTCUTS_FOLDER
HERMES_GOOGLE_OAUTH2_CLIENT_ID
HERMES_GOOGLE_AUTH_CLIENT_EMAIL
HERMES_GOOGLE_AUTH_PRIVATE_KEY
HERMES_GOOGLE_AUTH_SUBJECT
"

missing_vars=""
for var_name in ${required_vars}; do
  eval "var_value=\${${var_name}:-}"
  if [ -z "${var_value}" ]; then
    missing_vars="${missing_vars} ${var_name}"
  fi
done

if [ -n "${missing_vars}" ]; then
  mkdir -p /var/www/setup
  cat > /var/www/setup/index.html <<EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hermes Setup Pending</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 32px; }
    main { max-width: 840px; margin: 0 auto; }
    h1 { margin: 0 0 16px; font-size: 32px; }
    p { color: #cbd5e1; line-height: 1.6; }
    pre { background: #111827; color: #93c5fd; padding: 16px; border-radius: 12px; overflow: auto; }
    .card { background: #111827; border: 1px solid #334155; border-radius: 16px; padding: 24px; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>Hermes is installed on this server</h1>
      <p>The Docker service, reverse proxy, TLS routing, and domain are ready. Hermes is waiting for external provider credentials before the real application can start.</p>
      <p>Missing environment variables:</p>
      <pre>$(printf '%s\n' "${missing_vars}" | xargs -n1)</pre>
      <p>Add the missing values to the BookedAI <code>.env</code> file, then rebuild the <code>hermes</code> service.</p>
    </div>
  </main>
</body>
</html>
EOF
  exec python3 -m http.server 8080 --directory /var/www/setup
fi

mkdir -p /var/lib/hermes
python3 /app/generate_config.py > /var/lib/hermes/config.hcl

exec /usr/local/bin/hermes server -config=/var/lib/hermes/config.hcl
