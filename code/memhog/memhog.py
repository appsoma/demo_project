import json
import sys
import time
import os

with open( "params.json" ) as f:
	params = json.loads( f.read() )

pids = []
forks = int(params['forks'])
for i in xrange(0,forks):
	child_pid = os.fork()
	if child_pid == 0:
		print "CHILD ALLOCATING", params['mem_in_container'], "MB"
		m = (0,) * (1024*1024/8) * int( params['mem_in_container'] )
		print "CHILD ALLOCATED"
		
		print "CHILD SLEEPING for 5 sec"
		time.sleep( 5 )
		sys.exit(0)
	else:
		pids.append( child_pid )
		
for pid in pids:
	pid, status = os.waitpid(pid, 0)
	print "WAIT DONE", pid, status

print "PARENT SLEEPING for 10 sec"
for i in xrange(0,10):
	print "PARENT SLEEP", i
	time.sleep( 1 )
		


