import json
import os
import sys

params = {}
with open( "params.json" ) as f:
	params = json.loads( f.read() )

cmd = 'bwa aln -B '+params['barcode_length']+' -f ./outputs/out.sai ./inputs/extracted_reference_genome ./inputs/fastq',
print "EXECUTING", cmd
ret = os.system( cmd )
sys.exit(ret)

