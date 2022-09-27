const terminusUpstreamID = process.env.TERMINUS_UPSTREAM_ID,
      terminusOrgID      = process.env.TERMINUS_ORG_ID;

console.log(terminusUpstreamID);
console.log(terminusOrgID);

// 1. terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
// 2. terminus env:list --field=domain <site-id>
// 3. terminus domain:list --format FORMAT --fields FIELDS --field FIELD -- <site>.<env>



const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);



// 1. terminus org:site:list <org-id> --upstream=<upstream-id> --format=json
function orgSiteList() {
    return new Promise(resolve => {
        resolve( exec(`terminus org:site:list ${terminusOrgID} --upstream=${terminusUpstreamID} --format=json`) );
    });
  }

// const orgSiteListPromise = new Promise((resolve, reject) => {
//   resolve( exec(`terminus org:site:list ${terminusOrgID} --upstream=${terminusUpstreamID} --format=json`) );
// });

// orgSiteListPromise.then(data => {
//   const strJSON = JSON.parse(data.stdout);
//   console.log(data);
//   console.log('data successful');
//   console.log(typeof(data));
// })


// 2. terminus env:list --field=domain <site-id>
async function siteEnvironments(site) {
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

const isObject = (val) => {
  if (val === null) {
      return false;
  }

  return typeof val === 'object';
};


  async function allSites() {
    console.log('calling');
    const result = await orgSiteList();
    // console.log(result);

    ////////
    // const keys = Object.keys(result);

    // console.log(keys);

    // console.log(typeof(keys));

    ////////
    // const value = result[keys[0]];

    // console.log(value);

    // console.log(typeof(value));

    // for (const [key, value] of Object.entries(result)) {
    //   console.log(`${key}: ${value}`);
    // }

    ////////

    // const nestedObject = (obj) => {
    //   for (const key in obj) {
    //       if (isObject(obj[key])) {
    //           nestedObject(obj[key]);
    //       } else {
    //           // console.log(`${key} => ${obj[key]}`);
    //           // console.log(typeof(key));

    //       }
    //   }
    // };

  ////////
  // console.log(result.stdout);
  console.log(typeof(result));
  console.log(typeof(result.stdout));
  const strJSON = JSON.parse(result.stdout);
  console.log(strJSON);
  console.log(typeof(strJSON));

  // nestedObject(result);


    // expected output: "resolved"
  }

  // const promise3 = new Promise((resolve, reject) => {
  //   setTimeout(resolve, 100, 'foo');
  // });

  // siteEnvironments();




  allSites();