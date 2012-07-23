// --------------------------------------------------------------------------------
// Settings
// --------------------------------------------------------------------------------
// OpenJTalk
const OPENJTALK_VOICE = 'data/mei_normal';
const OPENJTALK_DIC   = 'data/open_jtalk_dic_utf_8-1.05';

// iRemocon
const IREMOCON_IP     = '192.168.0.2';
const IREMOCON_PORT   = 51013;

// Command
const COMMANDS_XML    = 'data/commands.xml';
const JQUERY_URI      = 'http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js';

// --------------------------------------------------------------------------------
// Modules
// --------------------------------------------------------------------------------
var jsdom     = require('jsdom');
var fs        = require('fs');

var OpenJTalk = require('./node_addon/openjtalk/build/Release/openjtalk').OpenJTalk;
var iRemocon  = require('./node_addon/iremocon/build/Release/iremocon').iRemocon;

var OpenJTalk = new OpenJTalk(OPENJTALK_VOICE, OPENJTALK_DIC);
var iRemocon  = new iRemocon(IREMOCON_IP, IREMOCON_PORT);

// --------------------------------------------------------------------------------
// Command map
// --------------------------------------------------------------------------------
function Command(str, funcStr) {
	this.str  = str;
	this.func = funcStr;
}

Commands = {
	map: [],
	add: function (str, ir) {
		this.map.push(new Command(str, ir));
	},
	run: function (str, callback) {
		console.log(str + ' でコマンドを操作します ');
		for (var i in this.map) {
			if (new RegExp(this.map[i].str).test(str)) {
				try {
					var ret = eval(this.map[i].func);
					if (ret && callback) {
						callback(ret);
					}
				} catch (e) {
					console.log(e);
				}
				return;
			}
		}
		console.log('コマンドが見つかりませんでした');
	}
}

// --------------------------------------------------------------------------------
// Export
// --------------------------------------------------------------------------------
exports.load = function(callback) {
	jsdom.env({
		html    : fs.readFileSync(COMMANDS_XML),
		scripts : [JQUERY_URI]
	}, function (err, window) {
		var $ = window.jQuery;
		var commands = $('command');
		commands.each(function() {
			// reply == 'no' でないときはデフォルトの応答を返す
			var func = '(function() {\n';
				// 登録された関数を実行
				if ($(this).text() != '') {
					func += 'var ret = (function() {' + $(this).text() + '})();';
				}

				// 返答を返す
				if ($(this).attr('reply') != 'no') {
					func += 'OpenJTalk.talk(str + "、ですね。");\n';
				} else {
					func += 'if (ret) OpenJTalk.talk(ret);\n';
				}

				// ir 番号が記載されているときは iRemocon を操作
				// 書いてない場合は中身を実行
				if ($(this).attr('ir')) {
					func += 'iRemocon.send(' + $(this).attr('ir') + ');'
				}

				// return 文を付記
				func += 'return ret || (str + "、を実行しました");\n';
			func += '})();\n';

			// コマンドの登録
			var word = $(this).attr('word');
			Commands.add(word, func);
		});

		callback();
	});
},

exports.run = function(str, callback) {
	Commands.run(str, callback);
}
