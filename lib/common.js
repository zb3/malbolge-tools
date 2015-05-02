var mb = require('malbolge-vm');

module.exports.parseTargetString = function(target) {
  var t, ret = [],
    escape = false;

  for (t = 0; t < target.length; t++) {
    if (escape) {
      if (target[t] === '\\')
        ret.push(target.charCodeAt(t));
      else if (target[t] === 'p')
        ret.push(-1);
      else if (target[t] === 'x')
        ret.push(-2);
      else if (target[t] === 's')
        ret.push(-3);
      escape = false;
    } else {
      if (target[t] === '\\')
        escape = true;
      else
        ret.push(target.charCodeAt(t));
    }
  }

  for (t = 0; t < ret.length - 1; t++) //-1,-1 -> -1,-2,-1
    if (ret[t] === -1 && ret[t + 1] === -1)
      ret.splice(++t, 0, -2);

  if (ret[ret.length - 1] === -1)
    ret.push(10);

  return ret;
};

module.exports.parseRandomPool = function(str) {
  if (!str) return [];

  var t, ret = [];
  for (t = 0; t < str.length; t++)
    ret.push((str[t] === ' ') ? 0 : mb.assembly[str[t]]);
  return ret;
};

module.exports.progressForStack = function(stack) {
  var t, progress = 0,
    cm = 8;

  progress += stack[0] / cm;

  for (t = 1; t < stack.length && t < 5; t++) {
    cm *= 9;
    progress += (stack[t] + 1) / (cm);
  }

  return progress;
};