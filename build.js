var browserify = require('browserify');
var fs = require('fs-extra');

fs.removeSync('./dist/samples');
fs.mkdirsSync('./dist/samples');
fs.copySync('./samples', './dist/samples');

var pipesPending = 0;

pipesPending++;
var t1 = browserify()
 .require('malbolge-vm', {expose: 'malbolge-vm'})
 .bundle();
t1.on('end', function(){
  console.log('[+] Done building vm.js');
  checkFinished();
});
t1.pipe(fs.createWriteStream('./dist/js/vm.js'));

pipesPending++;
var t2 = browserify()
 .require('./lib/gen-linear.js', {expose: 'gen-linear'})
 .require('./lib/gen-bor.js', {expose: 'gen-bor'})
 .require('./lib/gen-fixed.js', {expose: 'gen-fixed'})
 .bundle();
t2.on('end', function(){
  console.log('[+] Done building generators.js');
  checkFinished();
});
t2.pipe(fs.createWriteStream('./dist/js/generators.js'));


function checkFinished() {
 if (--pipesPending) return;

 console.log('Build finished.');
}
