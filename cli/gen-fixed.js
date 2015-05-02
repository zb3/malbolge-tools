var common = require('./common');
var gen = require('../lib/gen-fixed.js');
var fs = require('fs');

var args = common.getArgs();

if ('-help' in args) printHelp();
if (args._.length < 3) {
  process.stderr.write('Not enough arguments.\n');
  printHelp();
}
common.onReadStdin(main);

function printHelp() {
  console.log('Usage: gen-fixed [options] depth maxlength output_file');
  console.log('Pipe target to STDIN.\n');
  console.log('Target special characters:');
  console.log(' \\p char - prompt, assume user inputs char');
  console.log(' \\x - erase user input');
  console.log(' \\s - don\'t erase user input till next output');
  console.log(' \\\\ - \\\n');
  console.log('Options:');
  console.log(' -m address 		Max memory address allowed');
  console.log(' -s stack 		Initial stack value in JSON array format.');
  console.log(' -pool pool		Normalized instructions to use for non-accessed parts');
  process.exit();
}

function reply(data) {
  if (data.error)
    common.die('Error: ' + data.error);

  if (data.result) {
    var f;
    try {
      fs.writeFileSync(args._[2], data.result);
    } catch (e) {
      common.die('Error: Could not write file.');
    }
    console.log('Generation complete.');
    return;
  }
  if (data.stack && !(reply.stacks++ % 4)) {
    console.log('About ' + (parseFloat(data.progress * 100).toFixed(1)) + '% branches searched so far.');
    console.log('Current stack: ' + JSON.stringify(data.stack));
  }
  if (data.final) {
    console.log('Generation complete, no results found.');
  }
}
reply.stacks = 0;

function main(target) {
  console.log('Starting generator...');
  gen(target, parseInt(args._[1]), parseInt(args._[0]), reply, args['s'] ? JSON.parse(args['s']) : null, args['m'] ? parseInt(args['m']) : null, args['pool']);
}