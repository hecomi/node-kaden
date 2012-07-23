// --------------------------------------------------------------------------------
// Settings
// --------------------------------------------------------------------------------
// Julius
const JULIUS_MKDFA_PATH = 'tool/mkdfa.pl';
const JULIUS_DATA_PATH  = 'data/kaden';
const JULIUS_JCONF_PATH = 'data/setting.jconf';

// OpenJTalk
const OPENJTALK_VOICE   = 'data/mei_normal';
const OPENJTALK_DIC     = 'data/open_jtalk_dic_utf_8-1.05';

// Command XML
const COMMANDS_XML      = 'data/commands.xml';

// jQuery URL
const JQUERY_URI        = 'http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js';

// --------------------------------------------------------------------------------
// Modules
// --------------------------------------------------------------------------------
// npm から
var jsdom      = require('jsdom');
var fs         = require('fs');

// 自作モジュール
var Commands   = require('./commands.js');
var JuliusData = require('./node_addon/juliusData/juliusData.js');
var julius     = require('./node_addon/julius/build/Release/julius');

var OpenJTalk  = require('./node_addon/openjtalk/build/Release/openjtalk').OpenJTalk;
var OpenJTalk  = new OpenJTalk(OPENJTALK_VOICE, OPENJTALK_DIC);

// --------------------------------------------------------------------------------
// Julius
// --------------------------------------------------------------------------------
function addJuliusGarbageWords() {
	var kana = 'あいうえおかきくけこさしすせたちつてとなにぬねのはひふへほまみめもやゆよらりるれろわをん';
	var kanaArr = kana.split('');
	var gomiWords = [];
	for (var i in kanaArr) {
		if (i%2) continue;
		for (var j in kanaArr) {
			if (!j%2) continue;
			gomiWords.push(kanaArr[i] + kanaArr[j]);
		}
	}
	JuliusData.addSymbol('GOMI', gomiWords);
	JuliusData.add('<GOMI>');
}

function addJuliusCallbacks() {
	julius.onSpeechReady = function() {
		console.log("スピーチ待機中...");
	}
	julius.onSpeechStart = function() {
		console.log("スピーチ開始");
		OpenJTalk.stop();
	}
	julius.onResult = function(str) {
		if (str) {
			console.log('「' + str + '」と認識しました');
			Commands.run(str);
		}
	}
}

// --------------------------------------------------------------------------------
// Register Commands and Run Julius
// --------------------------------------------------------------------------------
jsdom.env({
	html    : fs.readFileSync(COMMANDS_XML),
	scripts : [JQUERY_URI]
}, function (err, window) {
	Commands.load(function() {
		var $ = window.jQuery;
		var commands = $('command');
		commands.each(function() {
			var word = $(this).attr('word');
			JuliusData.add(word);
		});

		addJuliusGarbageWords();
		addJuliusCallbacks();

		JuliusData.setFileName(JULIUS_DATA_PATH);
		JuliusData.mkdfa(JULIUS_MKDFA_PATH);

		var Julius = new julius.Julius(JULIUS_JCONF_PATH);
		Julius.start();
	});
});
