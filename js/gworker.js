importScripts('generators.js');
var genLinear = require('gen-linear'),
  genFixed = require('gen-fixed'),
  genBOR = require('gen-bor');
var request;

function relay(msg) {
  postMessage(msg);
}
onmessage = function(e) {
  request = e.data;

  try {
    if (request.type == 0)
      genLinear(request.target, request.prefix, relay, request.randomPool);
    else if (request.type == 1)
      genBOR(request.target, request.length, request.depth, relay, request.stack, request.randomPool);
    else
      genFixed(request.target, request.length, request.depth, relay, request.stack, request.cutoff, request.randomPool);
  } catch (e) {
    relay({
      error: e
    });
  }
}