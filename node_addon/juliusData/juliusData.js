/* ------------------------------------------------------------------------- */
// node ライブラリの読み込み
/* ------------------------------------------------------------------------- */
var Gin   = require('../gin/gin.js');
var MeCab = require('../mecab/build/Release/mecab');
var ICU   = require('../icu/build/Release/icu');
var exec  = require('../execSync/build/Release/shell.node').execSync;
var fs    = require('fs');

/* ------------------------------------------------------------------------- */
// 便利関数など
/* ------------------------------------------------------------------------- */
/**
 * 文字列を n 回繰り返す. (String.prototype 拡張)
 * @param[in] num 繰り返し回数
 */
String.prototype.repeat = function( num ) {
	for(var i = 0, buf = ""; i < num; ++i) buf += this;
	return buf;
}

/**
 * 文字列をvoca形式に変換する. (String.prototype 拡張)
 */
String.prototype.toVoca = function() {
	return ICU.kana2voca(MeCab.str2kana(this.toString()));
	// return this.toString();
}

/* ------------------------------------------------------------------------- */
// Gin による構文解析
/* ------------------------------------------------------------------------- */

//! Julius の形式に変換するための Grammar
var Voca = new Gin.Grammar({
	Expr     : / ((Group|Symbol|String)(MinMax|Repeat|Plus|Asterisk|Question)?)+ /,
	Group    : / [(]:child Expr ([|]:bros Expr)* [)]:unchild /,
	MinMax   : / [{] $INT:min [,] $INT:max [}] /,
	Repeat   : / [{] $INT:repeat [}] /,
	Plus     : / [+]:plus /,
	Asterisk : / [*]:asterisk /,
	Question : / [?]:question /,
	Symbol   : / [<] $SYMBOL:symbol [>] /,
	String   : / $STRING:string /
}, 'Expr', Gin.SPACE);

//! 文字列ノードのタイプ
const NODE_TYPE = {
	STRING   : 0,
	SYMBOL   : 1
};

//! 文字列ノードの繰り返しタイプ
const REPEAT_TYPE = {
	NONE         : 0, // 繰り返しなし
	MIN_AND_MAX  : 1, // 繰り返しの最小/最大数を設定
	ONE_OR_MORE  : 2, // ０回以上の繰り返し
	ZERO_OR_MORE : 3  // １回以上の繰り返し
};

/**
 * 文字列ノードクラス.
 * 各ノードの情報を格納する（e.g. 繰り返し回数、次のノード、子ノード）
 */
function Node() {
	this.str    = '';
	this.id     = '';
	this.repeat = REPEAT_TYPE.NONE;
	this.type   = NODE_TYPE.STRING;
	this.parent = null;
	this.child  = null;
	this.next   = null;
	this.min    = -1;
	this.max    = -1;
	this.isNextBros   = false;
}

/**
 * Gin の Semantic Action を引き受けるハンドラ.
 */
