/**
 * This script will get all sites and their envirionment based on:
 * 1. Being on an upstream that are set in an environment variable of TERMINUS_UPSTREAMS separated by commas
 *     a. Example export TERMINUS_UPSTREAMS='123456,654321`;
 * 2. Sites in Pantheon that have the following tags:
 *     a. `sso-wp-root` - sets login to `/wp-login`
 *     b. `sso-wp-web` - sets the login to `/wp/wp-login`
 * 3. Manual site list found in customURLS.json in XML format
 *
 *
 * Order in which we need to get site information:
 * 1. terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
 * 2. terminus env:list --field=domain <site-id>
 * 3. terminus domain:list --format FORMAT --fields FIELDS --field FIELD -- <site>.<env>
 * 4. manual site list injection
 */

// Require utilities
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const { create } = require('xmlbuilder2');
const fs = require('fs');

// Set variables from shell environment for Organization and Upstream IDs
const terminusOrgID = process.env.TERMINUS_ORG_ID,
terminusWordpressUpstreamWeb = process.env.TERMINUS_UPSTREAMS_WORDPRESS_WEB,
terminusWordpressUpstreamRoot = process.env.TERMINUS_UPSTREAMS_WORDPRESS_ROOT,
terminusDrupalUpstreamWeb = process.env.TERMINUS_UPSTREAMS_DRUPAL_WEB,
terminusDrupalUpstreamRoot = process.env.TERMINUS_UPSTREAMS_DRUPAL_ROOT;

/**
 * Get the type of api and appening url
 *
 * @param   {string}  cms           type of cms: drupal, wordpress (default)
 * @param   {string}  type          api call to make: tag, upstream (default)
 * @param   {boolean}  webDirectory include web diretory: false, true (default)
 *
 * @return  {object}                object of values
 */
function getSiteTypes(cms = 'wordpress', api = 'upstream', webDirectory = true) {

    try {
        if ( 'undefined' === typeof(cms) || '' === cms ) throw "getSiteTypes: cms is not set";
        if ( 'undefined' === typeof(api) || '' === api ) throw "getSiteTypes: api is not set";
        if ( 'undefined' === typeof(webDirectory) || '' === webDirectory ) throw "getSiteTypes: webDirectory is not set";
    }
    catch(err) {
        console.error(err);
    }


    let prependURL = appendURL = '';
    let tagName = 'sso-';
    let tagNameDir = 'root';
    let obj = new Object;

    if ( 'undefined' === typeof(webDirectory) || '' === webDirectory ) {
        // you should really be using web directory for security
        webDirectory = true;
    }

    switch(cms) {
        case 'drupal':
            tagName += 'drupal-';
            prependURL = '/web';
            appendURL = '/user/login/';
            break;
        default:
            tagName += 'wp-';
            prependURL = '/wp';
            appendURL = '/wp-login.php?action=wp-saml-auth';
            break;
    }

    switch (api) {
        case 'tag':
            api = 'tag';
            break;
        default:
            api = 'upstream';
            break;
    }

    if ( true === webDirectory ) {
        appendURL = prependURL + appendURL;
        tagNameDir = 'web';
    }

    obj = Object.assign( obj,
        {
            'cms':cms,
            'api':api,
            'tagName':tagName + tagNameDir,
            'appendUrl':appendURL
        }
    );

    return obj;
}

/**
 * Get all sites associated with a tag
 *
 * @param   {string}  orgID  Orgnaization ID in Pantheon
 * @param   {string}  tag    Tag to query against sites
 *
 * @return  {object}         Object of data for site
 */
async function terminusOrgSiteListTag(tag) {
    return new Promise(resolve => {
		resolve( exec(`terminus org:site:list ${terminusOrgID} --tag=${tag} --fields=name,id --format=json`) );
	});
}

/**
 * Organization Site List
 * @param {string} orgID
 * @param {string} upstreamID
 * @returns object
 */
async function orgSiteList(orgID, upstreamID) {
    return new Promise(resolve => {
		resolve( exec(`terminus org:site:list ${orgID} --upstream=${upstreamID} --fields=name,id --format=json`) );
	});
}

/**
 * Get site environments available by ID.
 * @param {string} siteID
 * @returns object
 */
async function siteEnvironments(siteID) {
	return new Promise(resolve => {
		resolve( exec(`terminus env:list --fields=domain --format=json ${siteID}`) );
	});
}

/**
 * Get site domains by base sitename.
 * @param {string} siteName
 * @returns object
 */
async function siteDomains(siteName) {
	return new Promise(resolve => {
		resolve( exec(`terminus domain:list --fields=id --format=json -- ${siteName}.live`) );
	});
}

/**
 * Site List Data
 * @param {string} orgID
 * @param {string} siteID
 * @returns object
 */
async function siteListData(orgID, siteID) {

    const result = await orgSiteList(orgID, siteID);

	if (false === result.stderr) {
		console.log(result.stderr);
	}

	// Convert string to JSON Object
	if (false !== result.stderr) {

        return JSON.parse(result.stdout);

	}
    return false;
}


/**
 * Get all sites and compose XML output
 */
