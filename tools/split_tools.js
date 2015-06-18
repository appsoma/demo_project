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

	function toObj(arrayList) {
		var obj = {};
		for( var key in arrayList ) {
			var a = arrayList[key];
			a.name = String(a.name || a.label || a.id || "unknown").trim();
			var id = a.name.replace(/ /g, '_').toLowerCase();
			obj[id] = {
				"id": id,
				"label": a.name,
				"type": a.type || "none"
			}
		}
		return obj;
	}

	tool.form = tool.id+".form";
	tool.inputs = toObj(tool.inputs);
	tool.outputs = toObj(tool.outputs);

	var order = ["id", "label", "version", "author", "icon", "category", "form", "params", "inputs", "outputs"];
	var toolOut = {};
	for( var index in order ) {
		toolOut[order[index]] = tool[order[index]];
	}

	fs.writeFileSync( "./"+t+"/tool.json", JSON.stringify(toolOut,null,4) );

	console.log("mkdir "+t);
	console.log("make file "+t+"/tool.json");
}

//console.log(toolList,null,4);
