#include <node.h>
#include "v8.hpp"
#include "julius.hpp"

using namespace v8;

//! node.js addon へのアクセス用
Persistent<Object> module_target;

/* ------------------------------------------------------------------------- */
//  JavaScript へ Export する : Julius
/* ------------------------------------------------------------------------- */
class JuliusJS : public hecomi::V8::ExportToJSIF
{
private:
	//! Julius を制御するクラス
	boost::shared_ptr<Julius> julius_;

public:
	//! JavaScript へエクスポートする関数
	boost::any func(const std::string& func_name, const Arguments& args)
	{
		if (func_name == "constructor") {
			// Julius インスタンス作成
			String::Utf8Value jconf_path(args[0]);
			julius_ = boost::make_shared<Julius>(*jconf_path);

			// 待機時処理
			julius_->add_speech_ready_callback([](Recog* recog, void* ptr){
				JuliusJS* _this = static_cast<JuliusJS*>(ptr);
				_this->on_speech_ready(recog);
			}, this);

			// 発話開始時処理
			julius_->add_speech_start_callback([](Recog* recog, void* ptr){
				JuliusJS* _this = static_cast<JuliusJS*>(ptr);
				_this->on_speech_start(recog);
			}, this);

			// 結果が返された時の処理
			julius_->add_result_callback([](Recog* recog, void* ptr){
				JuliusJS* _this = static_cast<JuliusJS*>(ptr);
				_this->on_result(recog);
			}, this);
		}
		else if (func_name == "start") {
			julius_->start();
			return true;
		}
		return 0;
	}

	//! 発話待機時のコールバック
	void on_speech_ready(Recog* recog)
	{
		Locker lock;
		HandleScope handle;
		v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(
			module_target->Get( v8::String::New("onSpeechReady") )
		);
		if (callback->IsFunction()) {
			callback->Call(module_target, 0, nullptr);
		} else {
			std::cerr << "[Julius] Error! onSpeechReady is not Function." << std::endl;
		}
	}

	//! 発話開始時のコールバック
	void on_speech_start(Recog* recog)
	{
		Locker lock;
		HandleScope handle;
		v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(
			module_target->Get( v8::String::New("onSpeechStart") )
		);
		if (callback->IsFunction()) {
			callback->Call(module_target, 0, nullptr);
		} else {
			std::cerr << "[Julius] Error! onSpeechStart is not Function." << std::endl;
		}
	}

	//! 認識結果が返された時のコールバック
	void on_result(Recog* recog)
	{
		// 結果を走査
		for (const RecogProcess *r = recog->process_list; r; r = r->next) {
			WORD_INFO *winfo = r->lm->winfo;

			// 仮説の数に応じてループ
			for (int n = 0; n < r->result.sentnum; ++n) {
				// Windows だと起こらないらしいが Ubuntu だとたまに起こる…
				if (r->result.sent == nullptr) break;

				Sentence s   = r->result.sent[n];
				WORD_ID *seq = s.word;
				int seqnum   = s.word_num;

				// 認識結果の文章を取得
				std::string output;
				for (int i = 1; i < seqnum-1; ++i) {
					// result[n][i] = winfo->woutput[seq[i]];
					output += winfo->woutput[seq[i]];
				}

				Locker lock;
				HandleScope handle;
				v8::Local<v8::Function> callback = v8::Local<v8::Function>::Cast(
					module_target->Get( v8::String::New("onResult") )
				);
				if (callback->IsFunction()) {
					const int argc = 1;
					v8::Handle<v8::Value> argv[] = {v8::String::New(output.c_str())};
					callback->Call(module_target, argc, argv);
				} else {
					std::cerr << "[Julius] Error! onResult is not Function." << std::endl;
				}
			}
		}

	}
};

/* ------------------------------------------------------------------------- */
//  node.js の addon 化
/* ------------------------------------------------------------------------- */
void init(Handle<Object> target) {
	module_target = Persistent<Object>::New(target);

	// Julius
	hecomi::V8::ExportToJS<JuliusJS> julius("Julius");
	julius.add_func<void>("init");
	julius.add_func<bool>("start");
	julius.add_func("onSpeechReady");
	target->Set(
		String::NewSymbol(julius.get_class_name().c_str()),
		julius.get_class()->GetFunction()
	);

}

NODE_MODULE(julius, init)

