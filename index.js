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
const envRegex = /["']/g,
terminusOrgID = process.env.TERMINUS_ORG_ID.trim(),
terminusWordpressUpstreamWeb = process.env.TERMINUS_UPSTREAMS_WORDPRESS_WEB.trim().replace(envRegex, ""),
terminusWordpressUpstreamRoot = process.env.TERMINUS_UPSTREAMS_WORDPRESS_ROOT.trim().replace(envRegex, ""),
terminusDrupalUpstreamWeb = process.env.TERMINUS_UPSTREAMS_DRUPAL_WEB.trim().replace(envRegex, ""),
terminusDrupalUpstreamRoot = process.env.TERMINUS_UPSTREAMS_DRUPAL_ROOT.trim().replace(envRegex, "");

let domainCount = environmentCount = customURLCount = 0;


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
 * Organization Site List gets the list of sites for an upstream in JSON format with name and id
 *
 * @param   {string}  upstreamID  ID of Upstream to query
 *
 * @return  {object}              Object of sites in upstream
 */
async function terminusOrgSiteListUpstream(upstreamID) {
    return new Promise(resolve => {
		resolve( exec(`terminus org:site:list ${terminusOrgID} --upstream=${upstreamID} --fields=name,id --format=json`) );
	});
}

/**
 * Get site environments (including multidev) available by ID.
 *
 * @param   {string}  siteID  Site ID to get envionments
 *
 * @return  {object}          Object of site envrionments
 */
async function terminusEnvironmentList(siteID) {
	return new Promise(resolve => {
		resolve( exec(`terminus env:list --fields=domain --format=json ${siteID}`) );
	});
}

/**
 * Get site domains by base sitename.
 *
 * @param   {string}  siteName  Site Name to query
 *
 * @return  {object}            Object of Domains attached to live environment
 */
async function terminusDomainList(siteName) {
	return new Promise(resolve => {
		resolve( exec(`terminus domain:list --fields=id --format=json -- ${siteName}.live`) );
	});
}

/**
 * Convert all site data to XML format
 *
 * @param   {object}  sitesList  Object of all sites and their associated urls
 *
 * @return  null                 Outputs XML file
 */
async function createSitesXML(sitesList) {

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
            'ids':'',
            'appendUrl':appendURL
        }
    );

    return obj;
}

/**
 * Get stdout data and convert to JSON
 *
 * @param   {string}  data  String of data in Object formatting
 *
 * @return  {object}        Object of data
 */
function getJSONstdout(data) {

    try {
        if ( 'undefined' === typeof(data) || 'object' !== typeof(data)) throw "getJSONstdout: data is not set";
    }
    catch(err) {
        console.error(err);
        return;
    }

    if (false === data.stderr) {
        console.log(data.stderr);
    }

    // Convert string to JSON Object
    if (false !== data.stderr) {

       return JSON.parse(data.stdout);

    }

    return false;
}

/**
 * Get all associated URL's by API type
 *
 * @param   {object}  obj          Object of data type {cms:wordpress, api:upstream, tagName:sso-wp-web, appendURL:url-path}
 * @param   {array}  upstreamIDs   Array of upstream IDs to check by cms and web directory type
 *
 * @return  {array}                Array of urn and url locations
 */
async function getAllSitesByType (obj)   {

    try {
        if ( 'undefined' === typeof(obj) || 'object' !== typeof(obj)) throw "getAllSitesByType: obj is not set";
        if ( 'undefined' === typeof(obj.ids) ) throw "getAllSitesByType: obj.ids is not set";
        if ( 'undefined' === typeof(obj.appendUrl) ) throw "getAllSitesByType: obj.appendUrl is not set";
    }
    catch(err) {
        console.error(err);
    }

    console.log('Starting to process ' + obj.cms + ': ' + obj.api + ': ' + obj.tagName);

    let allSitesData = new Object();
    let names = new Array();
    let ids = new Array();
	let environments = new Array();
	let domains = new Array();
    let upstreamIDs = obj.ids;
    let upstreamLoginAppend = obj.appendUrl;

    if ( 'tag' === obj.api) {

        console.log("running tag");

        let results = await terminusOrgSiteListTag(obj.tagName);

        allSitesData = Object.assign( allSitesData, getJSONstdout(results) );
    }

    if ( 'upstream' === obj.api && 0 !== upstreamIDs.length ) {

        console.log("running upstream");

        upstreamIDs = upstreamIDs.split(',');

        // For each upstream, get the site data
        for (let i in upstreamIDs) {

            let results = await terminusOrgSiteListUpstream(upstreamIDs[i]);

            allSitesData = Object.assign( allSitesData, getJSONstdout(results) );

        }

    }

    // Convert Object to Array of Objects
    const entries = Object.entries(allSitesData);

    // TODO: set as separate function
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

    // TODO: set as separate function
    // Get domains associated with live environments
    for (const name of names) {
        const result = await terminusDomainList(name);

        if (false === result.stderr) {
            console.log(result.stderr);
        }

        if (false !== result.stderr) {
            const siteDomains = JSON.parse(result.stdout);

            const entries = Object.entries(siteDomains);

            for (const entry of entries) {
                if ( undefined !== entry[1].id ) {

                    // Data Sample: ["live-site.pantheonsite.io",{"id":"live-site.pantheonsite.io"}]
                    domains.push(
                        `{"urn": "${entry[1].id}", "location": "${entry[1].id}${upstreamLoginAppend}"}`
                    );
                    console.log(`Adding Domain: ${entry[1].id}`);

                    domainCount ++;

                }

                if ( undefined === entry[1].id ) {
                    console.log(`Failure to add Domain: ${entry[1]}`);
                }
            }
        }
    }

    // TODO: set as separate function
    // Get environments associated with sites
    for (const id of ids) {
        const result = await terminusEnvironmentList(id);

        if (false === result.stderr) {
            console.log(result.stderr);
        }

        if (false !== result.stderr) {
            const siteEnvs = JSON.parse(result.stdout);

            const entries = Object.entries(siteEnvs);

            for (const entry of entries) {
                if ( undefined !== entry[1].domain ) {

                    // Data Sample: ["dev",{"domain":"dev-site.pantheonsite.io"}]
                    environments.push(
                        `{"urn": "${entry[1].domain}", "location": "${entry[1].domain}${upstreamLoginAppend}"}`
                    );
                    console.log(`Adding Environment: ${entry[1].domain}`);

                    environmentCount ++;
                }
            }
        }
    }

     // Set data as an Object
    //  const fullSiteList = new Object;
    //  fullSiteList.sites = domains.concat(environments);
    //  const exportSitesList = fullSiteList.sites;

    /**
     * So, yes, it used to be an object but it was easier
     * to parse an array in allSitesToXML when combining
     * multiple streams to pass to XML generator.
     */

     // Return array

    return domains.concat(environments);


}

