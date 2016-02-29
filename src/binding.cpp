#include <nan.h>
#include <string>
#include "builder.cpp"

using v8::FunctionTemplate;
using v8::Handle;
using v8::Object;
using v8::String;
using Nan::GetFunction;
using Nan::New;
using Nan::Set;
using Nan::ObjectWrap;

void free_dawg_vector(char* data, void* hint) {
    delete (std::vector<unsigned char>*)hint;
}

typedef struct {
    unsigned int node_offset;
    unsigned int edge_idx;
    bool visited;
} node_position;

class JSDawg : public Nan::ObjectWrap {
    public:
        static void Init(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target) {
            v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
            tpl->SetClassName(Nan::New("Dawg").ToLocalChecked());
            tpl->InstanceTemplate()->SetInternalFieldCount(1);

            SetPrototypeMethod(tpl, "insert", Insert);
            SetPrototypeMethod(tpl, "finish", Finish);
            SetPrototypeMethod(tpl, "lookup", Lookup);
            SetPrototypeMethod(tpl, "lookupPrefix", LookupPrefix);
            SetPrototypeMethod(tpl, "edgeCount", EdgeCount);
            SetPrototypeMethod(tpl, "nodeCount", NodeCount);
            SetPrototypeMethod(tpl, "toCompactDawgBuffer", ToCompactDawgBuffer);

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
        bool success = obj->dawg_.insert(input);

        if (!success) {
            Nan::ThrowError("Entries must be inserted in order");
        }
    }

    static NAN_METHOD(Finish) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        obj->dawg_.finish();
    }

    static NAN_METHOD(Lookup) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        String::Utf8Value utf8_value(info[0].As<String>());
        std::string input = std::string(*utf8_value, utf8_value.length());
        bool found = obj->dawg_.lookup(input);

        info.GetReturnValue().Set(found);
    }

    static NAN_METHOD(LookupPrefix) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        String::Utf8Value utf8_value(info[0].As<String>());
        std::string input = std::string(*utf8_value, utf8_value.length());
        bool found = obj->dawg_.lookup_prefix(input);

        info.GetReturnValue().Set(found);
    }

    static NAN_METHOD(EdgeCount) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        info.GetReturnValue().Set(obj->dawg_.edge_count());
    }

    static NAN_METHOD(NodeCount) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());
        info.GetReturnValue().Set(obj->dawg_.node_count());
    }

    static NAN_METHOD(ToCompactDawgBuffer) {
        JSDawg* obj = Nan::ObjectWrap::Unwrap<JSDawg>(info.This());

        std::vector<unsigned char>* output = new std::vector<unsigned char>();
        build_compact_dawg(&(obj->dawg_), output, false);

        Nan::MaybeLocal<v8::Object> out = Nan::NewBuffer(
            (char*)(&((*output)[0])),
            output->size(),
            free_dawg_vector,
            output
        );
        info.GetReturnValue().Set(out.ToLocalChecked());
    }

    static inline Nan::Persistent<v8::Function> & constructor() {
        static Nan::Persistent<v8::Function> my_constructor;
        return my_constructor;
    }
};

NAN_METHOD(CompactLookup) {
    v8::Local<v8::Object> bufferObj = info[0]->ToObject();
    String::Utf8Value utf8_value(info[1].As<String>());

    unsigned char* search = (unsigned char*) *utf8_value;
    size_t search_length = utf8_value.length();

    unsigned char* full_data = (unsigned char*) node::Buffer::Data(bufferObj);
    unsigned char* data = full_data + DAWG_HEADER_SIZE;

    unsigned int flagged_offset, node_final = 0;
    int node_offset = 0, edge_count, edge_offset, min, max, guess;
    bool match = false;
    char search_letter, letter;

    for (size_t i = 0; i < search_length; i++) {
        // binary search over the node edges
        match = false;
        search_letter = search[i];

        if (node_offset != -1) {
            edge_count = (int) data[node_offset];

            min = 0;
            max = edge_count - 1;

            while (min <= max) {
                guess = (min + max) >> 1;
                edge_offset = node_offset + 1 + (5 * guess);
                letter = data[edge_offset];
                if (letter == search_letter) {
                    match = true;
                    break;
                }
                else {
                    if (letter < search_letter) {
                        min = guess + 1;
                    } else {
                        max = guess - 1;
                    }
                }
            }
        }
        if (match) {
            memcpy(&flagged_offset, &(data[edge_offset + 1]), sizeof(unsigned int));

            node_offset = (int)(flagged_offset & FINAL_MASK);
            node_final = flagged_offset & IS_FINAL_FLAG;

            if (node_offset == 0) node_offset = -1;
        } else {
            info.GetReturnValue().Set(0);
            return;
        }
    }

    info.GetReturnValue().Set(node_final ? 2 : 1);
    return;
}

