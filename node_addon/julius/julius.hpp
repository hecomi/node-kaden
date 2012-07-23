#ifndef INCLUDE_JULIUS_HPP
#define INCLUDE_JULIUS_HPP

#include <string>
#include <thread>
#include <julius/juliuslib.h>

/**
 * C++ wrapper class for Julius
 */
class Julius
{
public:
	//! callback function
	typedef void (*callback)(Recog*, void*);

	/**
	 * Constructor
	 * @param[in] jconf	jconf file name (-C parameter for Julius)
	 */
	Julius(const std::string& jconf);

	/**
	 *  Destroctor
	 */
	~Julius();

	/**
	 *  Start Julius
	 */
	void start();

	/**
	 *  add callback functions
	 *  @param[in] callback code (e.g. CALLBACK_EVENT_SPEECH_READY)
	 *  @param[in] callback function
	 *  @param[in] the instance that adds callback function
	 *  @return callback ID
	 */
	int add_callback(const int code, callback func, void* has = nullptr);

	/**
	 *  add speech ready callback function
	 *  @param[in] callback function
	 *  @param[in] the instance that adds callback function
	 *  @return callback ID
	 */
	int add_speech_ready_callback(callback func, void* has = nullptr);

	/**
	 *  add speech start callback function
	 *  @param[in] callback function
	 *  @param[in] the instance that adds callback function
	 *  @return callback ID
	 */
	int add_speech_start_callback(callback func, void* has = nullptr);

	/**
	 *  add result callback function
	 *  @param[in] callback function
	 *  @param[in] the instance that adds callback function
	 *  @return callback ID
	 */

	int add_result_callback(callback func, void* has = nullptr);

	/**
	 *  delete callback functions
	 *  @param[in] callback ID
	 *  @return true:success, false:failed
	 */
	bool delete_callback(const int id);

// private:
	/**
	 *  do some initialization process for Julius
	 *  @param[in] jconf jconf file name (-C parameter for Julius)
	 *  @param[in] gram  grammar bundle name (-gram parameter for Julius)
	 */
	void init(const std::string& jconf);

	//! configuration parameter for Julius
	Jconf* jconf_;

	//! top level instance for the whole recognition process in Julius
	Recog* recog_;

	//! for premature ending of Julius
	std::thread* thread_;

	// callback functions

};

#endif // INCLUDE_JULIUS_HPP