/**
 * Get Custom URLs from customURLs.json
 *
 * @return  {object}  object of custom site urls
 */
async function getCustomURLs() {

    let domains = new Array();

    const customURLsFile = require('./customURLs.json');
    const customURLs = Object.entries(customURLsFile.sites);

    if ( undefined !== customURLs) {
        for (const url of customURLs) {
            domains.push(
                `{"urn": "${url[1].urn}", "location": "${url[1].location}"}`
            );
            console.log(`Adding Custom URL: ${url[1].urn}`);

            customURLCount ++;
        }

    }

    const fullSiteList = new Object;
    fullSiteList.sites = domains;
    const exportSitesList = fullSiteList.sites;

    /**
     * So, yes, it used to be an object but it was easier
     * to parse an array in allSitesToXML when combining
     * multiple streams to pass to XML generator.
     */

    return domains;
}


/**
 * Function to process the different types of site lists and export XML
 *
 * @return  {null}  Passes data to createsSitesXML
 */
async function allSitesToXML() {

    let fullSiteList = new Array;

    // Preset WordPress site types by Tag or Upstream
    let wordpressUpstreamWeb = getSiteTypes('wordpress', 'upstream', true);
    let wordpressUpstreamRoot = getSiteTypes('wordpress', 'upstream', false);
    let wordpressTagWeb = getSiteTypes('wordpress', 'tag', true);
    let wordpressTagRoot = getSiteTypes('wordpress', 'tag', false);

    // Preset Drupal site types by Tag or Upstream
    let drupalUpstreamWeb = getSiteTypes('drupal', 'upstream', true);
    let drupalUpstreamRoot = getSiteTypes('drupal', 'upstream', false);
    let drupalTagWeb = getSiteTypes('drupal', 'tag', true);
    let drupalTagRoot = getSiteTypes('drupal', 'tag', false);

    // Assign upstream IDs
    wordpressUpstreamWeb.ids = terminusWordpressUpstreamWeb;
    wordpressUpstreamRoot.ids = terminusWordpressUpstreamRoot;
    drupalUpstreamWeb.ids = terminusDrupalUpstreamWeb;
    drupalUpstreamRoot.ids = terminusDrupalUpstreamRoot;

    // Get all of the types of sites
    let drupalTagRootFn = await getAllSitesByType(drupalTagRoot);
    let drupalTagWebFn = await getAllSitesByType(drupalTagWeb);
    let drupalUpstreamRootFn = await getAllSitesByType(drupalUpstreamRoot);
    let drupalUpstreamWebFn = await getAllSitesByType(drupalUpstreamWeb);

    let wordpressTagRootFn = await getAllSitesByType(wordpressTagRoot);
    let wordpressTagWebFn = await getAllSitesByType(wordpressTagWeb);
    let wordpressUpstreamRootFn = await getAllSitesByType(wordpressUpstreamRoot);
    let wordpressUpstreamWebFn = await getAllSitesByType(wordpressUpstreamWeb);

    // Get Custom URLs
    let getCustomURLsFn =   await getCustomURLs();

    // Bring all the URLs together
    fullSiteList = fullSiteList.concat(wordpressTagRootFn, wordpressTagWebFn, wordpressUpstreamRootFn, wordpressUpstreamWebFn, drupalTagRootFn, drupalTagWebFn, drupalUpstreamRootFn, drupalUpstreamWebFn, getCustomURLsFn);

    // Output some messaging for verification in github
    let totalSiteCount = domainCount + environmentCount + customURLCount;
    let xmlLines = (totalSiteCount * 5) + 3;
    let siteCountsMessage = false;

    if ( fullSiteList.length === totalSiteCount ) {
        siteCountsMessage = true;
    }

    const build_message = `
        Full Site List: ${fullSiteList.length}
        Domains: ${domainCount}
        Environments: ${environmentCount}
        Custom URLS: ${customURLCount}
        Total Site Count: ${totalSiteCount}
        Match: ${siteCountsMessage}
        Total XML Lines should be: ${xmlLines}
    `;

    console.log(build_message);

    createSitesXML(fullSiteList);

}


// Fetch all sites and create XML
allSitesToXML();