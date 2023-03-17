export TERMINUS_ORG_ID='REPLACE_WITH_ORG_ID' &&
export TERMINUS_UPSTREAMS="UPSTREAM_ID_1,UPSTREAM_ID_2,UPSTREAM_ID_3" &&
npm ci &&
composer install --prefer-dist &&
node index.js