var Handler = function() {
	//! 最初のノード位置
	this.first = new Node();

	//! 現在のノード位置
	this.node = this.first;
}
Handler.prototype = {
	//! 現在のノード位置 or 次の位置へ文字列ノードを追加
	string: function(v) {
		if (this.node.str !== '' || this.node.child !== null) {
			this.node.next = new Node();
			this.node.next.parent = this.node.parent;
			this.node = this.node.next;
		}
		this.node.str = v;
	},
	//! 現在のノード位置 or 次の位置へ数字ノードを追加
	symbol: function(v) {
		if (this.node.str != '' || this.node.child != null) {
			this.node.next = new Node();
			this.node.next.parent = this.node.parent;
			this.node = this.node.next;
		}
		this.node.str  = v;
		this.node.type = NODE_TYPE.SYMBOL;
	},
	//! 最小繰り返し回数を設定
	min: function(v) {
		this.node.repeat = REPEAT_TYPE.MIN_AND_MAX;
		this.node.min = v;
	},
	//! 最大繰り返し回数を設定
	max: function(v) {
		this.node.repeat = REPEAT_TYPE.MIN_AND_MAX;
		this.node.max = v;
	},
	//! 固定繰り返し回数を設定
	repeat: function(v) {
		this.node.repeat = REPEAT_TYPE.MIN_AND_MAX;
		this.node.min = this.node.max = v;
	},
	//! １回以上繰り返しに設定
	plus: function(v) {
		this.node.repeat = REPEAT_TYPE.ONE_OR_MORE;
	},
	//! ０回以上繰り返しに設定
	asterisk: function(v) {
		this.node.repeat = REPEAT_TYPE.ZERO_OR_MORE;
	},
	//! ０回か１回出現に設定
	question: function(v) {
		this.node.repeat = REPEAT_TYPE.MIN_AND_MAX;
		this.node.min = 0;
		this.node.max = 1;
	},
	//! 自分の次のノードが兄弟ノードかどうかを記憶
	bros: function(v) {
		this.node.isNextBros = true;
	},
	//! 子要素を設定し現在のノード位置を子ノードへ移動
	child: function(v) {
		this.node.next = new Node();
		this.node.next.parent = this.node.parent;
		this.node.next.child = new Node();
		this.node.next.child.parent = this.node.next;
		this.node = this.node.next.child;
	},
	//! 現在のノード位置を親ノードへ移動
	unchild: function(v) {
		this.node = this.node.parent;
	}
};

/**
 * Gin による構文解析結果から Julius の grammar 形式、voca 形式を生成する.
 * 解析結果（Nodeクラス）は兄弟/子供を持つので、再帰的に子供を調べる
 *
 * @param[in] firstNum      grammar や voca で用いる ID 番号
 * @param[in] firstNode     Gin によって解析された結果のノード
 * @param[in] parentId      (再帰で使用) 親の ID. （e.g. WORD_5 など）
 * @param[in] brosIds       (再帰で使用) 兄弟要素走査中の ID の束
 * @return                  {grammar, voca, num} 構造体
 */
function makeJuliusFormat(firstNum, firstNode, parentId, brosFlag) {
	var num = firstNum;
	var gramStr = '', vocaStr = '';

	// 最上位ノードの場合
	if (parentId === undefined) {
		// ルートとなる文法を作成する
		// 繰り返し用に最上位ノードの場合は ROOT_N --> WORD_N という対応付けをする
		var rootGramStr = '';
		gramStr += 'S\t: NS_B ';
		for (var node = firstNode, n = firstNum; node; node = node.next) {
			if (node.child !== null || node.str !== '') {
				rootGramStr += 'ROOT_' + n + '\t: WORD_' + n + '\n';
				gramStr += 'ROOT_' + n + ' ';
				++n;
			}
		}
		gramStr += 'NS_E\n';
		gramStr += rootGramStr;
	}

	// ノードを順に走査（next）
	for (var node = firstNode; node; node = node.next) {
		// 子ノードがいないかつ空ノード（頭とか）は無視
		if (node.child === null && node.str === '') continue;

		// 自身の ID を設定 (最上位ノードかどうかで場合分け）
		var id, parentId2;
		if (parentId === undefined) {
			parentId2 = 'ROOT_' + num;
			id = 'WORD_' + num;
		} else {
			parentId2 = parentId;
			id = parentId + '_' + num;
		}

		// 繰り返しに対応する grammar を作る
		var loopId = id + '_LOOP', tmpId = id + '_TMP';
		switch (node.repeat) {
			case REPEAT_TYPE.NONE:
				break;
			case REPEAT_TYPE.MIN_AND_MAX:
				for (var i = node.min; i <= node.max; ++i) {
					if (i === 0)
						gramStr += id + '\t: NOISE\n';
					else
						gramStr += id + '\t: ' + (loopId + ' ').repeat(i) + '\n';
				}
				id = loopId;
				break;
			case REPEAT_TYPE.ZERO_OR_MORE:
				gramStr += id + '\t: NOISE\n';
				gramStr += id + '\t: ' + loopId + '\n';
				gramStr += id + '\t: ' + id + ' ' + loopId + '\n';
				id = loopId;
				break;
			case REPEAT_TYPE.ONE_OR_MORE:
				gramStr += id + '\t: ' + loopId + '\n';
				gramStr += id + '\t: ' + id + ' ' + loopId + '\n';
				id = loopId;
				break;
			default:
				throw new Error("ERROR! Invalid REPEAT_TYPE.");
				break;
		}

		// 再帰処理
		// 子ノード（= child）がいるとき（= 自分の str は空）、子ノードを走査
		if (node.child !== null) {
			// 文法を作成
			// isNextBros が設定されているノードの時はそこの位置がセパレータとなる
			gramStr += id + '\t: ';
			for (var child = node.child, m = 0; child; child = child.next, ++m) {
				gramStr += id + '_' + m + ' ';
				if (child.isNextBros === true) {
					gramStr += '\n' + id + '\t: ';
				}
			}
			gramStr += '\n';

			var result;
			// 親IDに自分のIDをひもづける
			result = makeJuliusFormat(0, node.child, id);
			gramStr += result.grammar;
			vocaStr += result.voca;
			++num;
		}


		// 子ノードがいないが空でないノードの場合(= 終端ノード)は voca を書きだして次へ
		if (node.child === null && node.str !== '') {
			// MeCab と ICU を用いて Julius の voca 形式に変換
			// Symbol なら voca 形式に登録せずに grammar に追加
			switch (node.type) {
				case NODE_TYPE.STRING:
					vocaStr +=
						'% ' + id + '\n' +
						node.str + '\t' + node.str.toVoca() + '\n';
					break;
				case NODE_TYPE.SYMBOL:
					gramStr += id + '\t: ' + node.str + '\n';
					break;
				default:
					throw new Error("ERROR! Invalid NODE_TYPE.");
					break;
			}
			++num;
		}

	}
	return {grammar: gramStr, voca: vocaStr, num: num};
}

