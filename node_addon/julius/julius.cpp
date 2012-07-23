#include <iostream>
#include <cstring>
#include "julius.hpp"

Julius::Julius(const std::string& jconf)
: jconf_(nullptr), recog_(nullptr)
{
	init(jconf);
}

Julius::~Julius()
{
	j_close_stream(recog_);
	recog_->jconf = nullptr;
	j_recog_free(recog_);
}

void Julius::init(const std::string& jconf)
{
	// Arguments
	const char* j_argv[] = {
		"has",
		"-C",
		jconf.c_str(),
	};
	const int j_argc = sizeof(j_argv) / sizeof(j_argv[0]);

	// jconf: configuration parameters
	// load configurations from command arguments
	jconf_ = j_config_load_args_new(j_argc, const_cast<char**>(j_argv));
	if (jconf_ == nullptr) {
		std::cout << "Error@j_config_load_args_new" << std::endl;
		exit(EXIT_FAILURE);
	}

	// Recog: Top level instance for the whole recognition process
	// create recognition instance according to the jconf
	recog_ = j_create_instance_from_jconf(jconf_);
	if (recog_ == nullptr) {
		std::cout << "Error@j_create_instance_from_jconf" << std::endl;
		exit(EXIT_FAILURE);
	}

	// Initialize audio input
	if (j_adin_init(recog_) == FALSE) {
		std::cout << "Error@j_adin_init" << std::endl;
		exit(EXIT_FAILURE);
	}

	// Disable debug & verbose messages
	// j_disable_debug_message();
	// j_disable_verbose_message();

}

void Julius::start()
{
	// Open input stream and recognize
	switch (j_open_stream(recog_, nullptr)) {
		case  0: break; // success
		case -1: std::cout << "Error in input stream" << std::endl; return;
		case -2: std::cout << "Failed to begin input stream" << std::endl; return;
	}

	// Recognition loop
	// thread_ = new std::thread([&]() {
		j_recognize_stream(recog_);
	// });
	// j_recognize_stream(recog_);

	// Waiting for input
	std::string line;
	getline(std::cin, line);
}

int Julius::add_callback(const int code, callback func, void* ptr)
{
	return callback_add(recog_, code, func, ptr);
}

int Julius::add_speech_ready_callback(callback func, void* ptr)
{
	return callback_add(recog_, CALLBACK_EVENT_SPEECH_READY, func, ptr);
}

int Julius::add_speech_start_callback(callback func, void* ptr)
{
	return callback_add(recog_, CALLBACK_EVENT_SPEECH_START, func, ptr);
}

int Julius::add_result_callback(callback func, void* ptr)
{
	return callback_add(recog_, CALLBACK_RESULT, func, ptr);
}

bool Julius::delete_callback(const int id)
{
	return callback_delete(recog_, id);
}

