
WorkerCommands = {
  average3: function (src, dst) {
    var i,l;
    var f32_src = new Float32Array(src);
    var f32_dst = new Float32Array(dst);
    if (f32_src.length > 1) {
      f32_dst[0] = (f32_src[0] + f32_src[1]) * (1/2);
    }
    for (i=1,l=f32_src.length-1; i<l; i++) {
      f32_dst[i] = (f32_src[i-1] + f32_src[i] + f32_src[i+1]) * (1/3);
    }
    if (f32_src.length > 1) {
      f32_dst[l] = (f32_src[l] + f32_src[l-1]) * (1/2);
    }
    var ret = 'src.len = ' + src.byteLength + ', f32_dst.len = ' + f32_dst.length;
    return ret;
  },

  memcpy: function(src, dst) {
    var f32_src = new Float32Array(src);
    var f32_dst = new Float32Array(dst);
    f32_dst.set(f32_src);
    var ret = 'src.len = ' + src.byteLength + ', f32_dst.len = ' + f32_dst.length;
    return ret;
  },

  noop: function(src, dst) {
    var f32_src = new Float32Array(src);
    var f32_dst = new Float32Array(dst);
    var ret = 'src.len = ' + src.byteLength + ', f32_dst.len = ' + f32_dst.length;
    return ret;
  }

};

self.onmessage = function(event) {
  var data = event.data;
  var cmd = data[0];
  var worker_id = data[1]; // Number
  var src = data[2]; // ArrayBuffer (transfered)
  var dst = data[3]; // ArrayBuffer (transfered)
  var ret = WorkerCommands[cmd].apply(WorkerCommands, data.slice(2));
  webkitPostMessage([worker_id, ret, src, dst], [src, dst]);
};

