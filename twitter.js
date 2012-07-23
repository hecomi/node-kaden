var twitter    = require('twitter');
var Commands   = require('./commands.js');
var TW_SETTING = require('./twitter.oauth.js');
require('date-utils');

// --------------------------------------------------------------------------------
// Twitter
// --------------------------------------------------------------------------------
var hecomiroid = new twitter({
	consumer_key        : TW_SETTING.CONSUMER_KEY,
	consumer_secret     : TW_SETTING.CONSUMER_SECRET,
	access_token_key    : TW_SETTING.ACCESS_TOKEN_KEY,
	access_token_secret : TW_SETTING.ACCESS_TOKEN_SECRET
});

var msg = new Date().toFormat('[YYYY/MM/DD HH24:MI:SS] 起動しました');
hecomiroid.updateStatus(msg, function (data) {
	console.log(msg);
});

hecomiroid.stream('user', {track: 'nodejs'}, function(stream) {
	Commands.load(function() {
		stream.on('data', function(data) {
			var id        = ('user' in data && 'screen_name' in data.user) ? data.user.screen_name : null;
			var user      = ('user' in data && 'name' in data.user) ? data.user.name : null;
			var text      = ('text' in data) ? data.text.replace(new RegExp('^@' + TW_SETTING.BOT_ID + ' '), '') : '';
			var ifMention = ('in_reply_to_user_id' in data) ? (data.in_reply_to_user_id != null) : false;

			if (!ifMention || id == TW_SETTING.BOT_ID) return;
			console.log(text + 'を受け取りました');
			Commands.run(text, function(str) {
				var msg = new Date().toFormat('[YYYY/MM/DD HH24:MI:SS] @' + id + ' ' + str);
				hecomiroid.updateStatus(msg, function (data) {
					console.log('[Twitter] ' + msg);
				});
			});
		})
	});
});
