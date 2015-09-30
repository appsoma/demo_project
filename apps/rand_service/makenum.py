import time
import os
from random import randint

max_value = int(os.environ['MAX_VALUE'])

print "generating random numbers, once per second, from 0 to", max_value
while True:
	print(randint(0,max_value))
	time.sleep(1)

print "done generating"
