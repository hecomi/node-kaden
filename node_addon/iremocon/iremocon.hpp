#ifndef INCLUDE_IREMOCON_CLIENT_HPP
#define INCLUDE_IREMOCON_CLIENT_HPP

#include <string>
#include <boost/asio.hpp>

/**
 * iRemoconを操作するクラス
 */
class iRemocon
{
private:
	//! endpoint for iRemocon
	const boost::asio::ip::tcp::endpoint ep_;

public:
	/**
	 * Constructor
	 * @param [in] ip	IPアドレス (e.g. 192.168.0.3)
	 * @param [in] port	ポート番号 (e.g. 51013)
	 */
	iRemocon(const std::string& ip, const int port);

	/**
	 * iRemocon に telnet 経由でコマンドを送る
	 * @param [in] cmd	コマンド（e.g. is;5）
	 * @return			コマンド送信の成否
	 */
	bool exec_command(const std::string& cmd) const;

	/**
	 * iRemocon から IR 信号を発信する
	 * @param [in] num	発信する学習した IR 信号番号
	 * @return			コマンド送信の成否
	 */
	bool ir_send(const int num) const;

	/**
	 * iRemocon で IR 信号を学習する
	 * @param [in] num	学習する IR 信号番号
	 * @return			コマンド送信の成否
	 */
	bool ir_recieve(const int num) const;
};

#endif // INCLUDE_IREMOCON_CLIENT_HPP
