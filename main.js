// Slices a big ArrayBuffer contents into smaller ones.
function copyABToSlices(ab, ab_slices) {
  var slice_size = ab.byteLength / ab_slices.length;
  for (i = 0; i < ab_slices.length; ++i) {
    ab_u8 = new Uint8Array(ab, i * slice_size, slice_size);
    ab_slice_u8 = new Uint8Array(ab_slices[i]);
    ab_slice_u8.set(ab_u8);
  }
}

// reduce tree:
// 01 23 45 67
//  \  | |  /
//   C C C C
//   \ / \ /
//    C   C
//     \ /
//      C
function copySlicesToAB(ab, ab_slices) {
  var slice_size = ab.byteLength / ab_slices.length;
  for (i = 0; i < ab_slices.length; ++i) {
    ab_u8 = new Uint8Array(ab, i * slice_size, slice_size);
    ab_slice_u8 = new Uint8Array(ab_slices[i]);
    ab_u8.set(ab_slice_u8);
  }
}

function SetupWorkers(workers, N, worker_script, ackMessage) {
  for (i = 0; i < N; ++i) {
    workers[i] = new Worker(worker_script);
    workers[i].onmessage = ackMessage;
  }
}

function setupCombine(ackMessage) {
  var combiner = new Worker('combine_worker.js');
  combiner.onmessage = ackMessage;
  combiner.postMessage(['init',0], []);
  return combiner;
}

function SetupSlices(slices, N, M) {
  for (i = 0; i < N; ++i) {
    slices[i] = new ArrayBuffer(M);
  }
}

var colors = [];
for (var i=0; i<64; i++) {
  colors[i] = 'hsl('+(i/64*360)+',70%,48%)';
}
var lastColor = '#aaa';

function drawInitialCopyTime(c, run, t, N) {
  var runHeight = N * 2 + 4;
  var ctx = c.getContext('2d');
  var off = runHeight * (run % Math.floor(c.height/runHeight));
  ctx.clearRect(0, off, c.width, runHeight);
  ctx.fillStyle = lastColor;
  ctx.fillRect(0, off, t, 1);
  ctx.fillText(window.singleThreaded ? 'ST' : window.workerCount.toString(), 0, off+10);
}

function drawWorkerTime(c, run, unit, N) {
  var runHeight = N * 2 + 4;
  var ctx = c.getContext('2d');
  var off = runHeight * (run % Math.floor(c.height/runHeight));
  ctx.fillStyle = colors[Math.floor(((64/window.workerCount)*unit.worker_id)%colors.length)];
  ctx.fillRect(unit.startTime, off, 1, unit.id*2+1);
  ctx.fillRect(unit.startTime+unit.runTime, off, 1, unit.id*2+1);
  ctx.fillRect(unit.startTime, off+unit.id*2+1, unit.runTime, 1);
}

function drawEndTime(c, run, t0, t1, N) {
  var runHeight = N * 2 + 4;
  var ctx = c.getContext('2d');
  var off = runHeight * (run % Math.floor(c.height/runHeight));
  ctx.fillStyle = lastColor;
  ctx.fillRect(t0, off, t1-t0, 1);
  ctx.fillText(t1, t1, off+10);
}

