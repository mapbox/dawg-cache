#include <nan.h>
#include <string>
#include "build_dawg.cpp"

using v8::FunctionTemplate;
using v8::Handle;
using v8::Object;
using v8::String;
using Nan::GetFunction;
using Nan::New;
using Nan::Set;
using Nan::ObjectWrap;

class JSDawg : public Nan::ObjectWrap {
    public:
        static NAN_MODULE_INIT(Init) {
            v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
            tpl->SetClassName(Nan::New("Dawg").ToLocalChecked());
            tpl->InstanceTemplate()->SetInternalFieldCount(1);

            SetPrototypeMethod(tpl, "insert", Insert);
            SetPrototypeMethod(tpl, "finish", Finish);
            SetPrototypeMethod(tpl, "lookup", Lookup);
            SetPrototypeMethod(tpl, "edgeCount", EdgeCount);
            SetPrototypeMethod(tpl, "nodeCount", NodeCount);

            constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
            Nan::Set(
                target,
                Nan::New("Dawg").ToLocalChecked(),
                Nan::GetFunction(tpl).ToLocalChecked()
            );
        }
    private:
        explicit JSDawg() {}
        ~JSDawg() {}
        Dawg dawg_;

    static NAN_METHOD(New) {
        if (info.IsConstructCall()) {
            JSDawg *obj = new JSDawg();
            obj->Wrap(info.This());
            info.GetReturnValue().Set(info.This());
        } else {
            v8::Local<v8::Function> cons = Nan::New(constructor());
            info.GetReturnValue().Set(cons->NewInstance());
        }
    }

    static NAN_METHOD(Insert) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        String::Utf8Value utf8_value(info[0].As<String>());
        std::string input = std::string(*utf8_value, utf8_value.length());
        bool ret = obj->dawg_.insert(input);

        info.GetReturnValue().Set(ret);
    }

    static NAN_METHOD(Finish) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        obj->dawg_.finish();
    }

    static NAN_METHOD(Lookup) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        String::Utf8Value utf8_value(info[0].As<String>());
        std::string input = std::string(*utf8_value, utf8_value.length());
        bool ret = obj->dawg_.lookup(input);

        info.GetReturnValue().Set(ret);
    }

    static NAN_METHOD(EdgeCount) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        info.GetReturnValue().Set(obj->dawg_.edge_count());
    }

    static NAN_METHOD(NodeCount) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        info.GetReturnValue().Set(obj->dawg_.node_count());
    }

    static inline Nan::Persistent<v8::Function> & constructor() {
        static Nan::Persistent<v8::Function> my_constructor;
        return my_constructor;
    }
};

NODE_MODULE(jsdawg, JSDawg::Init)