#include <iostream>
#include <boost/format.hpp>
#include <sstream>
#include "iremocon.hpp"

/* ------------------------------------------------------------------------- */
//! エンドポイントを引数から作成
/* ------------------------------------------------------------------------- */
iRemocon::iRemocon(const std::string& ip, const int port)
	: ep_(boost::asio::ip::address::from_string(ip), port)
{
}

/* ------------------------------------------------------------------------- */
//! iRemocon へコマンドを送信
/* ------------------------------------------------------------------------- */
bool iRemocon::exec_command(const std::string& cmd) const
{
	// iRemocon へ接続
	boost::asio::ip::tcp::iostream s(ep_);

	// iRemocon へコマンド送信
	s.expires_from_now(boost::posix_time::seconds(5));
	std::cout << boost::format("[IREMOCON][SEND] COMMAND: *%1%\\r\\n") % cmd;
	s << boost::format("*%1%\r\n") % cmd;

	// 返ってきた結果を見る
	std::string line;
	getline(s, line);
	if (line == "") {
		std::cout << boost::format(" --> TIMEOUT\n");
		return false;
	}
	else if (line.find("err") != std::string::npos) {
		std::cout << boost::format(" --> ERROR: %1%\n") % line;
		return false;
	}
	std::cout << boost::format(" --> OK: %1%\n") % line;
	return true;
}

/* ------------------------------------------------------------------------- */
//! iRemocon 赤外線送出命令
/* ------------------------------------------------------------------------- */
bool iRemocon::ir_send(const int num) const
{
	std::stringstream ss;
	ss << boost::format("is;%1%") % num;
	return exec_command(ss.str());
}


/* ------------------------------------------------------------------------- */
//! iRemocon 赤外線学習命令
/* ------------------------------------------------------------------------- */
bool iRemocon::ir_recieve(const int num) const
{
	std::stringstream ss;
	ss << boost::format("ic;%1%") % num;
	return exec_command(ss.str());
}
