#!/usr/bin/env node

var checkPath = process.argv[2];
var apiKey = process.argv[3];
console.log('Scanning directory: ' + checkPath);

var mime     = require('mime');
var path     = require('path');
var fs       = require('fs');
var https    = require('https');
var readline = require('readline-sync');

fs.stat(checkPath, function(err, stat) {
	if (err) {
		console.log('Failed to open directory: ' + checkPath);
		process.exit(1);
	}
	
	fs.readdir(checkPath, function(err, readdirOut) {
		if (err) {
			console.log('Failed to scan directory: ' + checkPath);
			process.exit(1);
		}
		
		readdirOut.forEach(function(file) {
		//var file = readdirOut[15];
		
			// Build full path to file
			var pathToFile = path.join(checkPath, file);
			
			// Get mime type, skip non-videos
			var mimeType = mime.lookup(pathToFile);
			if (mimeType.substr(0, 5) != 'video')
				return;
			
			// See if it already has a year on the end and skip it if it does
			var yearRegex = /\([0-9]{4}\)/
			var foundYear = yearRegex.exec(file);
			if (foundYear != null)
				return;
			
			// Get the name without the extension
			var fileExt  = path.extname(file);
			var basename = path.basename(file, fileExt);
			https.get('https://api.themoviedb.org/3/search/movie?query=' + basename + '&api_key=' + apiKey, function(res) {
				res.on('data', function(d) {
					var movieData = JSON.parse(d);
					
					// One result? Great! Let's use it!
					var useYear = '';
					if (movieData.total_results == 1) {
						useYear = movieData.results[0].release_date.substr(0, 4);
					}
					// More than one? Ask the user
					else
					{
						console.log("");
						console.log("Multiple matches for " + basename + ". Pick the correct one:");
						var i = 0;
						movieData.results.forEach(function(result) {
							console.log(i + ": " + result.title + " (" + result.release_date + ")");
							i++;
						});
						var answer = readline.question("Which result to use? ");
						
						console.log("");
						useYear = movieData.results[parseInt(answer)].release_date.substr(0, 4);
					}
					var newFile = basename + ' (' + useYear + ')' + fileExt;
					var newPath = path.join(checkPath, newFile);
					console.log('mv "' + pathToFile + '" "' + newPath + '"');
					fs.rename(pathToFile, newPath);
					fs.appendFile('undo.sh', 'mv "' + newPath + '" "' + pathToFile + '"' + "\n");
				}); // data.on
			}); // https get
		});// Each dir entry
		
	}); // read dir
}); // stat dir
