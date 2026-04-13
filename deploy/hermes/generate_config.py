import json
import os


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


def q(value: str) -> str:
    return json.dumps(value)


private_key = env("HERMES_GOOGLE_AUTH_PRIVATE_KEY").replace("\\n", "\n")

config = f"""base_url = {q(env("HERMES_BASE_URL", "https://hermes.bookedai.au"))}
log_format = "standard"

algolia {{
  application_id            = {q(env("HERMES_ALGOLIA_APPLICATION_ID"))}
  docs_index_name           = {q(env("HERMES_ALGOLIA_DOCS_INDEX_NAME", "docs"))}
  drafts_index_name         = {q(env("HERMES_ALGOLIA_DRAFTS_INDEX_NAME", "drafts"))}
  internal_index_name       = {q(env("HERMES_ALGOLIA_INTERNAL_INDEX_NAME", "internal"))}
  links_index_name          = {q(env("HERMES_ALGOLIA_LINKS_INDEX_NAME", "links"))}
  missing_fields_index_name = {q(env("HERMES_ALGOLIA_MISSING_FIELDS_INDEX_NAME", "missing_fields"))}
  projects_index_name       = {q(env("HERMES_ALGOLIA_PROJECTS_INDEX_NAME", "projects"))}
  search_api_key            = {q(env("HERMES_ALGOLIA_SEARCH_API_KEY"))}
  write_api_key             = {q(env("HERMES_ALGOLIA_WRITE_API_KEY"))}
}}

email {{
  enabled = false
}}

feature_flags {{
  flag "api_v2" {{
    enabled = false
  }}

  flag "projects" {{
    enabled = false
  }}
}}

google_workspace {{
  create_doc_shortcuts = true
  docs_folder          = {q(env("HERMES_GOOGLE_WORKSPACE_DOCS_FOLDER"))}
  domain               = {q(env("HERMES_GOOGLE_WORKSPACE_DOMAIN"))}
  drafts_folder        = {q(env("HERMES_GOOGLE_WORKSPACE_DRAFTS_FOLDER"))}
  shortcuts_folder     = {q(env("HERMES_GOOGLE_WORKSPACE_SHORTCUTS_FOLDER"))}

  auth {{
    client_email        = {q(env("HERMES_GOOGLE_AUTH_CLIENT_EMAIL"))}
    create_docs_as_user = false
    private_key         = {q(private_key)}
    subject             = {q(env("HERMES_GOOGLE_AUTH_SUBJECT"))}
    token_url           = "https://oauth2.googleapis.com/token"
  }}

  oauth2 {{
    client_id    = {q(env("HERMES_GOOGLE_OAUTH2_CLIENT_ID"))}
    hd           = {q(env("HERMES_GOOGLE_OAUTH2_HD", env("HERMES_GOOGLE_WORKSPACE_DOMAIN")))}
    redirect_uri = {q(env("HERMES_GOOGLE_OAUTH2_REDIRECT_URI", "https://hermes.bookedai.au/torii/redirect.html"))}
  }}
}}

indexer {{
  max_parallel_docs            = 5
  update_doc_headers           = true
  update_draft_headers         = true
  use_database_for_document_data = false
}}

postgres {{
  dbname   = {q(env("HERMES_POSTGRES_DB", "hermes"))}
  host     = {q(env("HERMES_POSTGRES_HOST", "supabase-db"))}
  password = {q(env("HERMES_POSTGRES_PASSWORD"))}
  port     = {int(env("HERMES_POSTGRES_PORT", "5432"))}
  user     = {q(env("HERMES_POSTGRES_USER", "hermes_app"))}
}}

products {{
  product "Engineering" {{
    abbreviation = "ENG"
  }}

  product "Labs" {{
    abbreviation = "LAB"
  }}

  product "Operations" {{
    abbreviation = "OPS"
  }}
}}

document_types {{
  document_type "RFC" {{
    long_name   = "Request for Comments"
    description = "Create a Request for Comments document."
    flight_icon = "discussion-circle"
    template    = {q(env("HERMES_TEMPLATE_RFC", "placeholder-rfc-template-id"))}

    custom_field {{
      name = "Stakeholders"
      type = "people"
    }}
  }}

  document_type "PRD" {{
    long_name   = "Product Requirements"
    description = "Create a Product Requirements document."
    flight_icon = "target"
    template    = {q(env("HERMES_TEMPLATE_PRD", "placeholder-prd-template-id"))}

    custom_field {{
      name = "Stakeholders"
      type = "people"
    }}
  }}
}}

server {{
  addr = "0.0.0.0:8080"
}}
"""

print(config)
