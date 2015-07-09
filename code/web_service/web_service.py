import sys
import os
import re
import json
from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
sys.path.append( "./code/welder_api" )
import welder_api

def service_address( external_or_internal="external" ):
	m = re.match( r'(^[^\.]+)\.', os.environ['MESOS_TASK_ID'] )
	if m:
		service = m.group(1)
	else:
		raise Exception("MESOS_TASK_ID doesn't match service pattern")
	value = welder_api.http( "http://"+os.environ['HOST']+":2379/v2/keys/"+external_or_internal+"/"+service )
	return json.loads( value )['node']['value']

port = 8011

external_ip = welder_api.service_address( "external" )

html = ""
html += "<h1>There is a web service available to the outside world at: "+external_ip+"</h1>\n"
html += "<a href='http://"+external_ip+"'>Go to it now</a>\n"
html += "<br/>"
html += "Note, it may take up to 60 seconds after the launch of this service before the above link will work"
html += "<br/>"
html += "Service is running in a container on random machine inside the cluster on port "+str(port)
with open( "./results/index.html", "w" ) as f:
	f.write( html )

class Handler(BaseHTTPRequestHandler):
	def do_GET(self):
		self.send_response(200)
		self.send_header('Content-type','text/html')
		self.end_headers()
		self.wfile.write( "The service is up." )

httpd = HTTPServer( ('0.0.0.0', port), Handler )
httpd.serve_forever()

