self.onmessage = function(evt) {
  var buf = evt.data.foobar;
  var fa = new Float32Array(buf);
  fa[evt.data.idx]++;
  self.webkitPostMessage({response: buf, idx: evt.data.idx}, [buf]);
};
