# USC WordPress Pantheon Upsteam Gateway SSO XML

[![Scheduled XML Build](https://github.com/uscwebservices/usc-wordpress-pantheon-upstream-gateway-sso-xml/actions/workflows/scheduled-xml-build.yml/badge.svg)](https://github.com/uscwebservices/usc-wordpress-pantheon-upstream-gateway-sso-xml/actions/workflows/scheduled-xml-build.yml)
[![Create Release](https://github.com/uscwebservices/usc-wordpress-pantheon-upstream-gateway-sso-xml/actions/workflows/create-release.yml/badge.svg)](https://github.com/uscwebservices/usc-wordpress-pantheon-upstream-gateway-sso-xml/actions/workflows/create-release.yml)

This is a publicly readable XML output of all available sites running on the USC WordPress Pantheon Upsteam Gateway to allow Single Sign-On (SSO) via Shibboleth.

Every hour a CRON will trigger a Github Action to get all site environments and Domains (for live environments) and construct the XML `usc-pantheon-gateway-sso.xml`.  A preliminary data sample exists as `usc-pantheon-gateway-sso-example.xml`.

### Required Secrets

Add the following to the repo secrets:

Secret | Type | Sample | Description
-------|------|---------|------------
`API_TOKEN_GITHUB` | `string` | `1a2b3c4d5e6f` | personal access token to Github private repositories.  Needed to set composer authentication when pulling dependencies.  Create token under [Github -> Settings -> Developer Settings -> Personal Access Tokens](https://github.com/settings/tokens)  Needs access `repo`, `workflow`, `write:packages`, `delete:packages`, `notifciations` access with SSO enabled.
`TERMINUS_ORG_ID` | `string` | `1234567890` | The Pantheon Organization ID for sites with the upstream.
`TERMINUS_ORG_UPSTREAM_ID` | `string` | `098765434231` | The Pantheon Upstream ID for this upstream.
`terminusTestUpstreamID` | `string` | `098765434231` | The Pantheon Upstream ID for the TEST upstream.
`TERMINUS_TOKEN` | `string` | `1a2b3c4d5e6f` | Personal access token to Pantheon organization (obtained from Pantheon).  Create a token under your Pantheon account in Account -> Machine Tokens.
