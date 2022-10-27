// Require utilities
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const { create } = require('xmlbuilder2');
const fs = require('fs');

// Set variables from shell environment for Organization and Upstream IDs
const terminusUpstreamID = process.env.TERMINUS_ORG_UPSTREAM_ID,
terminusTestUpstreamID = process.env.TERMINUS_TEST_UPSTREAM_ID,
terminusOrgID = process.env.TERMINUS_ORG_ID;

// Order in which we need to get site information:
// 1. Procution Upstream: terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
// 2. Test Upstream: terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
// 3. terminus env:list --field=domain <site-id>
// 4. terminus domain:list --format FORMAT --fields FIELDS --field FIELD -- <site>.<env>


// 1. Production Upstream: terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
async function orgSiteList() {
	return new Promise(resolve => {
		resolve( exec(`terminus org:site:list ${terminusOrgID} --upstream=${terminusUpstreamID} --fields=name,id --format=json`) );
	});
}

// 2. Test Upstream: terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
async function orgTestSiteList() {
	return new Promise(resolve => {
		resolve( exec(`terminus org:site:list ${terminusOrgID} --upstream=${terminusTestUpstreamID} --fields=name,id --format=json`) );
	});
}

// 3. terminus env:list --field=domain <site-id>

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

// 4. terminus domain:list --format FORMAT --fields FIELDS --field FIELD -- <site>.<env>
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


async function allSitesToXML() {

	// Set empty arrays for names and ids
	let names = [];
	let ids = [];
	let environments = [];
	let domains = [];
	console.log('calling');

	// Get list of org sites with id, name
	const result = await orgSiteList();

	if (false === result.stderr) {
		console.log(result.stderr);
	}

	// Convert string to JSON Object
	if (false !== result.stderr) {

		const orgSites = JSON.parse(result.stdout);

		// Transform single object to array of site objects
		const entries = Object.entries(orgSites);

		console.log('Org Upstream: ' + entries.length);

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

	}

	// Get list of org test sites with id, name
	const testResult = await orgTestSiteList();

	if (false === testResult.stderr) {
		console.log(testResult.stderr);
	}

	// Convert string to JSON Object
	if (false !== testResult.stderr) {

		const testSites = JSON.parse(testResult.stdout);

		// Transform single object to array of site objects
		const entries = Object.entries(testSites);

		console.log('Test Upstream: ' + entries.length);

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
					domains.push(entry[1].id);
					console.log(`Adding Domain: ${entry[1].id}`);
				}

				if ( undefined === entry[1].id ) {
					console.log(`Failre to add Domain: ${entry[1]}`);
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
					environments.push(entry[1].domain);
					console.log(`Adding Environment: ${entry[1].domain}`);
				}
			}
		}
	}

	// Set data as an Object
	const fullSiteList = new Object;
	fullSiteList.sites = domains.concat(environments);

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
		for(let i = 0; i <= (fullSiteList.sites.length - 1); i++) {

			const entityDesc = root.ele('md:EntityDescriptor');

			entityDesc.att('entityID', `urn:${fullSiteList.sites[i]}`)
				.ele('md:SPSSODescriptor', {
					'AuthnRequestsSigned': 'false',
					'WantAssertionsSigned': 'true',
					'protocolSupportEnumeration': 'urn:oasis:names:tc:SAML:2.0:protocol'
				})
					.ele('md:AssertionConsumerService', {
						'Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
						'Location': `https://${fullSiteList.sites[i]}/wp/wp-login.php?action=wp-saml-auth`,
						'index': `${i}`
					})
		}

		const xml = root.end({ prettyPrint: true });
		// console.log(xml);

		// Output XML to file.
		let full_file_name = "./usc-pantheon-gateway-sso.xml";
		fs.writeFileSync(full_file_name, xml, function(err) {
			if (err) throw err;
		});


}

// Fetch all sites and create XML
allSitesToXML();