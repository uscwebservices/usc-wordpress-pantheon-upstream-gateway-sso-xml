const terminusUpstreamID = process.env.TERMINUS_UPSTREAM_ID,
terminusOrgID = process.env.TERMINUS_ORG_ID;

const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

// 1. terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
// 2. terminus env:list --field=domain <site-id>
// 3. terminus domain:list --format FORMAT --fields FIELDS --field FIELD -- <site>.<env>


// 1. terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
function orgSiteList() {
	return new Promise(resolve => {
		resolve( exec(`terminus org:site:list ${terminusOrgID} --upstream=${terminusUpstreamID} --fields=name,id --format=json`) );
	});
}

// 2. terminus env:list --field=domain <site-id>
function siteEnvironments(site) {
	return new Promise(resolve => {
		resolve( exec(`terminus env:list --field=domain ${site}`) );
	});
}

// 3. terminus domain:list --format FORMAT --fields FIELDS --field FIELD -- <site>.<env>
function siteDomains(site) {
	return new Promise(resolve => {
		resolve( exec(`terminus domain:list --fields=id --format=json -- ${site}.live`) );
	});
}

function getSite(data, type) {

}

function isObject(val) {
	if (val === null) {
		return false;
	}

	return typeof val === 'object';
}



async function allSites() {

	// Set empty arrays for names and ids
	let names = [];
	let ids = [];
	console.log('calling');

	// Get list of org sites with id, name
	const result = await orgSiteList();

	// Convert string to JSON Object
	const strJSON = JSON.parse(result.stdout);

	const nestedObject = (obj) => {
	  for (const key in obj) {
		  if (isObject(obj[key])) {
			  nestedObject(obj[key]);
		  } else {
			if ( 'name' === key ) {
				names.push(obj[key]);
			}
			if ( 'id' === key ) {
				ids.push(obj[key]);
			}

		  }
	  }
	};

	// Iterate over nested objects
	nestedObject(strJSON);


	console.log(names);
	console.log(ids);
}

allSites();