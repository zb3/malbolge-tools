require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
},{"malbolge-vm":2}],2:[function(require,module,exports){
var xlat1 = '+b(29e*j1VMEKLyC})8&m#~W>qxdRp0wkrUo[D7,XTcA"lI.v%{gJh4G\\-=O@5`_3i<?Z\';FNQuY]szf$!BS/|t:Pn6^Ha';
var xlat2 = '5z]&gqtyfr$(we4{WP)H-Zn,[%\\3dL+Q;>U!pJS72FhOA1CB6v^=I_0/8|jsb9m<.TVac`uY*MK\'X~xDl}REokN:#?G"i@';
var legal = 'ji*p</vo';
var space = '\t\r\n\v\f ';
var EXIT = -1;
var WANTS_INPUT = -2;

var opc = {
  jump: 4,
  out: 5,
  in : 23,
  rot: 39,
  movd: 40,
  opr: 62,
  nop: 68,
  halt: 81
};
var opcodes = [4, 5, 23, 39, 40, 62, 68, 81];
var assembly = {
  'i': 4,
  '<': 5,
  '/': 23,
  '*': 39,
  'j': 40,
  'p': 62,
  'o': 68,
  'v': 81
};

/*
VM format:
{mem: [], a: 0, c: 0, d: 0}
c points at the new instruction
*/

function loadVM(str, partially) {
  var vm = {
    mem: [],
    a: 0,
    c: 0,
    d: 0
  };
  var t, tt, pos = 0;

  for (t = 0; t < str.length; t++) {
    if (space.indexOf(str[t]) !== -1) continue;
    tt = str.charCodeAt(t);
    if (tt < 127 && tt > 32 && legal.indexOf(xlat1[(tt - 33 + pos) % 94]) === -1)
      throw 'Illegal character.';

    if (pos === 59049) {
      throw 'Code too long!';
    }

    vm.mem[pos++] = tt;
  }

  if (!partially)
    while (pos < 59049)
      vm.mem[pos] = op(vm.mem[pos - 1], vm.mem[pos - 2]), pos++;

  return vm;
}

function step(vm, input) {
  if (vm.mem[vm.c] < 33 || vm.mem[vm.c] > 126)
    throw 'Would enter infinite loop!';

  var output = null;
  var va = vm.a;
  var vc = vm.c;
  var vd = vm.d;
  var vmd = vm.mem[vm.d];

  var opcode = xlat1[(vm.mem[vc] - 33 + vc) % 94];

  switch (opcode) {
    case 'j':
      vm.d = vmd;
      break;
    case 'i':
      vm.c = vmd;
      break;
    case '*':
      vm.a = vm.mem[vd] = (vmd / 3 | 0) + vmd % 3 * 19683;
      break;
    case 'p':
      vm.a = vm.mem[vd] = op(va, vmd);
      break;
    case '<':
      output = va % 256;
      break;
    case '/':

      if (input !== undefined && input !== null)
        vm.a = input;
      else throw WANTS_INPUT;

      break;
    case 'v':
      return EXIT;
  }

  if (vm.mem[vm.c] < 33 || vm.mem[vm.c] > 126) {
    vm.a = va;
    vm.c = vc;
    vm.d = vd;
    vm.mem[vd] = vmd;
    throw 'Illegal ' + (opcode === 'i' ? 'jump' : 'write') + '!';
  }

  vm.mem[vm.c] = xlat2.charCodeAt(vm.mem[vm.c] - 33);
  if (vm.c === 59048) vm.c = 0;
  else vm.c++;
  if (vm.d === 59048) vm.d = 0;
  else vm.d++;

  return output;
}

op.p9 = [1, 9, 81, 729, 6561];
op.o = [
  [4, 3, 3, 1, 0, 0, 1, 0, 0],
  [4, 3, 5, 1, 0, 2, 1, 0, 2],
  [5, 5, 4, 2, 2, 1, 2, 2, 1],
  [4, 3, 3, 1, 0, 0, 7, 6, 6],
  [4, 3, 5, 1, 0, 2, 7, 6, 8],
  [5, 5, 4, 2, 2, 1, 8, 8, 7],
  [7, 6, 6, 7, 6, 6, 4, 3, 3],
  [7, 6, 8, 7, 6, 8, 4, 3, 5],
  [8, 8, 7, 8, 8, 7, 5, 5, 4]
];

function op(x, y) {
  var j, t = 0;

  for (j = 0; j < 5; j++)
    t += op.o[(y / op.p9[j] | 0) % 9][(x / op.p9[j] | 0) % 9] * op.p9[j];

  return t;
}

function exec(vm) {
  var t, output = '';
  while (vm.c < vm.mem.length && (t = step(vm)) !== EXIT) {
    if (t !== null)
      output += String.fromCharCode(t);
  }
  return output;
}

function appendAndPerform(vm, op, input, skip) {
  var l = skip ? vm.mem.length : vm.c;
  var t = (op - (l) % 94 + 94) % 94;

  if (t < 33)
    t += 94;

  vm.mem.push(t);

  if (!skip)
    step(vm, input);

  return String.fromCharCode(t);
}

function clone(vm) {
  return {
    a: vm.a,
    c: vm.c,
    d: vm.d,
    mem: vm.mem.slice(0)
  };
}

function decode(code, position) {
  return decodeInt(code.charCodeAt(0), position);
}

function decodeInt(code, position) {
  return xlat1[(code - 33 + position) % 94];
}

function decodeNext(vm) {
  return decodeInt(vm.mem[vm.c], vm.c);
}

function normalize(code, allowWildcard) {
  var t, ct, skipped = 0;
  var normalized = '';

  for (t = 0; t < code.length; t++) {
    ct = code.charCodeAt(t);

    if (ct < 127 && (ct > 32 || (allowWildcard && ct === 32)))
      normalized += code[t] === ' ' ? ' ' : decodeInt(ct, t - skipped);
    else {
      skipped++;
      normalized += code[t];
    }
  }
  return normalized;
}

function assemble(normalized, allowWildcard) {
  var t, ct, skipped = 0;
  var code = '';

  for (t = 0; t < normalized.length; t++) {
    ct = normalized.charCodeAt(t);

    if (ct < 127 && (ct > 32 || (allowWildcard && ct === 32)))
      code += normalized[t] === ' ' ? ' ' : encode(assembly[normalized[t]], t - skipped);
    else {
      skipped++;
      code += normalized[t];
    }
  }
  return code;
}

function rot(m) {
  return (m / 3 | 0) + m % 3 * 19683;
}

function encode(code, position) {
  return String.fromCharCode(encodeInt(code, position));
}

function encodeInt(code, position) {
  var t = (code - (position) % 94 + 94) % 94;

  if (t < 33)
    t += 94;

  return t;
}

/*
This intentionally does not allow newlines and other garbage characters
*/
function validateCode(code, normalized, allowWildcard) {
  if (normalized)
    return (allowWildcard ? /^[o*p/<vij ]*$/ : /^[o*p/<vij]*$/).test(code);
  else
    return validateCode(normalize(code), true, allowWildcard);
}

function validate(code, normalized) {
  var trimmed = '';

  for (var t = 0, ct; t < code.length; t++) {
    ct = code.charCodeAt(t);

    if (ct < 127 && ct > 32)
      trimmed += code[t];
  };

  return validateCode(trimmed, normalized, false);
}

module.exports.EXIT = EXIT;
module.exports.WANTS_INPUT = WANTS_INPUT;
module.exports.appendAndPerform = appendAndPerform;
module.exports.clone = clone;
module.exports.decode = decode;
module.exports.decodeInt = decodeInt;
module.exports.decodeNext = decodeNext;
module.exports.normalize = normalize;
module.exports.assemble = assemble;
module.exports.rot = rot;
module.exports.load = loadVM;
module.exports.step = step;
module.exports.exec = exec;
module.exports.op = op;
module.exports.rot = rot;
module.exports.xlat1 = xlat1;
module.exports.xlat2 = xlat2;
module.exports.encode = encode;
module.exports.encodeInt = encodeInt;
module.exports.opc = opc;
module.exports.opcodes = opcodes;
module.exports.assembly = assembly;
module.exports.validateCode = validateCode;
module.exports.validate = validate;
},{}],"gen-bor":[function(require,module,exports){
var mb = require('malbolge-vm'),
  gc = require('./common');
var opcodes = [mb.opc.out, mb.opc.movd, mb.opc.jump, mb.opc.rot, mb.opc.opr, mb.opc.in, mb.opc.halt, mb.opc.nop];
var vm, vmstack, target, maxdepth, pool, it, firstQueue = [],
  useQueue = false;

function genStr() {
  var t, str = '';

  var tpool = pool.slice();
  for (t = 0; t <= vm.highestAddress; t++) {
    if (vm.str[t] !== undefined)
      str += String.fromCharCode(vm.str[t]);
    else
      str += mb.encode(tpool.shift() || mb.opcodes[Math.random() * mb.opcodes.length | 0], t);
  }
  return str;
}

function cloneMem(mem) {
  return mem.slice();
}

function clone(vm) {
  return {
    a: vm.a,
    c: vm.c,
    d: vm.d,
    mem: cloneMem(vm.mem),
    str: cloneMem(vm.str),
    curPos: vm.curPos,
    curCode: vm.curCode,
    highestAddress: vm.highestAddress,
    progress: vm.progress,
    sinceProgress: vm.sinceProgress,
    done: vm.done
  };
}

function getmem(addr) {
  if (vm.mem[addr] !== undefined) {
    return vm.mem[addr];
  } else {
    if (vm.sinceProgress == maxdepth)
      return false;

    if (addr > vm.highestAddress) {
      vm.highestAddress = addr;
    }

    if (vm.highestAddress >= bestWin)
      return false;

    vm.curPos = addr;
    if (useQueue) {
      vm.curCode = firstQueue.shift();
      useQueue = firstQueue.length;
    } else
      vm.curCode = 0;
    vm.mem[addr] = vm.str[addr] = mb.encodeInt(opcodes[vm.curCode], addr);
    vm.sinceProgress++;

    vmstack.push(clone(vm));
    vm = vmstack[vmstack.length - 1];

    return vm.mem[addr];
  }
}

function exec() {
  var vmc, vmd;
  while (true) {
    vmc = getmem(vm.c); //do vmd
    if (vmc === false) return false;

    if (vmc < 33 || vmc > 126)
      return false;

    if (!vm.done)
      switch (mb.xlat1[(vmc - 33 + vm.c) % 94]) {
        case 'j':
        case 'i':
        case '*':
        case 'p':

          vmd = getmem(vm.d);
          if (vmd === false) return false;

          break;
      }

    if (!vm.done)
      switch (mb.xlat1[(vmc - 33 + vm.c) % 94]) {
        case 'j':
          vm.d = vmd;
          break;
        case 'i':
          vm.c = vmd;
          break;
        case '*':
          if (target[vm.progress] === -3) //we can't lose a - we have to store it somewhere
            return false;

          if (target[vm.progress] === -2) //we want to get rid of user input - avoid storing it!
          {
            vm.progress++;
            vm.sinceProgress = 0;
          }
          vm.a = vm.mem[vm.d] = (vmd / 3 | 0) + vmd % 3 * 19683;

          break;
        case 'p':

          if (target[vm.progress] === -2) //we can't store|output user input now!
            return false;

          if (target[vm.progress] === -3) //we need to store user input before we can proceed
          {
            vm.progress++;
            vm.sinceProgress = 0;
          }

          vm.a = vm.mem[vm.d] = mb.op(vm.a, vmd);

          break;
        case '<':

          if ((vm.a % 256) !== target[vm.progress])
            return false;

          vm.progress++;
          vm.sinceProgress = 0;

          break;
        case '/':

          if (target[vm.progress] === -2 && target[vm.progress + 1] === -1)
            vm.progress++;

          if (target[vm.progress] !== -1)
            return false;

          vm.progress++; //so that it points to user input (often irrelevant)

          vm.a = target[vm.progress];

          vm.progress++;
          vm.sinceProgress = 0;

          break;
        case 'v':
          if (vm.progress < target.length)
            return false;

          return true;
          break;
      }
    vm.done = true;

    vmc = getmem(vm.c); //coz maybe we've jumped
    if (vmc === false) return false;

    if (vmc < 33 || vmc > 126)
      return false;

    vm.mem[vm.c] = mb.xlat2.charCodeAt(vmc - 33);
    if (vm.c == 59048) vm.c = 0;
    else vm.c++;
    if (vm.d == 59048) vm.d = 0;
    else vm.d++;

    vm.done = false;
  }
  return false;
}

function push() {
  vmstack.push(clone(vm));
  vm = vmstack[vmstack.length - 1];
}

function pop() {
  vmstack.pop();
  vm = vmstack[vmstack.length - 1];
}

function dumpStack() {
  var ret = [],
    t;
  for (t = 0; t < vmstack.length - 1; t++) {
    ret.push(vmstack[t].curCode);
  }
  ret.push(bestWin);
  return ret;
}

function generate(t, maxLength, depth, callback, initial, randomPool) {
  it = 0;
  vmstack = [];
  vm = {
    a: 0,
    c: 0,
    d: 0,
    mem: [],
    str: [],
    curPos: 0,
    curCode: -1,
    highestAddress: 0,
    progress: 0,
    sinceProgress: 1,
    done: false
  };
  vmstack.push(vm);
  bestWin = maxLength;
  maxdepth = depth;
  target = gc.parseTargetString(t);
  if (initial) {
    firstQueue = initial;
    bestWin = firstQueue.pop();
  }
  useQueue = !!initial;
  pool = gc.parseRandomPool(randomPool);

  if (useQueue) {
    vm.curCode = firstQueue.shift() - 1;
    useQueue = firstQueue.length;
  } else
    vm.curCode = -1;

  while (vmstack.length) {
    it++;
    if (vm.highestAddress >= bestWin) {
      pop();
      continue;
    }

    vm.curCode++;

    if (vm.curCode >= 8) {
      pop();
      continue;
    }

    vm.mem[vm.curPos] = vm.str[vm.curPos] = mb.encodeInt(opcodes[vm.curCode], vm.curPos);

    vmstack.push(clone(vm));
    vm = vmstack[vmstack.length - 1];

    if ((it % 50000) == 0) {
      var msg = {
        stack: dumpStack()
      };
      msg.progress = gc.progressForStack(msg.stack);
      callback(msg);
    }
    ret = exec();

    if (ret) {
      bestWin = vm.highestAddress;
      callback({
        result: genStr()
      });
    }

    pop(); //remove it's working branch
  }
  callback({
    final: true
  });
}

module.exports = generate;
},{"./common":1,"malbolge-vm":2}],"gen-fixed":[function(require,module,exports){
var mb = require('malbolge-vm'),
  gc = require('./common');
var opcodes = [mb.opc.out, mb.opc.movd, mb.opc.jump, mb.opc.rot, mb.opc.opr, mb.opc.in, mb.opc.halt, mb.opc.nop];
var vm, vmstack, target, maxdepth, it, impl = [],
  cutoff, firstQueue = [],
  useQueue = false,
  pool;

function genStr() {
  var t, str = '';
  for (t = 0; t <= highestAddress; t++) {
    if (vm.str[t] !== undefined)
      str += String.fromCharCode(vm.str[t]);
    else
      str += mb.encode(pool.shift() || mb.opcodes[Math.random() * mb.opcodes.length | 0], t);
  }
  return str;
}

function cloneMem(mem) {
  return mem.slice();
}

function clone(vm) //using JSON here is.... try it :)
  {
    return {
      a: vm.a,
      c: vm.c,
      d: vm.d,
      mem: cloneMem(vm.mem),
      str: cloneMem(vm.str),
      curPos: vm.curPos,
      curCode: vm.curCode,
      progress: vm.progress,
      sinceProgress: vm.sinceProgress,
      done: vm.done
    };
  }

function getmem(addr, allow_implicit) {
  if (vm.mem[addr] !== undefined) {
    return vm.mem[addr];
  } else {
    if (vm.sinceProgress == maxdepth)
      return false;

    if (allow_implicit && addr > highestAddress && addr < cutoff) {
      vm.mem[addr] = impl[((addr - highestAddress - 1) % 6) + 2];
      vm.sinceProgress++;

      return vm.mem[addr]; //-2 there
    } else if (addr > highestAddress) {
      return false;
    }

    vm.curPos = addr;

    if (useQueue) {
      vm.curCode = firstQueue.shift();
      useQueue = firstQueue.length;
    } else
      vm.curCode = 0;

    vm.str[addr] = vm.mem[addr] = mb.encodeInt(opcodes[vm.curCode], addr);
    vm.sinceProgress++;

    vmstack.push(clone(vm));
    vm = vmstack[vmstack.length - 1];

    return vm.mem[addr];
  }
}

function exec() {
  var vmc, vmd;
  while (true) {
    vmc = getmem(vm.c); //do vmd
    if (vmc === false) return false;

    if (vmc < 33 || vmc > 126)
      return false;

    if (!vm.done)
      switch (mb.xlat1[(vmc - 33 + vm.c) % 94]) {
        case 'j':
        case 'i':
        case '*':
        case 'p':
          vmd = getmem(vm.d, true);
          if (vmd === false) return false;

          break;
      }

    if (!vm.done)
      switch (mb.xlat1[(vmc - 33 + vm.c) % 94]) {
        case 'j':
          vm.d = vmd;
          break;
        case 'i':
          vm.c = vmd;
          break;
        case '*':
          if (target[vm.progress] === -3) //we can't lose a - we have to store it somewhere
            return false;

          if (target[vm.progress] === -2) //we want to get rid of user input - avoid storing it!
          {
            vm.progress++;
            vm.sinceProgress = 0;
          }
          vm.a = vm.mem[vm.d] = (vmd / 3 | 0) + vmd % 3 * 19683;

          break;
        case 'p':

          if (target[vm.progress] === -2) //we can't store|output user input now!
            return false;

          if (target[vm.progress] === -3) //we need to store user input before we can proceed
          {
            vm.progress++;
            vm.sinceProgress = 0;
          }

          vm.a = vm.mem[vm.d] = mb.op(vm.a, vmd);

          break;
        case '<':

          if ((vm.a % 256) !== target[vm.progress])
            return false;

          vm.progress++;
          vm.sinceProgress = 0;

          break;
        case '/':

          if (target[vm.progress] === -2 && target[vm.progress + 1] === -1)
            vm.progress++;

          if (target[vm.progress] !== -1)
            return false;

          vm.progress++; //so that it points to user input (often irrelevant)

          vm.a = target[vm.progress];

          vm.progress++;
          vm.sinceProgress = 0;

          break;
        case 'v':
          if (vm.progress < target.length)
            return false;

          return true;
          break;
      }
    vm.done = true;

    vmc = getmem(vm.c); //coz maybe we've jumped
    if (vmc === false) return false;

    if (vmc < 33 || vmc > 126)
      return false;

    vm.mem[vm.c] = mb.xlat2.charCodeAt(vmc - 33);
    if (vm.c == 59048) vm.c = 0;
    else vm.c++;
    if (vm.d == 59048) vm.d = 0;
    else vm.d++;

    vm.done = false;
  }
  return false;
}

function push() {
  vmstack.push(clone(vm));
  vm = vmstack[vmstack.length - 1];
}

function pop() {
  vmstack.pop();
  vm = vmstack[vmstack.length - 1];
}

function dumpStack() {
  var ret = [],
    t;
  for (t = 0; t < vmstack.length - 1; t++) {
    ret.push(vmstack[t].curCode);
  }
  return ret;
}

function generate(t, length, depth, callback, initial, maxAddress, randomPool) {
  it = 0;
  vmstack = [];
  vm = {
    a: 0,
    c: 0,
    d: 0,
    mem: [],
    str: [],
    curPos: 0,
    curCode: -1,
    progress: 0,
    sinceProgress: 0,
    done: false
  };
  vmstack.push(vm);
  highestAddress = length - 1;
  maxdepth = depth;
  target = gc.parseTargetString(t);
  cutoff = maxAddress ? maxAddress : 60000;
  if (initial)
    firstQueue = initial;
  useQueue = !!initial;
  pool = gc.parseRandomPool(randomPool);

  vm.curPos = highestAddress - 1;

  if (useQueue) {
    vm.curCode = firstQueue.shift() - 1;
    useQueue = firstQueue.length;
  } else
    vm.curCode = -1;

  vm.str[vm.curPos] = -1;
  vm.mem[vm.curPos] = -1;

  while (vmstack.length) {
    it++;

    if (vm.curCode == 7) {
      pop();
      continue;
    } else if (vm.curPos <= highestAddress)
      vm.curCode++;
    else if (vm.curCode == -1) //this is fixed gen, so no :)
    {
      pop();
      continue;
    }


    vm.mem[vm.curPos] = vm.str[vm.curPos] = mb.encodeInt(opcodes[vm.curCode], vm.curPos);

    if (vm.curPos === highestAddress) {
      impl[0] = vm.str[highestAddress - 1];
      impl[1] = vm.str[highestAddress];
      for (var t = 0; t < 6; t++) {
        impl[t + 2] = mb.op(impl[t + 1], impl[t]);
      }
    }

    vmstack.push(clone(vm));
    vm = vmstack[vmstack.length - 1];

    if (vm.curPos === highestAddress - 1) {
      vm.curPos = highestAddress;

      if (useQueue) {
        vm.curCode = firstQueue.shift() - 1;
        useQueue = firstQueue.length;
      } else
        vm.curCode = -1;

      vm.str[vm.curPos] = -1;
      vm.mem[vm.curPos] = -1;
      continue;
    }

    if ((it % 50000) == 0) {
      var msg = {
        stack: dumpStack()
      };
      msg.progress = gc.progressForStack(msg.stack);
      callback(msg);
    }

    ret = exec();

    if (ret) {
      callback({
        result: genStr(),
        final: true
      });
      return;
    }

    pop(); //remove it's working branch
  }
  callback({
    final: true
  });
}

module.exports = generate;
},{"./common":1,"malbolge-vm":2}],"gen-linear":[function(require,module,exports){
var mb = require('malbolge-vm'),
  gc = require('./common');
var toseed = [mb.opc.nop, mb.opc.rot, mb.opc.opr];
var toseed_norot = [mb.opc.nop, mb.opc.opr];

/*
MVM is for static generator so that we don't have to store the full memory
*/
function generateBoilerplatte(pool) {
  var mvm = {
    mem: 0,
    str: '',
    a: 0
  };

  mvm.str += mb.encode(mb.opc.nop, mvm.str.length);
  mvm.str += mb.encode(mb.opc.movd, mvm.str.length);
  mvm.str += mb.encode(mb.opc.jump, mvm.str.length);

  for (var t = 0; t < 37; t++)
    mvm.str += mb.encode(pool.shift() || mb.opcodes[Math.random() * mb.opcodes.length | 0], mvm.str.length); //this doesn't matter

  mvm.str += mb.encode(mb.opc.halt, mvm.str.length); //never actually executed

  mvm.str += mb.encode(pool.shift() || mb.opcodes[Math.random() * mb.opcodes.length | 0], mvm.str.length); //this doesn't matter

  mvm.mem = mb.xlat2.charCodeAt(mvm.str[mvm.str.length - 1].charCodeAt(0) - 33);

  return mvm;
}

function perform_op_mvm(mvm, op, input) {
  var l = mvm.str.length,
    t = (op - (l) % 94 + 94) % 94;
  if (t < 33)
    t += 94;

  mvm.str += String.fromCharCode(t);

  if (op == mb.opc.rot) {
    mvm.a = mb.rot(mvm.mem);
  } else if (op == mb.opc.opr) {
    mvm.a = mb.op(mvm.a, mvm.mem);
  } else if (op == mb.opc.in) {
    mvm.a = input;
  }
  mvm.mem = mb.xlat2.charCodeAt(t - 33);
}

function cloneMVM(mvm) {
  return {
    a: mvm.a,
    mem: mvm.mem,
    str: mvm.str
  };
}

//this generates out and halt
/*
we should use the common version

also... when \s we should not use the rot function..
so update to [] version
*/
function generateStaticText(target, callback, randomPool) {
  //micro vm - without memory

  var gmvm = generateBoilerplatte(randomPool),
    mvm = gmvm;
  var g, window = [],
    t, tt, norot = false;

  target = gc.parseTargetString(target);

  //go search
  for (g = 0; g < target.length; g++) {
    callback({
      progress: g / target.length
    });
    if (target[g] == -1) {
      perform_op_mvm(mvm, mb.opc.in, target[++g]);
      gmvm = mvm;
      continue;
    } else if (target[g] == -2) {
      perform_op_mvm(mvm, mb.opc.rot);
      gmvm = mvm;
      continue;
    } else if (target[g] == -3) {
      norot = true;
      continue;
    }
    ww: while (true) {
      window.length = 0;
      while (true) {
        mvm = cloneMVM(gmvm);

        nextWin(window, norot ? 2 : 3);
        if (window.length == 14) {
          for (t = 0; t < 13; t++)
            perform_op_mvm(mvm, mb.opc.nop);
          gmvm = mvm;
          continue ww;
        }

        for (tt = 0; tt < window.length; tt++) {
          if ((mvm.a % 256) != target[g])
            perform_op_mvm(mvm, (norot ? toseed_norot : toseed)[window[tt]]);

          if ((mvm.a % 256) == target[g]) {
            perform_op_mvm(mvm, mb.opc.out);
            gmvm = mvm;
            norot = false;

            break ww;
          }
        }
      }
    }
  }
  if (target.length)
    callback({
      progress: g / target.length
    });
  perform_op_mvm(mvm, mb.opc.halt);
  return mvm.str;
}

function nextWin(win, prop) {
  var ptr = 0;
  while (true) {
    if (win.length == ptr) {
      win[ptr] = 1;
      break;
    }

    win[ptr]++;
    if (win[ptr] == prop) {
      win[ptr] = 0;
      ptr++;
    } else break;
  }
}

//works per character, doesn't output, doesn't halt
//but does treat a%256....
function generateDynamic(ovm, tc, norot) //this must append and not access the memory after c
  {
    if (ovm.d >= ovm.c) throw 'd must be smaller than c';
    if ((ovm.a % 256) == tc) return '';

    var gvm = {
      a: ovm.a,
      c: ovm.c,
      d: ovm.d,
      mem: ovm.mem.slice(0, ovm.c)
    };
    var window = [],
      gstr = '',
      str = '',
      vm;
    var t, tt;

    ww: while (true) {
      window.length = 0;
      while (true) {
        vm = mb.clone(gvm);
        str = gstr;

        nextWin(window, norot ? 2 : 3);
        if ((vm.mem[vm.d] > vm.d && vm.mem[vm.d] < vm.c)) //advance the pointer - faster generation, untested
        {
          str += mb.appendAndPerform(vm, mb.opc.movd);
          gvm = vm;
          gstr = str;
          continue ww;
        }
        if (window.length == 14) //insert nops if we can't advance the pointer
        {
          for (t = 0; t < 13; t++)
            str += mb.appendAndPerform(vm, mb.opc.nop);
          gvm = vm;
          gstr = str;
          continue ww;
        }

        for (tt = 0; tt < window.length; tt++) {
          if ((vm.a % 256) != tc)
            str += mb.appendAndPerform(vm, (norot ? toseed_norot : toseed)[window[tt]]);

          if ((vm.a % 256) == tc) {
            ovm.a = vm.a;
            ovm.c = vm.c;
            ovm.d = vm.d;
            ovm.mem = vm.mem;
            return str;
          }
        }
      }
    }
  }

function generateDynamicString(vm, target, callback) {
  var str = '',
    t, norot = false;
  if (!target) return '';

  target = gc.parseTargetString(target);
  for (t = 0; t < target.length; t++) {
    callback({
      progress: t / target.length
    });
    if (target[t] == -1)
      str += mb.appendAndPerform(vm, mb.opc.in, target[++t]);
    else if (target[t] == -2)
      str += mb.appendAndPerform(vm, mb.opc.rot);
    else if (target[t] == -3)
      norot = true;
    else {
      str += generateDynamic(vm, target[t], norot);
      str += mb.appendAndPerform(vm, mb.opc.out);
      norot = false;
    }
  }
  callback({
    progress: t / target.length
  });
  return str;
}

//so that our code can start with whatever you want (well, not really...)
function buildPrefix(mcode, canJump, bestWithoutJump, randomPool) {
  var tvm, lnow = 0,
    t, op, code = '',
    ok = false;
  var accessed = [];

  for (t = 0; t < mcode.length; t++)
    code += mcode[t] == ' ' ? mb.encode(mb.opc.nop, code.length) : mcode[t];
  for (t = code.length; t < 59049; t++)
    code += mb.encode(mb.opc.nop, code.length);

  tvm = mb.load(code, true);
  while (tvm.c < tvm.mem.length && tvm.d < tvm.mem.length && mb.decodeNext(tvm) != '<' && mb.decodeNext(tvm) != '/' && mb.decodeNext(tvm) != 'v') {
    accessed[tvm.c] = 1;

    if (mb.decodeNext(tvm) != 'o')
      accessed[tvm.d] = 1;

    if (mb.decodeNext(tvm) == 'i')
      accessed[tvm.mem[tvm.d]] = 1;

    try {
      mb.step(tvm);
    } catch (e) {
      lnow = -1;
      break;
    }
    if (tvm.d < tvm.c) {
      ok = true;
      break;
    } else if ((tvm.c >= mcode.length) && !accessed[tvm.c] && tvm.mem[tvm.d] < tvm.d && tvm.mem[tvm.d] < tvm.c) {
      tvm.mem[tvm.c] = mb.encode(mb.opc.movd, tvm.c).charCodeAt(0);
      code = code.substr(0, tvm.c) + String.fromCharCode(tvm.mem[tvm.c]) + code.substr(tvm.c + 1);
    } else if (canJump && (tvm.c >= mcode.length) && !accessed[tvm.c] && tvm.mem[tvm.d] > tvm.d && tvm.mem[tvm.mem[tvm.d]] >= 33 && tvm.mem[tvm.mem[tvm.d]] <= 126 && Math.max(lnow, tvm.mem[tvm.d] + 1, tvm.d) < bestWithoutJump) {
      tvm.mem[tvm.c] = mb.encode(mb.opc.jump, tvm.c).charCodeAt(0);
      code = code.substr(0, tvm.c) + String.fromCharCode(tvm.mem[tvm.c]) + code.substr(tvm.c + 1);
    }
  }
  //now fill lnow
  if (lnow != -1) {
    lnow = accessed.length;
  } else lnow = 0;

  while (tvm.c < lnow) {
    accessed[tvm.c++] = 1;
  }

  if (!canJump) {
    var hiscode = buildPrefix(mcode, true, lnow ? lnow : Infinity, randomPool);
    if (!lnow || (hiscode.length <= lnow) && hiscode)
      return hiscode;
    return false;
  }

  if (!lnow) return false;
  if (!ok) return false;

  code = code.substr(0, lnow);

  var ncode = '';

  var pool = randomPool.slice(0);
  for (t = 0; t < lnow; t++) {
    if (t >= mcode.length || mcode[t] == ' ')
      ncode += accessed[t] ? code[t] : mb.encode(pool.shift() || mb.opcodes[Math.random() * mb.opcodes.length | 0], t);
    else ncode += code[t];
  }
  return ncode;
}

function generate(target, prefix, callback, randomPool, prefix_normalized) {
  var code;
  randomPool = gc.parseRandomPool(randomPool);

  if (prefix) {
    code = buildPrefix(prefix_normalized ? mb.assemble(prefix) : prefix, null, null, randomPool);
    if (!code) {
      return callback({
        error: 'Failed to build custom prefix, try longer prefix.'
      });
    }

    var vm = mb.load(code, true);
    mb.exec(vm);

    code += generateDynamicString(vm, target, callback);
    code += mb.appendAndPerform(vm, mb.opc.halt);

    callback({
      result: code,
      final: true
    });
  } else {
    code = generateStaticText(target, callback, randomPool);
    callback({
      result: code,
      final: true
    });
  }
}

module.exports = generate;
},{"./common":1,"malbolge-vm":2}]},{},[]);