class CompactIterator : public Nan::ObjectWrap {
    public:
        static void Init(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target) {
            v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
            tpl->SetClassName(Nan::New("CompactDawgIterator").ToLocalChecked());
            tpl->InstanceTemplate()->SetInternalFieldCount(1);

            SetPrototypeMethod(tpl, "next", Next);

            constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
            Nan::Set(
                target,
                Nan::New("CompactDawgIterator").ToLocalChecked(),
                Nan::GetFunction(tpl).ToLocalChecked()
            );
        }
    private:
        explicit CompactIterator() {}
        ~CompactIterator() {}
        Nan::Persistent<v8::Object> persistentBuffer;
        unsigned char* data;
        std::vector<node_position>* stack;
        std::vector<unsigned char>* current_word;

    static NAN_METHOD(New) {
        if (info.IsConstructCall()) {
            v8::Local<v8::Object> bufferObj = info[0]->ToObject();
            CompactIterator *obj = new CompactIterator();
            obj->Wrap(info.This());
            // store the buffer as a persistent
            obj->persistentBuffer.Reset(bufferObj);
            info.GetReturnValue().Set(info.This());

            unsigned char* full_data = (unsigned char*) node::Buffer::Data(bufferObj);
            obj->data = full_data + DAWG_HEADER_SIZE;
            obj->current_word = new std::vector<unsigned char>();
            obj->stack = new std::vector<node_position>();

            // enqueue the root
            node_position current_position;
            current_position.node_offset = 0;
            current_position.edge_idx = 0;
            current_position.visited = false;

            obj->stack->push_back(current_position);
        } else {
            const int argc = 1;
            v8::Local<v8::Value> argv[argc] = {info[0]};
            v8::Local<v8::Function> cons = Nan::New(constructor());
            info.GetReturnValue().Set(Nan::NewInstance(cons, argc, argv).ToLocalChecked());
        }
    }

    static NAN_METHOD(Finish) {
        CompactIterator* obj = Nan::ObjectWrap::Unwrap<CompactIterator>(info.This());
        // release the persistent to the buffer
        obj->persistentBuffer.Reset();
    }

    static NAN_METHOD(Next) {
        CompactIterator* obj = Nan::ObjectWrap::Unwrap<CompactIterator>(info.This());

        unsigned char* data = obj->data;
        std::vector<node_position>* stack = obj->stack;
        std::vector<unsigned char>* current_word = obj->current_word;

        unsigned int flagged_offset, next_final = 0;
        unsigned int next_offset = 0, edge_count, edge_offset;
        char letter;
        node_position current_position, new_back;

        std::string output;
        bool has_output = false;

        while (stack->size() > 0 && !has_output) {
            // if the stack is empty, we're done
            if (!stack->size()) break;

            current_position = stack->back();

            edge_offset = current_position.node_offset + 1 + (5 * current_position.edge_idx);
            letter = data[edge_offset];

            memcpy(&flagged_offset, &(data[edge_offset + 1]), sizeof(unsigned int));
            next_offset = (int)(flagged_offset & FINAL_MASK);
            next_final = flagged_offset & IS_FINAL_FLAG;

            if (next_final) {
                has_output = true;
                output = std::string(current_word->begin(), current_word->end()) + letter;
            }

            if (next_offset == 0 || current_position.visited) {
                stack->pop_back();

                new_back = stack->back();
                new_back.visited = true;
                stack->pop_back();
                stack->push_back(new_back);

                edge_count = (int) data[current_position.node_offset];
                if (current_position.edge_idx < edge_count - 1) {
                    // done with the children, but still have siblings so move laterally
                    current_position.edge_idx++;
                    current_position.visited = false;
                    stack->push_back(current_position);
                } else {
                    // otherwise we'll move back up the tree
                    current_word->pop_back();
                }
            } else {
                // "recurse" down
                current_position.node_offset = next_offset;
                current_position.edge_idx = 0;
                current_position.visited = false;
                stack->push_back(current_position);
                current_word->push_back(letter);
            }
        }

        if (has_output) {
            info.GetReturnValue().Set(Nan::New(output).ToLocalChecked());
        }

        return;
    }

    static inline Nan::Persistent<v8::Function> & constructor() {
        static Nan::Persistent<v8::Function> my_constructor;
        return my_constructor;
    }
};

NAN_METHOD(Crc32c) {
    Nan::HandleScope scope;
    uint32_t crc;

    if (info.Length() != 1) {
        Nan::ThrowTypeError("Invalid number of arguments");
        return;
    }

    if (node::Buffer::HasInstance(info[0])) {
        v8::Local<v8::Object> buf = info[0]->ToObject();
        crc = crc32c((const char *)node::Buffer::Data(buf), (size_t)node::Buffer::Length(buf));
    } else {
        Nan::ThrowTypeError("Input must be a buffer");
        return;
    }

    info.GetReturnValue().Set(Nan::New<v8::Uint32>(crc));
}

static NAN_MODULE_INIT(Init) {
    JSDawg::Init(target);
    CompactIterator::Init(target);
    Nan::Set(
        target,
        Nan::New("compactDawgBufferLookup").ToLocalChecked(),
        Nan::GetFunction(New<FunctionTemplate>(CompactLookup)).ToLocalChecked()
    );
    Nan::Set(
        target,
        Nan::New("crc32c").ToLocalChecked(),
        Nan::GetFunction(New<FunctionTemplate>(Crc32c)).ToLocalChecked()
    );
}

NODE_MODULE(jsdawg, Init)