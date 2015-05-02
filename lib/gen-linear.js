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