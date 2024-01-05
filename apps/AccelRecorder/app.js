var fileNumber = 0;
var MAXLOGS = 9;
var logRawData = false;
var recording = false;
var recordingInterval;
var recordingWidget;
var start = getTime();
var sampleCount = 0;
var accumulatedAccel = { x: 0, y: 0, z: 0, mag: 0 };
var settings = require("Storage").readJSON("AccelRecorder.json",1)||{}
var accumulatedSteps = 0;
var accumulatedHeartRate = 0;
Bangle.setHRMPower(1);
Bangle.loadWidgets();
Bangle.drawWidgets();

function createRecordingWidget() {
  recordingWidget = {
    width: 12,
    draw: function() {
      g.reset();
      g.drawImage(recording ? require("heatshrink").decompress(atob("i0WwH+H4fz4A/AiD/AjD/AiH+AiH+AjD/AjD/AjD/AiD/")) : require("heatshrink").decompress(atob("i0WwH+H4fz4A/AiD/AjD/AiH+AiH+AjD/AjD/AjD/AiD/")), this.x, this.y);
    }
  };
  WIDGETS["recording"] = recordingWidget;
}

// Declare accelHandler in the global scope
function accelHandler(accel) {
  if (recording) {
    sampleCount++;
    accumulatedAccel.x += accel.x;
    accumulatedAccel.y += accel.y;
    accumulatedAccel.z += accel.z;
    accumulatedAccel.mag += accel.mag;

  }
}

function getFileName(n) {
  return "accellog." + n + ".csv";
}

function showMenu() {
  var menu = {
    "": { title: "Accel Logger" },
    "< Back": () => {load();},
    "File No": {
      value: fileNumber,
      min: 0,
      max: MAXLOGS,
      onchange: v => { fileNumber = v; }
    },
    "Start": function() {
      startRecord();
      E.showMessage("Recording..");
      showMenu(menu)
    },
    "View Logs": function() {
      viewLogs();
    },
    "Log raw data": {
      value: !!logRawData,
      onchange: v => { logRawData = v; }
    },
    "Stop": function() {
      stopRecord();
    },
  };
  E.showMenu(menu);
}

function stopRecord() {
  recording = false;
  Bangle.removeListener('accel', accelHandler);
  E.showMessage("stopping...");
  showMenu();
  if (recordingWidget) {
    delete WIDGETS["recording"];
    recordingWidget = undefined;
  }
}

function viewLog(n) {
  E.showMessage("Loading...");
  var f = require("Storage").open(getFileName(n), "r");
  var records = 0, l = "", ll = "";
  while ((l = f.readLine()) !== undefined) { records++; ll = l; }
  var length = 0;
  if (ll) length = Math.round((ll.split(",")[0] | 0) / 1000);

  var menu = {
    "": { title: "Log " + n },
    "< Back": () => { viewLogs(); },
    "Back to Menu": () => { showMenu(); },
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

function viewLogs() {
  var menu = {
    "": { title: "Logs" },
    "< Back": () => { showMenu(); }
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
  if (!hadLogs)
    menu["No Logs Found"] = function() {};
  E.showMenu(menu);
}
function onHRM(hrm) {
  accumulatedHeartRate = hrm.bpm;
}
function startRecord(force) {
  createRecordingWidget()
  if (recording && !force) return;
  var f = require("Storage").open(getFileName(fileNumber), "w");
  f.write("Date,Time,X,Y,Z,Total,Heartrate\n");

  accelHandler();

  Bangle.setPollInterval(1000);
  Bangle.on('accel', accelHandler);
  recording = true;

  recordingInterval = setInterval(() => {
    if (recording) {
      var t = getTime() - start;

      // Get the current date and time
      var now = new Date();
      var dateString = now.toISOString().slice(0, 10);
      var timeString = now.toISOString().slice(11, 19);

      // Calculate average accelerometer data
      if (sampleCount > 0) {
        var avgAccel = {
          x: accumulatedAccel.x / sampleCount,
          y: accumulatedAccel.y / sampleCount,
          z: accumulatedAccel.z / sampleCount,
          mag: accumulatedAccel.mag / sampleCount,
        };
        var steps = Bangle.getHealthStatus("day").steps;
       //var steps_avg = accumulatedSteps / sampleCount;

        // Write average accelerometer data to file with timestamp
        if (logRawData) {
          f.write([
            dateString,
            timeString,
            avgAccel.x * 8192,
            avgAccel.y * 8192,
            avgAccel.z * 8192,
            avgAccel.mag * 8192,
          ].map(n => Math.round(n)).join(",") + "\n");
        } else {
          f.write([
            dateString,
            timeString,
            avgAccel.x,
            avgAccel.y,
            avgAccel.z,
            avgAccel.mag,
            accumulatedHeartRate,
            //steps,
          ].join(",") + "\n");
        }

        // Reset accumulated values and sample count
        accumulatedAccel = { x: 0, y: 0, z: 0, mag: 0 };
        sampleCount = 0;
        // Reset accumulated steps count and heart rate
        accumulatedSteps = 0;
        accumulatedHeartRate = 0;
      }
    }
  }, 60000); // Save data every 1 minute
}

showMenu();
// Add HRM event listener
Bangle.on('HRM', onHRM);
