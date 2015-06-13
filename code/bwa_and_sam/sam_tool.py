import sys
import os
import os.path

pairedFastq = False
if os.path.isfile('./inputs/fastq1' ):
	if os.path.isfile('./inputs/fastq2' ):
		pairedFastq = True
else:
	print "No fastq1 specified"
	sys.exit(1)

pairedSai = False
if os.path.isfile('./inputs/sai1' ):
	if os.path.isfile('./inputs/sai2' ):
		pairedSai = True
else:
	print "No sai1 specified"
	sys.exit(1)

if (pairedFastq and not pairedSai) or (not pairedFastq and pairedSai):
	print "Mismatching pairs. Either both fastq and sai need to be paired or neither of them."
	sys.exit(1)

if pairedFastq:
	# The mate exists, do a sampe
	cmd = "bwa sampe -f ./outputs/out.sam ./inputs/reference_genome/extracted_reference_genome ./inputs/sai1 ./inputs/sai2 ./inputs/fastq1 ./inputs/fastq2"
else:
	# No mate exists, do a samse
	cmd = "bwa samse -f ./outputs/out.sam ./inputs/reference_genome/extracted_reference_genome ./inputs/sai1 ./inputs/fastq1"

print "EXECUTING", cmd
ret = os.system( cmd )
sys.exit(ret)
