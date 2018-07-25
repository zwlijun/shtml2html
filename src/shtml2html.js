var fs  = require('fs'),
    path = require('path');

var encoding = 'binary';
var ROOT = process.cwd() + '/';
var buffer = null;
var msgs = [];
var types = ['success', 'fail', 'warn'];

var mkdir = function(dest) {
    var destDirs = dest.split(/[\\/]/),
        destDirsLen = destDirs.length,
        destDir = '';

    if (!fs.existsSync(dest)) {
        destDirs.forEach(function(dir, i) {
            if (i < destDirsLen - 1) {
                destDir += dir + '/';
                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir);
                    msgs.push({msg: '[mkdir] ' + destDir + ''});
                }
            }
        });
    }
};

var fixPath = function(src) {
    if (src && src.charAt(src.length - 1) !== '/') src += '/';
    return src;
};

var parseExternalLink = function(wwwroot, refFilePath, content){
    var pattern = /(href|src)[\s]*=[\s]*["']([^\s]+)["']/gi;
    var matcher = null;
    var link = null;
    var absoultePath = null;
    var relativePath = null;
    var replacement = content;

    pattern.lastIndex = 0;

    while(null != (matcher = pattern.exec(content))){
        link = matcher[2];

        if(link.charAt(0) === "/"){
            absoultePath = path.resolve(path.join(wwwroot, link));
            relativePath = path.relative(refFilePath, link.substring(1));

            relativePath = relativePath.replace(/\\/g, "/")
                                       .replace(".shtml", ".html");

            replacement = replacement.replace(link, relativePath.substring(3));
        }
        
    }

    return replacement;
};

var merge = function(src, dest, wwwroot, save) {
    var baseSrc = path.dirname(src) + '/', 
        baseDest = path.dirname(dest) + '/', 
        file, incs,
        result = 0;
    dest = dest.replace(/.shtml$/i, '.html');

    if (fs.existsSync(src)) {
        if (buffer[src]) {
            file = buffer[src];
        }
        else {
            file = fs.readFileSync(src, encoding);

            incs = file.match(/<!--\s*#include.+?"\s*-->/ig) || [];
            incs.forEach(function(inc, i) {
                var incFile = inc.match(/"(.+)"\s*-->/i)[1], replacement, incSrc, incDest;
                
                if (incFile.charAt(0) === '/') {
                    if (wwwroot === undefined) {
                        msgs.push({msg: 'require <--wwwroot> to find file ' + incFile, type: types[2]});
                        result = 1;
                        return;
                    }
                    else {
                        incSrc = path.resolve(wwwroot + incFile);
                        incDest = baseDest + incSrc.replace(process.cwd() + '\\', '');
                    }
                }
                else {
                    incSrc = baseSrc + incFile;
                    incDest = baseDest + incFile;
                }
                replacement = merge(incSrc, incDest, wwwroot, false);

                replacement = parseExternalLink(wwwroot, path.resolve(src), replacement)

                // console.warn(">>> " + path.resolve(src))
                // console.log("@>>> " + path.relative(path.resolve(src), path.resolve(incSrc)))

                if (replacement === undefined) {
                    result = 1;
                }
                else {
                    file = file.replace(inc, replacement);
                }
            });

            if (save) {
                if (result === 0) {
                    mkdir(dest);
                    fs.writeFileSync(dest, file, encoding);
                }
                msgs.push({msg: dest, type: types[result]});
            }
            else {
                buffer[dest] = file;
            }
        }
    }
    else {
        msgs.push({msg: 'file ' + src + ' not found', type: types[1]});
    }

    return file;
};

var fetch = function(from, to, wwwroot){
    if (fs.statSync(from).isFile()) {
        if (!path.extname(to)) {
            to = fixPath(to) + from;
        }

        merge(from, to, wwwroot, true);
    }
    else if (fs.statSync(from).isDirectory()) {
        from = fixPath(from);
        to = fixPath(to);

        var files = fs.readdirSync(from);

        files.forEach(function(src, i) {
            fileSrc = from + src;
            fileDest = to + src;
            if (fs.statSync(fileSrc).isFile()) {
                if (path.extname(src) !== '.shtml') return;
                merge(fileSrc, fileDest, wwwroot, true);
            } else {
                fetch(fileSrc, fileDest, wwwroot);
            }
        });
    }
}

var shtml2html = function(from, to, wwwroot, callback) {
    from = from || './';
    to = to || './_shtml2html_' + (+new Date()).toString().substring(6) + '/';
    wwwroot = fixPath(wwwroot);
    buffer = {};

    fetch(from, to, wwwroot);

    callback(msgs);

    buffer = null;
    msgs = [];
};


module.exports = shtml2html;