/**
 * Voca / Grammar を保管しておく構造体
 */
var JuliusData = {
	num_      : 0,
	voca_     : '% NS_B\n<s>\tsilB\n% NS_E\n<s>\tsilE\n% NOISE\n<sp>\tsp\n',
	grammar_  : 'S\t: NS_B NOISE NS_E\n',
	filename_ : 'tmp',

	/**
	 * Julius が認識することのできる文字列を追加
	 * @param[in] str 追加する表現
	 */
	add: function(str) {
		var handler = new Handler();
		var match   = Voca.parse(str, handler);

		if (match && match.full) {
			var result  = makeJuliusFormat(this.num_, handler.first);
			this.voca_    += result.voca;
			this.grammar_ += result.grammar;
			this.num_      = result.num;
		} else {
			throw new Error('ERROR! "' + str + '" is invalid format.');
		}
	},
	/**
	 * symbol を追加.
	 * @param[in] symbol 追加するシンボル
	 * @param[in] arr    シンボルに対応する文字列配列
	 */
	addSymbol: function(symbol, arr) {
		if (!/[a-zA-Z0-9_-]/.test(symbol)) {
			throw new Error('ERROR! "' + symbol + '" is invalid symbol.');
		}
		this.voca_ += '% ' + symbol + '\n';
		for (var i in arr) {
			var str = arr[i].toString();
			this.voca_ += str + '\t' + str.toVoca() + '\n';
		}
	},
	/**
	 * 出力するファイル名を出力
	 * @param[in] filename 出力ファイル名
	 */
	setFileName: function(filename) {
		this.filename_ = filename;
	},

	/**
	 * voca / grammar ファイルを書き出す
	 * @param[in] mkdfaPath mkdfa の実行ファイルの場所
	 */
	mkdfa: function(mkdfaPath) {
		fs.writeFileSync(this.filename_ + '.voca', this.voca_);
		fs.writeFileSync(this.filename_ + '.grammar', this.grammar_);
		var command = mkdfaPath + ' ' + this.filename_;
		var result  = exec(command);
		if (/Error\:/.test(result)) {
			console.log(result);
			throw new Error('Error! "' + command + '" failed.');
		} else {
			console.log('Success: \n' + result);
		}
	},
};

/* ------------------------------------------------------------------------- */
// エクスポート
/* ------------------------------------------------------------------------- */
for (var x in JuliusData)
	exports[x] = JuliusData[x];
