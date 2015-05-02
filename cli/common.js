exports.getArgs = function() {
  var ret = {_: []};
  for (var t = 2;t < process.argv.length;t++) {
    if (process.argv[t][0] === '-') {
      ret[process.argv[t].slice(1)] = (process.argv[t][1] === '-')?1:process.argv[++t];
    }
    else if (process.argv[t][0] !== '-')
      ret._.push(process.argv[t]);
  }
  return ret;
};

exports.onReadStdin = function(callback) {
  var stdin = '';

  process.stdin.on('readable', readChunk);
  process.stdin.on('end', streamEnd);

  function readChunk() {
    var tmp = process.stdin.read();
    if (tmp === null) return;

    stdin += tmp;
  }

  function streamEnd() {
    callback(stdin);
  }
};

exports.die = function(reason) {
  process.stderr.write(reason+'\n');
  process.exit();
}

exports.progressForStack = function(stack) {
  var t, progress = 0;
  var cm = 8;

  progress += stack[0]/cm;

  for (t=1;t<stack.length && t<5;t++) {
    cm *= 9;
    progress += (stack[t] + 1)/(cm);
  }

  return progress;
}