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