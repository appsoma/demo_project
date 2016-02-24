console.log("This default tool replaces all characters in a file with a letter you specify.");

var fs = require( 'fs' );

// TODO: Each task should get its own set of params, inputs and outputs
// but for now, read the run's params, not my personal params
var params = fs.readFile("../params.json", 'utf8', function(err,content) {

	// This value comes from welder_tools.js
	var letter = params.letter_to_use;
	var fileInputPath = params.my_input_file;
	var fileOutputPath = params.my_output_file

	fs.readFile(fileInputPath, 'utf8', function(err,content) {
		if( err ) {
			process.stderr.write(err);
			process.exit(1);
		}
		content.replace( /\w/g, letter );
		fs.writeFile( fileOutputPath, content, 'utf8', function(err) {
			process.exit(0);
		});
	});

});
