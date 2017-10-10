import os
from os import walk
import re
import json
import commentjson

# https://stackoverflow.com/a/241506
def comment_remover(text):
    def replacer(match):
        s = match.group(0)
        if s.startswith('/'):
            return " " # note: a space and not an empty string
        else:
            return s
    pattern = re.compile(
        r'//.*?$|/\*.*?\*/|\'(?:\\.|[^\\\'])*\'|"(?:\\.|[^\\"])*"',
        re.DOTALL | re.MULTILINE
    )
    return re.sub(pattern, replacer, text)

def process_files():
    for (dirpath, dirnames, filenames) in walk("./src/"):
        if dirnames:
            for _dir in dirnames:
                for _f in filenames:
                    print os.path.join(dirpath,_dir,_f)
        else:
            for _f in filenames:
                print 'yes'
                data = open(os.path.join(dirpath,_f),'r');
                new_data = []
                for line in data.readlines():
                    print comment_remover(line)


with open('./binding.gyp') as json_data:
    d = eval(json_data.read(),{'__builtins__': None},None)
    print(json.dumps(d,indent=2))
