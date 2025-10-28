import fetch from 'node-fetch';

const resp = await fetch('http://localhost:4001/api/properties');
console.log('status', resp.status);
const json = await resp.json().catch(() => null);
console.log(JSON.stringify(json, null, 2));
