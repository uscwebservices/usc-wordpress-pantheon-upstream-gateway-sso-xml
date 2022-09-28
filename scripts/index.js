const terminusUpstreamID = process.env.TERMINUS_UPSTREAM_ID,
terminusOrgID = process.env.TERMINUS_ORG_ID;

const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

// 1. terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
// 2. terminus env:list --field=domain <site-id>
// 3. terminus domain:list --format FORMAT --fields FIELDS --field FIELD -- <site>.<env>


// 1. terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
async function orgSiteList() {
	return new Promise(resolve => {
		resolve( exec(`terminus org:site:list ${terminusOrgID} --upstream=${terminusUpstreamID} --fields=name,id --format=json`) );
	});
}

// 2. terminus env:list --field=domain <site-id>
async function siteEnvironments(siteID) {
	return new Promise(resolve => {
		resolve( exec(`terminus env:list --field=domain --format=json ${siteID}`) );
	});
}

// 3. terminus domain:list --format FORMAT --fields FIELDS --field FIELD -- <site>.<env>
async function siteDomains(siteName) {
	return new Promise(resolve => {
		resolve( exec(`terminus domain:list --fields=id --format=json -- ${siteName}.live`) );
	});
}

async function getSite(data, type) {

}

function isObject(val) {
	if (val === null) {
		return false;
	}

	return typeof val === 'object';
}

// async function nestedObject(obj) {
// 	let newOBJ = new Object;

// 	for (const key in obj) {
// 		if (isObject(obj[key])) {
// 			nestedObject(obj[key]);
// 		} else {
// 			// newOBJ.key = obj[key];
// 			// console.log(obj[key]);
// 			// console.log(`${key}: ${obj[key]}`);
// 			// newOBJ.`${key}` = `${obj[key]}`;
// 			newOBJ[key] = obj[key];

// 		}
// 		// console.log(newOBJ);
// 	}
// 	// console.log(newOBJ);
// 	return newOBJ;
// }



async function allSites() {

	// Set empty arrays for names and ids
	let names = [];
	let ids = [];
	let environments = [];
	let domains = [];
	console.log('calling');

	// Get list of org sites with id, name
	const result = await orgSiteList();

	// Convert string to JSON Object
	if (false !== result.stderr) {

		const orgSites = JSON.parse(result.stdout);

		// console.log(orgSites);



		// console.log(orgSites);

		// orgSites.foreach(function(element) {
		// 	element.environments = siteEnvironments(element.id);
		// });

		// const objJSON = await nestedObject(orgSites);

		// console.log(orgSites);

		// console.log(objJSON);

		const nestedObject = async (obj) => {
		for (const key in obj) {
			if (isObject(obj[key])) {
				nestedObject(obj[key]);
			} else {
				if ( 'name' === key ) {
					// names.push(obj[key]);
					let domains = await siteDomains(obj[key]);
					console.log(domains);
					// console.log(JSON.parse(domains.stdout));
					// let list = JSON.parse(domains.stdout);
					// obj.domains = list;

				}
				if ( 'id' === key ) {
					// ids.push(obj[key]);
					let env = await siteEnvironments(obj[key]);
					console.log(env);
					// console.log(JSON.parse(env.stdout));
					// let list = JSON.parse(env.stdout);
					// obj.environments = list;
				}

			}
		}
		//   console.log(obj);
		};

		// Iterate over nested objects
		nestedObject(orgSites);

	}

	// console.log(names);
	// console.log(ids);


	// Get individual environments


}

allSites();