function init() {
  var N = 16;
  var M = 1024 * 1024 * 4;
  var newN = N, newM = M;
  var ab_slices = [];
  var ab2_slices = [];
  var jacobi_workers = [];
  var ab = new ArrayBuffer(N * M);
  var ab2 = new ArrayBuffer(N * M);
  var start_time = 0;
  var acked = [];
  var run = 0;
  var paused = true;
  var units = [];
  var ioBytes = 0;
  var startElapsed = 0;

  var ackMessage = function(event) {
    var data = event.data;
    var worker_id = data[0];
    var message = data[1];
    var c = document.getElementById('resultCanvas');
    units[worker_id].runTime = (new Date()-start_time) - units[worker_id].startTime;
    var elapsed = new Date() - start_time;

    ab_slices[worker_id] = data[2];
    ioBytes += data[2].byteLength;
    ab2_slices[worker_id] = data[3];
    ioBytes += data[3].byteLength;

    acked.push(worker_id);
    if (acked.length == N) {
      if (window.combineResults) {
        copySlicesToAB(ab, ab2_slices);
      }
      var allElapsed = new Date() - start_time;
      acked = [];
      var msg = ('I/O '+(ioBytes/(1024*1024))+' MiB, finished in ' + allElapsed + ' ms.');
      var b = document.getElementById('runbutton');
      if (b) b.disabled = false;
      if (window.logToConsole) {
        console.debug(msg);
      } else {
        document.getElementById('result').textContent = msg;
        drawInitialCopyTime(c, run, startElapsed, N);
        for (var i=0; i<units.length; i++) {
          drawWorkerTime(c, run, units[i], N);
        }
        drawEndTime(c, run, elapsed, allElapsed, N);
      }
      units = [];
      run++;
      (window.requestAnimationFrame || window.webkitRequestAnimationFrame)(function() {
        if (!paused) {
          runTest();
        }
      });
    }
  };

  window.needsSetupWork = true;

  window.setupWork = function() {
    N = newN;
    M = newM;
    ab = new ArrayBuffer(N * M);
    ab2 = new ArrayBuffer(N * M);
    ab_slices = [];
    ab2_slices = [];
    SetupSlices(ab_slices, N, M);
    SetupSlices(ab2_slices, N, M);
  };

  window.setWorkUnitSize = function(sz) {
    newM = (sz | 0)*1024*1024;
    if (!window.needsSetupWork)
      window.needsSetupWork = (M != newM);
  };

  window.setWorkUnitCount = function(count) {
    newN = count | 0;
    if (!window.needsSetupWork)
      window.needsSetupWork = (N != newN);
  };

  SetupWorkers(jacobi_workers, 64, 'jacobi_worker.js', ackMessage);
  copyABToSlices(ab, ab_slices);
  copyABToSlices(ab2, ab2_slices);

  var updateConfig = function() {
    window.singleThreaded = document.getElementById('singlethreaded').checked;
    window.useTransferables = document.getElementById('usetransferables').checked;
    window.workerCount = document.getElementById('workercount').value | 0;
    window.workerCommand = document.getElementById('workercommand').value;
    window.combineResults = document.getElementById('combineresults').checked;
    window.logToConsole = document.getElementById('logtoconsole').checked;
    window.setWorkUnitCount(document.getElementById('workunitcount').value);
    window.setWorkUnitSize(document.getElementById('workunitsize').value);

    if (window.needsSetupWork) {
      window.setupWork();
      window.needsSetupWork = false;
    }
  };


  window.runTest = function () {
    updateConfig();

    var cmd = window.workerCommand;
    paused = false;
    var b = document.getElementById('runbutton');
    if (b) b.disabled = true;
    start_time = new Date();

    ioBytes = 0;

    if (window.combineResults) {
      copyABToSlices(ab, ab_slices);
    }
    var elapsed = new Date() - start_time;
    startElapsed = elapsed;

    for (i = 0; i < N; ++i) {
      var src = ab_slices[i];
      var dst = ab2_slices[i];
      units[i] = {
        startTime: new Date()-start_time,
        id: i,
        worker_id: i%window.workerCount
      };
      if (window.singleThreaded) {
        ackMessage({data: [i, WorkerCommands[cmd].apply(WorkerCommands, [src, dst]), src, dst]});
      } else if (window.useTransferables) {
        jacobi_workers[i%window.workerCount].postMessage([cmd, i, src, dst, true], [src, dst]);
      } else {
        jacobi_workers[i%window.workerCount].postMessage([cmd, i, src, dst, false]);
      }
      ioBytes += src.byteLength + dst.byteLength;
      if (!window.singleThreaded)
        units[i].messageTime = (new Date()-start_time) - units[i].startTime;
    }
  };
  window.pauseTest = function() {
    paused = true;
  };

};

init();
