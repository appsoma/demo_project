//
// Ken created this to split from the old tools definitions for
// demo purposes. We'll probably need a way to traverse and tweak
// each of the resulting tool.json files as the spec evolves.
//

var fs = require("fs");

var jsonString = fs.readFileSync("./tools_mock.json","utf8");

var toolList = JSON.parse(jsonString);

for( var t in toolList ) {
	var tool = toolList[t];
	try {
		fs.mkdirSync( t );
	}
	catch(e) {
		console.log(e.message);
	}

	if( tool.icon.fontawesome ) {
		tool.icon.fontawesome = tool.icon.fontawesome.replace( /\\/g, "\\\\" );
		console.log("safer "+tool.icon.fontawesome);
	}

	fs.writeFileSync( "./"+t+"/tool.json", JSON.stringify(tool,null,4) );

	console.log("mkdir "+t);
	console.log("make file "+t+"/tool.json");
}

//console.log(toolList,null,4);
