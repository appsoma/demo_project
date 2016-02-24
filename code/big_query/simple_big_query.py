#!/usr/bin/env python

#
# A sample access project for bigquery
#
import sys
import json
import datetime
import time

from httplib2 import Http
from oauth2client.service_account import ServiceAccountCredentials
from apiclient.discovery import build

BIGQUERY_SCOPE = 'https://www.googleapis.com/auth/bigquery'
BIGQUERY_SCOPE_READ_ONLY = 'https://www.googleapis.com/auth/bigquery.readonly'

params = {}
with open("params.json", "r") as f:
	params = json.loads(f.read())


# Google auth
with open(sys.argv[1], "r") as f:
    json_key = json.loads(f.read())
    credentials = ServiceAccountCredentials.from_json_keyfile_dict(json_key, BIGQUERY_SCOPE)

http = credentials.authorize(Http())
bigq = build("bigquery", "v2", http=http)

# Submit an async query.
query = "SELECT " + params['columns'] + " "
query += "FROM " + params['dataSetName'] + "." + params['table'] + " "
query += "ORDER BY " + params['sortColumn'] + " "
if params.get('sortOrder', "") == "Ascending":
    query += "ASC "
else:
    query += "DESC "

query += "LIMIT " + params['count']
query_data = {
    'query': query,
    'timeoutMs': 10,
}

jobs = bigq.jobs()

startTime = datetime.datetime.now()
stopTime = startTime
job = jobs.query(projectId=params['projectName'], body=query_data).execute()

job_id = job['jobReference']['jobId']
while not job['jobComplete']:
    time.sleep(5)
    job = jobs.getQueryResults(projectId=params['projectName'], jobId=job_id).execute()
    stopTime = datetime.datetime.now()

columns = params['columns'].split(",")
results = []
if job['jobComplete']:
    for i in job['rows']:
        row = []
        if len(i['f']) != len(columns):
            raise Exception("Incorrect columns returned?")
        for j in range(0, len(columns)):
            row.append(i['f'][j]['v'])
        results.append(row)

output = {'columns': columns, 'data': results}
with open(sys.argv[2], "w") as f:
    f.write(json.dumps(output, indent=2))
sys.exit(0)
