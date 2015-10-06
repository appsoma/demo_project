import time
import os
import sys

step = int(os.environ['BR_STEP'])
fail = int(os.environ['BR_FAIL'])

print "This is step", step
print "Waiting one second..."
time.sleep(1)

if step == fail:
	print "This process is failing with exit code 2"
	sys.exit(2)

sys.exit(0)
