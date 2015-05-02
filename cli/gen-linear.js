var common = require('./common');
var gen = require('../lib/gen-linear.js');
var fs = require('fs');

var args = common.getArgs();

if ('-help' in args) printHelp();
if (!args._.length) {
  process.stderr.write('No output file specified\n');
  printHelp();
}
common.onReadStdin(main);

function printHelp() {
  console.log('Usage: gen-linear [options] output_file');
  console.log('Pipe target to STDIN.\n');
  console.log('Target special characters:');
  console.log(' \\p char - prompt, assume user inputs char');
  console.log(' \\x - erase user input');
  console.log(' \\s - don\'t erase user input till next output');
  console.log(' \\\\ - \\\n');
  console.log('Options:');
  console.log(' -p prefix		Prefix to use');
  console.log(' -np prefix		Normalized prefix to use');
  console.log(' -pool pool		Normalized instructions to use for non-accessed parts');
  process.exit();
}

function reply(data) {
  if (data.error)
    common.die('Error: ' + data.error);

  if (data.result) {
    process.stdout.write('\r                                          \r');

    var f;
    try {
      fs.writeFileSync(args._[0], data.result);
    } catch (e) {
      common.die('Error: Could not write file.');
    }
    console.log('Generation complete!');
  } else if (data.progress)
    process.stdout.write('\rGenerating... ' + (parseFloat(data.progress * 100).toFixed(1)) + '%');
}

function main(target) {
  console.log('Starting generator...');
  gen(target, args['np'] ? args['np'] : args['p'], reply, args['pool'], !!args['np']);
}