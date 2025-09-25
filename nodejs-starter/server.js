const
express =
require
(
'express'
);
const
axios =
require
(
'axios'
);
const
cors =
require
(
'cors'
);
const
helmet =
require
(
'helmet'
);
const
{
RateLimiterMemory
} =
require
(
'rate-limiter-flexible'
);
require
(
'dotenv'
).
config
();
const
app =
express
();
const
PORT
= process.
env
.
PORT
||
3001
;
// Security middleware
app.
use
(
helmet
());app.
use
(
cors
({
origin
: process.
env
.
FRONTEND_URL
||
'http://localhost:3000'
}));app.
use
(express.
json
());
// Rate limiting
const
rateLimiter =
new
RateLimiterMemory
({
keyPrefix
:
'middleware'
,
points
:
100
,
// Number of requests
duration
:
600
,
// Per 10 minutes (Companies House limit)
});
// Companies House API Proxy
app.
get
(
'/api/companies/search'
,
async
(req, res) => {
try
{
await
rateLimiter.
consume
(req.
ip
);
const
{ q, company_status, sic_codes } = req.
query
;
const
params = { q };
if
(company_status ===
'active'
) { params.
restrictions
=
'active-companies'
; }
const
response =
await
axios.
get
(
'https://api.company-information.service.gov.uk/search/companies'
, { params,
auth
: {
username
: process.
env
.
COMPANIES_HOUSE_API_KEY
,
password
:
''
},
timeout
:
10000
} ); res.
json
(response.
data
); }
catch
(error) {
if
(error.
response
?.
status
===
429
) {
return
res.
status
(
429
).
json
({
error
:
'Rate limit exceeded'
}); } res.
status
(
500
).
json
({
error
:
'Failed to fetch companies'
}); }});
// Company Profile Endpoint
app.
get
(
'/api/companies/:companyNumber'
,
async
(req, res) => {
try
{
await
rateLimiter.
consume
(req.
ip
);
const
response =
await
axios.
get
(
`https://api.company-information.service.gov.uk/company/
${req.params.companyNum
{
auth
: {
username
: process.
env
.
COMPANIES_HOUSE_API_KEY
,
password
:
''
} } ); res.
json
(response.
data
);
}
catch
(error) { res.
status
(
500
).
json
({
error
:
'Failed to fetch company details'
}); }});
// HubSpot Integration Endpoint
app.
post
(
'/api/hubspot/companies'
,
async
(req, res) => {
try
{
const
{ companies } = req.
body
;
const
results = [];
for
(
const
company
of
companies) {
const
hubspotData = {
properties
: {
name
: company.
company_name
,
industry
: company.
industry_description
,
companies_house_number
: company.
company_number
,
incorporation_date
: company.
incorporation_date
,
company_status
: company.
company_status
,
address
: company.
registered_office_address
} };
try
{
const
response =
await
axios.
post
(
'https://api.hubapi.com/crm/v3/objects/companies'
, hubspotData, {
headers
: {
'Authorization'
:
`Bearer
${process.env.HUBSPOT_ACCESS_TOKEN}
`
,
'Content-Type'
:
'application/json'
} } ); results.
push
({
success
:
true
,
data
: response.
data
}); }
catch
(hubspotError) { results.
push
({
success
:
false
,
error
: hubspotError.
message
}); } } res.
json
({ results }); }
catch
(error) { res.
status
(
500
).
json
({
error
:
'Failed to process companies'
}); }});
// Health check endpoint
app.
get
(
'/health'
,
(
req, res
) =>
{ res.
json
({
status
:
'OK'
,
timestamp
:
new
Date
().
toISOString
() });});app.
listen
(
PORT
,
() =>
{
console
.
log
(
`Backend server running on port
${PORT}
`
);});