async function allSitesToXML() {

	// Set empty arrays for names and ids
    let upstreamIDs = terminusUpstreams;
    let allSitesData = {};
    let names = [];
    let ids = [];
	let environments = [];
	let domains = [];
    const upstreamLoginAppend = '/wp/wp-login.php?action=wp-saml-auth';

    console.log('Establishing connection to Pantheon');

    try {
        if ( 'undefined' === typeof(terminusUpstreams) ) throw "Upstream IDs secret is not set";
    }
    catch(err) {
        console.error(err);
    }

    if ( 'string' === typeof(upstreamIDs) && 0 !== upstreamIDs ) {

        upstreamIDs = upstreamIDs.split(',');

        for (let i in upstreamIDs) {

            let results = await siteListData(terminusOrgID,upstreamIDs[i]);

            allSitesData = Object.assign(allSitesData, results);

        }

        // Convert Object to Array of Objects
        const entries = Object.entries(allSitesData);

        console.log('Sites using upstreams: ' + entries.length);

        for (const entry of entries) {

			if ( undefined !== entry[1].name ) {
				names.push(entry[1].name);
				console.log('pushing name:' + entry[1].name);
			}
			if ( undefined === entry[1].name ) {
				console.log('prod upstream undefined: entry[1].name');
			}


			if ( undefined !== entry[1].id ) {
				ids.push(entry[1].id);
				console.log('pushing id for:' + entry[1].name);
			}
			if ( undefined === entry[1].id ) {
				console.log('prod upstream undefined: entry[1].id');
			}
		}

        // Get domains associated with live environments
        for (const name of names) {
            const result = await siteDomains(name);

            if (false === result.stderr) {
                console.log(result.stderr);
            }

            if (false !== result.stderr) {
                const siteDomains = JSON.parse(result.stdout);

                const entries = Object.entries(siteDomains);

                for (const entry of entries) {
                    if ( undefined !== entry[1].id ) {
                        // domains.push(entry[1].id);
                        domains.push(
                            `{"urn": "${entry[1].id}", "location": "${entry[1].id}${upstreamLoginAppend}"}`
                        );
                        console.log(`Adding Domain: ${entry[1].id}`);
                    }

                    if ( undefined === entry[1].id ) {
                        console.log(`Failure to add Domain: ${entry[1]}`);
                    }
                }
            }
        }

        // Get environments associated with sites
        for (const id of ids) {
            const result = await siteEnvironments(id);

            if (false === result.stderr) {
                console.log(result.stderr);
            }

            if (false !== result.stderr) {
                const siteEnvs = JSON.parse(result.stdout);

                const entries = Object.entries(siteEnvs);

                for (const entry of entries) {
                    if ( undefined !== entry[1].domain ) {
                        environments.push(
                            `{"urn": "${entry[1].domain}", "location": "${entry[1].domain}${upstreamLoginAppend}"}`
                        );
                        console.log(`Adding Environment: ${entry[1].domain}`);
                    }
                }
            }
        }

        // Add manual site list
		const customURLsFile = require('./customURLs.json');
        const customURLs = Object.entries(customURLsFile.sites);

		if ( undefined !== customURLs) {
			for (const url of customURLs) {
				domains.push(
                    `{"urn": "${url[1].urn}", "location": "${url[1].location}"}`
                );
                console.log(`Adding Custom URL: ${url[1].urn}`);
			}

		}

        // Set data as an Object
        const fullSiteList = new Object;
        fullSiteList.sites = domains.concat(environments);
        const sitesList = fullSiteList.sites;

        // Create XML format
        const root = create({ version: '1.0' })
            .ele('md:EntitiesDescriptor', {
                    'xmlns:md': 'urn:oasis:names:tc:SAML:2.0:metadata',
                    'xmlns:mdui':'urn:oasis:names:tc:SAML:2.0:metadata:ui',
                    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                    'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
                    'xsi:schemaLocation': 'urn:oasis:names:tc:SAML:2.0:metadata ../schemas/saml-schema-metadata-2.0.xsd urn:mace:shibboleth:metadata:1.0 ../schemas/shibboleth-metadata-1.0.xsd http://www.w3.org/2000/09/xmldsig# ../schemas/xmldsig-core-schema.xsd',
                    'Name': 'https://www.usc.edu/its/pantheon'
                })

            let siteIndex = 0;
            for (const siteData of sitesList){

                // const site = Object.entries(fullSiteList.sites[i]);
                const site = JSON.parse(siteData);

                const entityDesc = root.ele('md:EntityDescriptor');

                // entityDesc.att('entityID', `urn:${fullSiteList.sites[i].urn}`)
                entityDesc.att('entityID', `urn:${site.urn}`)
                    .ele('md:SPSSODescriptor', {
                        'AuthnRequestsSigned': 'false',
                        'WantAssertionsSigned': 'true',
                        'protocolSupportEnumeration': 'urn:oasis:names:tc:SAML:2.0:protocol'
                    })
                        .ele('md:AssertionConsumerService', {
                            'Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
                            'Location': `https://${site.location}`,
                            'index': `${siteIndex}`
                        })
                siteIndex++;
            }

            const xml = root.end({ prettyPrint: true });

            // Output XML to file.
            let full_file_name = "./usc-pantheon-gateway-sso.xml";
            fs.writeFileSync(full_file_name, xml, function(err) {
                if (err) throw err;
            });

    }


}

// Fetch all sites and create XML
allSitesToXML();