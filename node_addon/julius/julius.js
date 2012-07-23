var addon = require('./build/Release/julius');

addon.onSpeechReady = function() {
	console.log("hogehoge");
}

addon.onSpeechStart = function() {
	console.log("hogehoge");
}

addon.onResult = function(str) {
	console.log(str + "と認識しました");
}

var julius = new addon.Julius("../../data/setting.jconf");
julius.start();
