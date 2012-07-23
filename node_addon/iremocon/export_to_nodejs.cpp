#include <node.h>
#include "v8.hpp"
#include "iremocon.hpp"

using namespace v8;

/* ------------------------------------------------------------------------- */
//  JavaScript へ Export する : iRemocon
/* ------------------------------------------------------------------------- */
class iRemoconJS : public hecomi::V8::ExportToJSIF
{
private:
	//! iRemocon を制御するクラス
	boost::shared_ptr<iRemocon> iremocon_;

	//! 初期化したかどうか
	bool if_initialized_;

	//! 初期化したかどうかを返す
	bool initialized() {
		if (!if_initialized_) {
			std::cerr << "[iRemocon] Error! iRemocon has not been initialized yet." << std::endl;
			return false;
		}
		return true;
	}

public:
	//! コンストラクタ
	iRemoconJS() : if_initialized_(false) {}

	//! JavaScript へエクスポートする関数
	boost::any func(const std::string& func_name, const Arguments& args)
	{
		if (func_name == "constructor") {
			if (!args[0]->IsString() || !args[1]->IsInt32()) return false;

			String::Utf8Value ip(args[0]);
			int port = args[1]->Int32Value();
			iremocon_ = boost::make_shared<iRemocon>(*ip, port);
			if_initialized_ = true;
		}
		else if (func_name == "connect") {
			String::Utf8Value ip(args[0]);
			int port = args[1]->Int32Value();
			iremocon_ = boost::make_shared<iRemocon>(*ip, port);
			if_initialized_ = true;
		}
		else if (func_name == "send") {
			if (!initialized()) return false;
			int ir_num = args[0]->Int32Value();
			return iremocon_->ir_send(ir_num);
		}
		else if (func_name == "receive") {
			if (!initialized()) return false;
			int ir_num = args[0]->Int32Value();
			return iremocon_->ir_recieve(ir_num);
		}
		else if (func_name == "exec_command") {
			if (!initialized()) return false;
			String::Utf8Value command(args[0]);
			return iremocon_->exec_command(*command);
		}
		return 0;
	}
};

/* ------------------------------------------------------------------------- */
//  for Node.js
/* ------------------------------------------------------------------------- */
void init(Handle<Object> target) {
	HandleScope scope;

	// iremocon
	hecomi::V8::ExportToJS<iRemoconJS> iremocon("iRemocon");
	iremocon.add_func<void>("connect");
	iremocon.add_func<bool>("send");
	iremocon.add_func<bool>("receive");
	iremocon.add_func<bool>("exec_command");
	target->Set(
		String::NewSymbol(iremocon.get_class_name().c_str()),
		iremocon.get_class()->GetFunction()
	);
}

NODE_MODULE(iremocon, init)

