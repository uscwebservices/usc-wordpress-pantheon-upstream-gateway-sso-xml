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

function nestedObject(obj) {

}


async function allSites() {
    console.log('calling');
    const result = await orgSiteList();

    console.log(typeof(result));
    console.log(typeof(result.stdout));

    // STRING
    // console.log(result.stdout);
    // console.log(typeof(result.stdout));

    // JSON
    const strJSON = JSON.parse(result.stdout);
    // console.log(strJSON);
    // console.log(typeof(strJSON));

    // for (const key in strJSON) {

    // }



    // for (const key in strJSON) {
    //     if (strJSON.hasOwnProperty(key)) {
    //         console.log(`${key}: ${strJSON[key]}`)
    //     }
    // }

    // for (const [key, value] of Object.entries(strJSON)) {
    //     console.log(`${key}: ${value}`);
    // }

    // const isObject = (val) => {
    //     if (val === null) {
    //         return false;
    //     }

    //     return typeof val === 'object';
    //   };

    let names = [];
    let ids = [];

    const nestedObject = (obj) => {
      for (const key in obj) {
          if (isObject(obj[key])) {
              nestedObject(obj[key]);
          } else {
            //   console.log(`${key} => ${obj[key]}`);
            //   console.log(typeof(key));
            if ( 'name' === key ) {
                names.push(obj[key]);
            }
            if ( 'id' === key ) {
                ids.push(obj[key]);
            }

          }
      }
    };

    nestedObject(strJSON);

    console.log(names);
    console.log(ids);
}

allSites();