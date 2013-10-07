var log = function(msg) {
  var p = document.createElement('p');
  p.textContent = msg;
  document.body.appendChild(p);
};
var worker = new Worker('worker.js');
var buf = new ArrayBuffer(200000000); // 200 MB = 50 million float32s
worker.onmessage = function(evt) {
  var buf = evt.data.response;
  if (evt.data.idx == 999) {
    var fa = new Float32Array(buf);
    var sum = 0;
    for (var i=0; i<1000; i++) sum += fa[i];
    log('sum: '+sum);
    log('amount of data passed: '+((evt.data.idx+1)*buf.byteLength / 1e9)+' GB');
  } else {
    // second arg to postMessage is an array of objects to 
    // yield to the receiver
    worker.postMessage({foobar: buf, idx: evt.data.idx+1}, [buf]);
  }
};
// send initial message of 100x pingpong
worker.onmessage({data:{response: buf, idx: -1}});
// you should get sum: 1000 in the console
