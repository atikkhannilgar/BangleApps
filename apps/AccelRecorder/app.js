var fileNumber = 0;
var MAXLOGS = 9;
var logRawData = false;
var recording = false;
var recordingInterval;
var recordingWidget;

function createRecordingWidget() {
  recordingWidget = {
    width: 12,
    draw: function() {
      g.reset();
      g.drawImage(
        recording
          ? require("heatshrink").decompress(atob("i0WwH+H4fz4A/AiD/AjD/AiH+AiH+AjD/AjD/AjD/AiD/"))
          : require("heatshrink").decompress(atob("i0WwH+H4fz4A/AiD/AjD/AiH+AiH+AjD/AjD/AjD/AiD/")),
        this.x,
        this.y
      );
    }
  };
  WIDGETS["recording"] = recordingWidget;
}

function accelHandler(accel) {
  if (recording) {
    var t = getTime() - start;

    // Write accelerometer data to file
    if (logRawData) {
      f.write([
        t * 1000,
        accel.x * 8192,
        accel.y * 8192,
        accel.z * 8192,
        accel.mag * 8192
      ]
        .map(n => Math.round(n))
        .join(",") + "\n");
    } else {
      f.write([
        Math.round(t * 1000),
        accel.x,
        accel.y,
        accel.z,
        accel.mag
      ].join(",") + "\n");
    }

    sampleCount++;
  }
}

function startRecord(force) {
  createRecordingWidget();
  if (recording && !force) return;

  var start = getTime();
  var sampleCount = 0;
  var f = require("Storage").open(getFileName(fileNumber), "a");

  Bangle.setPollInterval(1000);
  Bangle.on('accel', accelHandler);
  recording = true;

  recordingInterval = setInterval(() => {
    // Do nothing, just keep the recording going
  }, 1000);
}

function toggleRecord() {
  if (recording) {
    stopRecord();
  } else {
    startRecord();
    E.showMessage("starting...");
    showMenu();
  }
}

function showMenu() {
  var menu = {
    "": { title: "Accel Logger" },
    "< Back": () => Bangle.showLauncher(),
    "File No": {
      value: fileNumber,
      min: 0,
      max: MAXLOGS,
      onchange: v => {
        fileNumber = v;
      }
    },
    "Start": function() {
      toggleRecord();
    },
    "View Logs": function() {
      viewLogs();
    },
    "Log raw data": {
      value: !!logRawData,
      onchange: v => {
        logRawData = v;
      }
    },
    "Stop": function() {
      stopRecord();
    }
  };
  E.showMenu(menu);
}

function stopRecord() {
  recording = false;
  Bangle.removeListener('accel', accelHandler);
  clearInterval(recordingInterval);
  E.showMessage("stopping...");
  showMenu();
  if (recordingWidget) {
    delete WIDGETS["recording"];
    recordingWidget = undefined;
  }
}

function viewLogs() {
  var menu = {
    "": { title: "Logs" },
    "< Back": () => {
      showMenu();
    }
  };

  var hadLogs = false;
  for (var i = 0; i <= MAXLOGS; i++) {
    var f = require("Storage").open(getFileName(i), "r");
    if (f.readLine() !== undefined) {
      (function(i) {
        menu["Log " + i] = () => viewLog(i);
      })(i);
      hadLogs = true;
    }
  }
  if (!hadLogs) menu["No Logs Found"] = function() {};
  E.showMenu(menu);
}

function viewLog(n) {
  E.showMessage("Loading...");
  var f = require("Storage").open(getFileName(n), "r");
  var records = 0,
    l = "",
    ll = "";
  while ((l = f.readLine()) !== undefined) {
    records++;
    ll = l;
  }
  var length = 0;
  if (ll) length = Math.round((ll.split(",")[0] | 0) / 1000);

  var menu = {
    "": { title: "Log " + n },
    "< Back": () => {
      viewLogs();
    },
    "Back to Menu": () => {
      showMenu();
    }
  };
  menu[records + " Records"] = "";
  menu[length + " Seconds"] = "";
  menu["DELETE"] = function() {
    E.showPrompt("Delete Log " + n).then(ok => {
      if (ok) {
        E.showMessage("Erasing...");
        var f = require("Storage").open(getFileName(n), "r");
        f.erase();
        viewLogs();
      } else viewLog(n);
    });
  };

  E.showMenu(menu);
}

function getFileName(n) {
  return "accellog." + n + ".csv";
}

Bangle.loadWidgets();
Bangle.drawWidgets();
showMenu();
