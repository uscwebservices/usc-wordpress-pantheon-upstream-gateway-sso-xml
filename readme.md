# USC WordPress Pantheon Upsteam Gateway SSO XML

[![Scheduled XML Build](https://github.com/uscwebservices/usc-wordpress-pantheon-upstream-gateway-sso-xml/actions/workflows/scheduled-xml-build.yml/badge.svg)](https://github.com/uscwebservices/usc-wordpress-pantheon-upstream-gateway-sso-xml/actions/workflows/scheduled-xml-build.yml)
[![Create Release](https://github.com/uscwebservices/usc-wordpress-pantheon-upstream-gateway-sso-xml/actions/workflows/create-release.yml/badge.svg)](https://github.com/uscwebservices/usc-wordpress-pantheon-upstream-gateway-sso-xml/actions/workflows/create-release.yml)

This is a publicly readable XML output of all available sites running on the USC WordPress Pantheon Upsteam Gateway to allow Single Sign-On (SSO) via Shibboleth.

Every hour a CRON will trigger a Github Action to get all site environments and Domains (for live environments) and construct the XML `usc-pantheon-gateway-sso.xml`. A preliminary data sample exists as `usc-pantheon-gateway-sso-example.xml`.

## Tags

As of `v2.0.0`, the XML will include any Upstreams for WordPress or Drupal specified by IDs (see [Required Secrets](#required-secrets)) as well as any site that has the following tags applied to it:

| Tag               | Site Type                                            | Login URL append                       |
| ----------------- | ---------------------------------------------------- | -------------------------------------- |
| `sso-wp-root`     | Default WordPress site (running at `root` directory) | `/wp-login.php?action=wp-saml-auth`    |
| `sso-wp-web`      | WordPress site running at `web` subdirectory         | `/wp/wp-login.php?action=wp-saml-auth` |
| `sso-drupal-root` | Default Drupal site (running at `root` directory)    | `/user/login/`                         |
| `sso-drupal-web`  | Drupal site running at `web` subdirectory            | `/web/user/login/`                     |

If you have a site that requires something different, please utilize the [Custom URLs](#custom-urls) method.

_NOTE:_ See [Pantheon Docs](https://docs.pantheon.io/nested-docroot) for information on `web` subdirectories.

## Required Secrets

Add the following to the repo secrets:

| Secret                              | Type     | Sample                    | Description                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------- | -------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_TOKEN_GITHUB`                  | `string` | `1a2b3c4d5e6f`            | personal access token to Github private repositories. Needed to set composer authentication when pulling dependencies. Create token under [Github -> Settings -> Developer Settings -> Personal Access Tokens](https://github.com/settings/tokens) Needs access `repo`, `workflow`, `write:packages`, `delete:packages`, `notifciations` access with SSO enabled. |
| `TERMINUS_ORG_ID`                   | `string` | `1234567890`              | The Pantheon Organization ID for sites with the upstream.                                                                                                                                                                                                                                                                                                         |
| `TERMINUS_UPSTREAMS_WORDPRESS_WEB`  | `string` | `098765434231,1234567890` | The Pantheon Upstream IDs for WordPress Upstreams using the `web` subdirectory.                                                                                                                                                                                                                                                                                   |
| `TERMINUS_UPSTREAMS_WORDPRESS_ROOT` | `string` | `098765434231,1234567890` | The Pantheon Upstream IDs for WordPress Upstreams using the `root` subdirectory.                                                                                                                                                                                                                                                                                  |
| `TERMINUS_UPSTREAMS_DRUPAL_WEB`     | `string` | `098765434231,1234567890` | The Pantheon Upstream IDs for Drupal Upstreams using the `web` subdirectory.                                                                                                                                                                                                                                                                                      |
| `TERMINUS_UPSTREAMS_DRUPAL_ROOT`    | `string` | `098765434231,1234567890` | The Pantheon Upstream IDs for Drupal Upstreams using the `root` subdirectory.                                                                                                                                                                                                                                                                                     |
| `TERMINUS_TOKEN`                    | `string` | `1a2b3c4d5e6f`            | Personal access token to Pantheon organization (obtained from Pantheon). Create a token under your Pantheon account in Account -> Machine Tokens.                                                                                                                                                                                                                 |

## Custom URLs

You can add custom URL's to be included in the XML output. Open `customURLs.json` and add the URL to the array within the JSON Object:

```json
{
  "sites": {
    "dev-usc-custom-urls.pantheonsite.io": {
      "urn": "dev-usc-custom-urls.pantheonsite.io",
      "location": "dev-usc-custom-urls.pantheonsite.io/wp-login.php?action=wp-saml-auth"
    },
    "test-usc-custom-urls.pantheonsite.io": {
      "urn": "test-usc-custom-urls.pantheonsite.io",
      "location": "test-usc-custom-urls.pantheonsite.io/wp-login.php?action=wp-saml-auth"
    },
    "live-usc-custom-urls.pantheonsite.io": {
      "urn": "live-usc-custom-urls.pantheonsite.io",
      "location": "live-usc-custom-urls.pantheonsite.io/wp-login.php?action=wp-saml-auth"
    }
  }
}
```

## Running Locally

You can run this package locally using the commands below and replacing any `<variables-in-angle-brackets>` or by copying `local-sample.sh` as `local.sh` and replacing the variables in there to run as `./local.sh`.

**_IMPORTANT: DO NOT COMMIT ID'S OR SECRETS TO REPOS!_**

```console
export TERMINUS_ORG_ID=<terminus-org-id> &&
export TERMINUS_UPSTREAMS_WORDPRESS_WEB="<org-upstream-id-1>,<org-upstream-id-2>" &&
export TERMINUS_UPSTREAMS_WORDPRESS_ROOT="<org-upstream-id-1>,<org-upstream-id-2>" &&
export TERMINUS_UPSTREAMS_DRUPAL_WEB="<org-upstream-id-1>,<org-upstream-id-2>" &&
export TERMINUS_UPSTREAMS_DRUPAL_ROOT="<org-upstream-id-1>,<org-upstream-id-2>" &&
npm ci
composer install --prefer-dist
node index.js
```
