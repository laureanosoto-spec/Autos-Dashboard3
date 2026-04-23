const axios = require('axios');
const qs    = require('qs');

const TENANT_ID     = process.env.AAD_TENANT_ID;
const CLIENT_ID     = process.env.AAD_CLIENT_ID;
const CLIENT_SECRET = process.env.AAD_CLIENT_SECRET;
const DATASET_ID    = '4da96e14-b43c-470d-b4d9-4b8dff4b0ad2';

async function getToken() {
  const url  = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = qs.stringify({
    grant_type:    'client_credentials',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         'https://analysis.windows.net/powerbi/api/.default'
  });
  const { data } = await axios.post(url, body);
  return data.access_token;
}

module.exports = async function (context, req) {
  try {
    const { daxQuery } = req.body || {};
    if (!daxQuery) {
      context.res = { status: 400, body: { error: 'daxQuery is required' } };
      return;
    }
    const token = await getToken();
    const url   = `https://api.powerbi.com/v1.0/myorg/datasets/${DATASET_ID}/executeQueries`;
    const { data } = await axios.post(
      url,
      { queries: [{ query: daxQuery }], serializerSettings: { includeNulls: true } },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: data.results[0].tables[0].rows
    };
  } catch (err) {
    context.log.error(err.message);
    context.res = { status: 500, body: { error: err.message } };
  }
};
